"""
IA Conversational Service - FastAPI Bootstrap
Multi-tenant AI conversational service with RAG, LLM integration, and memory management
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.logging import log_error, log_info
from app.core.metrics import MetricsMiddleware
from app.middleware.correlation import CorrelationMiddleware
from app.otel import initialize_otel, instrument_fastapi

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    log_info("IA Conversational service starting up")

    # Initialize OpenTelemetry (feature-flagged)
    otel_status = initialize_otel()
    if otel_status is True:
        instrument_fastapi(app)
        log_info("OpenTelemetry instrumentation enabled")
    elif otel_status is False:
        log_info("OpenTelemetry disabled by configuration")
    else:
        log_error("OpenTelemetry initialization failed")

    # Initialize Kafka manager
    from app.events.kafka import kafka_manager

    try:
        await kafka_manager.start()
        # Start consumer in background task
        if kafka_manager.running:
            import asyncio

            asyncio.create_task(kafka_manager.consume_messages())
    except Exception as e:
        log_error(f"Failed to start Kafka manager: {e}")

    # Log service configuration
    log_info(
        "Service configuration loaded",
        env=os.getenv("ENV", "development"),
        features={
            "database": bool(os.getenv("DATABASE_URL")),
            "redis": bool(os.getenv("REDIS_URL")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "otel": bool(os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")),
            "kafka": bool(os.getenv("ENABLE_KAFKA", "false").lower() == "true"),
        },
    )

    yield

    # Shutdown
    log_info("IA Conversational service shutting down")

    # Stop Kafka manager
    try:
        await kafka_manager.stop()
    except Exception as e:
        log_error(f"Failed to stop Kafka manager: {e}")


# Create FastAPI app
app = FastAPI(
    title="IA Conversational Service",
    description="Multi-tenant AI conversational service with RAG, LLM integration, and memory management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
if not cors_origins or cors_origins == [""]:
    cors_origins = ["*"]  # Allow all in development

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add correlation middleware (must be after CORS)
app.add_middleware(CorrelationMiddleware)

# Add metrics middleware for automatic response time tracking
app.add_middleware(MetricsMiddleware)

# Include API router
app.include_router(api_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    log_info("Root endpoint accessed")

    return {
        "service": "ia-conversational",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }
