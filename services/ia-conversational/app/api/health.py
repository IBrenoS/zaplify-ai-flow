"""
Health check and metrics endpoints
"""

import os
import time
from datetime import datetime

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

# Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest

from app.core.database import supabase_service
from app.core.logging import log_error
from app.core.redis import redis_service
from app.services.nlp_service import nlp_service

# Metrics definitions
messages_processed_total = Counter(
    "messages_processed_total",
    "Total number of messages processed",
    ["tenant_id", "assistant_type"],
)

errors_total = Counter(
    "errors_total", "Total number of errors", ["endpoint", "error_type", "tenant_id"]
)

response_latency_seconds = Histogram(
    "response_latency_seconds",
    "Response latency in seconds",
    ["endpoint", "method", "tenant_id"],
    buckets=(
        0.005,
        0.01,
        0.025,
        0.05,
        0.075,
        0.1,
        0.25,
        0.5,
        0.75,
        1.0,
        2.5,
        5.0,
        7.5,
        10.0,
    ),
)

router = APIRouter()


@router.get("/health/live")
async def liveness_check():
    """Simple liveness check - just confirms service is running"""
    return {"ok": True}


@router.get("/health/ready")
async def readiness_check(request: Request):
    """Readiness check with dependency verification"""
    correlation_id = getattr(request.state, "correlation_id", "unknown")

    # Check dependencies
    deps = {}
    overall_ok = True

    # Check Redis if URL configured
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            redis_ok = redis_service.is_available()
            deps["redis"] = "ok" if redis_ok else "error"
            if not redis_ok:
                overall_ok = False
        except Exception as e:
            deps["redis"] = "error"
            overall_ok = False
            log_error(f"Redis check failed: {e}", correlation_id=correlation_id)
    else:
        deps["redis"] = "unknown"

    # Check Database if URL configured
    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_URL")
    if database_url:
        try:
            db_ok = supabase_service.is_available()
            deps["db"] = "ok" if db_ok else "error"
            if not db_ok:
                overall_ok = False
        except Exception as e:
            deps["db"] = "error"
            overall_ok = False
            log_error(f"Database check failed: {e}", correlation_id=correlation_id)
    else:
        deps["db"] = "unknown"

    # Check NLP service
    try:
        nlp_service.get_status()
        deps["nlp"] = "ok"  # NLP service always works (has fallback)
    except Exception as e:
        deps["nlp"] = "error"
        overall_ok = False
        log_error(f"NLP service check failed: {e}", correlation_id=correlation_id)

    return {"ok": overall_ok, "deps": deps, "mode": "ready"}


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint():
    """Prometheus metrics endpoint"""
    return generate_latest()


@router.get("/health")
async def health_check(request: Request):
    """Health check with service status including Supabase connectivity and NLP models"""

    # Get context from middleware
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    tenant_id = getattr(request.state, "tenant_id", "demo")

    # Check Supabase connection details
    supabase_details = {}
    if supabase_service.is_available():
        supabase_details = {
            "connected": True,
            "pgvector_available": supabase_service.is_pgvector_available(),
            "url_configured": bool(supabase_service.supabase_url),
            "key_configured": bool(supabase_service.supabase_key),
            "service_key_configured": bool(supabase_service.supabase_service_key),
        }
    else:
        supabase_details = {
            "connected": False,
            "reason": "SUPABASE_URL or SUPABASE_KEY not configured or connection failed",
        }

    # Get NLP service status
    nlp_status = nlp_service.get_status()

    # Service status
    status = {
        "service": "ia-conversational",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": time.time(),
        "correlation_id": correlation_id,
        "tenant_id": tenant_id,
        "environment": os.getenv("ENV", "development"),
        "features": {
            "supabase": supabase_service.is_available(),
            "redis": redis_service.is_available(),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "pgvector": supabase_service.is_pgvector_available(),
            "transformers": nlp_status["transformers_enabled"],
            "nlp_models": nlp_status["models_available"],
        },
        "services": {
            "supabase": supabase_details,
            "redis": {
                "available": redis_service.is_available(),
                "fallback_mode": not redis_service.is_available()
                and os.getenv("ENV") == "development",
            },
            "openai": {
                "configured": bool(os.getenv("OPENAI_API_KEY")),
                "model": "gpt-4o",
            },
            "nlp": {
                "status": "available",
                "transformers_enabled": nlp_status["transformers_enabled"],
                "models_available": nlp_status["models_available"],
                "intent_model": nlp_status["intent_model"],
                "sentiment_model": nlp_status["sentiment_model"],
                "models_loaded": nlp_status["models_loaded"],
                "fallback_mode": not nlp_status["models_available"],
            },
        },
    }

    return status
