"""
OpenTelemetry Configuration (Optional)
Initializes OTEL traces only if OTEL_EXPORTER_OTLP_ENDPOINT is set
"""

import os

from app.core.logging import get_logger

logger = get_logger(__name__)


def initialize_otel() -> bool | None:
    """
    Initialize OpenTelemetry instrumentation
    Returns True if initialized, False if disabled, None if error
    """
    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    if not otel_endpoint:
        logger.info("OpenTelemetry disabled - OTEL_EXPORTER_OTLP_ENDPOINT not set")
        return False

    try:
        # Import OTEL dependencies only when needed
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # Set up resource with service information
        resource = Resource(
            attributes={
                "service.name": "ia-conversational",
                "service.version": "1.0.0",
                "service.instance.id": os.getenv("HOSTNAME", "unknown"),
            }
        )

        # Set up tracer provider
        trace.set_tracer_provider(TracerProvider(resource=resource))
        tracer_provider = trace.get_tracer_provider()

        # Set up OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=otel_endpoint,
            headers=_get_otel_headers(),
        )

        # Add span processor
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)

        logger.info(
            "OpenTelemetry initialized successfully",
            extra={"otel_endpoint": otel_endpoint, "service_name": "ia-conversational"},
        )

        return True

    except ImportError as e:
        logger.warning(
            "OpenTelemetry dependencies not installed", extra={"error": str(e)}
        )
        return None

    except Exception as e:
        logger.error(
            "Failed to initialize OpenTelemetry",
            extra={"error": str(e), "otel_endpoint": otel_endpoint},
        )
        return None


def instrument_fastapi(app) -> bool:
    """
    Instrument FastAPI application with OpenTelemetry
    Returns True if instrumented, False if skipped
    """
    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    if not otel_endpoint:
        return False

    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(
            app,
            server_request_hook=_server_request_hook,
            client_request_hook=_client_request_hook,
        )

        logger.info("FastAPI instrumented with OpenTelemetry")
        return True

    except ImportError:
        logger.warning("OpenTelemetry FastAPI instrumentation not available")
        return False

    except Exception as e:
        logger.error("Failed to instrument FastAPI", extra={"error": str(e)})
        return False


def _get_otel_headers() -> dict:
    """Get OTEL headers from environment"""
    headers = {}

    # Add authentication headers if available
    api_key = os.getenv("OTEL_EXPORTER_OTLP_HEADERS")
    if api_key:
        headers.update(dict(h.split("=") for h in api_key.split(",")))

    return headers


def _server_request_hook(span, scope):
    """Hook called when a request is received"""
    if span and scope:
        # Add correlation and tenant information to span
        headers = dict(scope.get("headers", []))

        correlation_id = headers.get(b"x-correlation-id")
        if correlation_id:
            span.set_attribute("correlation.id", correlation_id.decode())

        tenant_id = headers.get(b"x-tenant-id")
        if tenant_id:
            span.set_attribute("tenant.id", tenant_id.decode())


def _client_request_hook(span, scope):
    """Hook called when making an outbound request"""
    if span and scope:
        # Add service information
        span.set_attribute("service.name", "ia-conversational")
