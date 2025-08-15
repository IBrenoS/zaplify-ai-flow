"""
Metrics instrumentation utilities
"""

import time
from contextlib import contextmanager

from app.api.health import (
    errors_total,
    messages_processed_total,
    response_latency_seconds,
)


def increment_messages_processed(tenant_id: str, assistant_type: str = "general"):
    """Increment the messages processed counter"""
    messages_processed_total.labels(
        tenant_id=tenant_id, assistant_type=assistant_type
    ).inc()


def increment_errors(endpoint: str, error_type: str, tenant_id: str = "unknown"):
    """Increment the errors counter"""
    errors_total.labels(
        endpoint=endpoint, error_type=error_type, tenant_id=tenant_id
    ).inc()


@contextmanager
def measure_response_time(endpoint: str, method: str, tenant_id: str = "unknown"):
    """Context manager to measure response time"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        response_latency_seconds.labels(
            endpoint=endpoint, method=method, tenant_id=tenant_id
        ).observe(duration)


class MetricsMiddleware:
    """Middleware to automatically track response times"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()

        # Extract path and method
        path = scope.get("path", "unknown")
        method = scope.get("method", "unknown")

        # Simple endpoint classification
        endpoint = "unknown"
        if path.startswith("/conversation"):
            endpoint = "conversation"
        elif path.startswith("/assistants"):
            endpoint = "assistants"
        elif path.startswith("/rag"):
            endpoint = "rag"
        elif path.startswith("/health"):
            endpoint = "health"
        elif path.startswith("/metrics"):
            endpoint = "metrics"

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Measure response time when response starts
                duration = time.time() - start_time

                # Get tenant_id from headers if available
                tenant_id = "unknown"
                for header_name, header_value in message.get("headers", []):
                    if header_name == b"x-tenant-id":
                        tenant_id = header_value.decode()
                        break

                # Record metrics
                response_latency_seconds.labels(
                    endpoint=endpoint, method=method, tenant_id=tenant_id
                ).observe(duration)

                # Track errors for 4xx/5xx status codes
                status_code = message.get("status", 200)
                if status_code >= 400:
                    error_type = "client_error" if status_code < 500 else "server_error"
                    increment_errors(endpoint, error_type, tenant_id)

            await send(message)

        await self.app(scope, receive, send_wrapper)
