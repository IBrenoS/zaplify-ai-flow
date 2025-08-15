"""
Structured logging helper with standardized fields
Always includes: service, level, message, correlation_id, tenant_id
"""

import json
import logging
import time
from contextvars import ContextVar
from typing import Any

# Context variables for correlation and tenant tracking
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
tenant_id_var: ContextVar[str] = ContextVar("tenant_id", default="")


# Configure JSON formatter
class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": time.time(),
            "service": "ia-conversational",
            "level": record.levelname,
            "message": record.getMessage(),
        }

        # Always try to add correlation_id and tenant_id
        correlation_id = getattr(
            record, "correlation_id", None
        ) or correlation_id_var.get("")
        tenant_id = getattr(record, "tenant_id", None) or tenant_id_var.get("")

        if correlation_id:
            log_entry["correlation_id"] = correlation_id
        if tenant_id:
            log_entry["tenant_id"] = tenant_id

        # Add extra fields from record
        if hasattr(record, "extra") and record.extra:
            log_entry.update(record.extra)

        return json.dumps(log_entry)


def get_logger(name: str) -> logging.Logger:
    """Get a structured logger instance"""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def log_info(event: str, **fields: Any) -> None:
    """
    Helper function to log info with standard fields
    Always includes service, level, message, correlation_id, tenant_id

    Args:
        event: The log message/event description
        **fields: Additional fields to include in the log
    """
    logger = get_logger("ia-conversational")

    # Prepare extra fields with correlation and tenant info
    extra = dict(fields)

    # Get correlation_id and tenant_id from context or extra fields
    correlation_id = extra.pop("correlation_id", correlation_id_var.get(""))
    tenant_id = extra.pop("tenant_id", tenant_id_var.get(""))

    if correlation_id:
        extra["correlation_id"] = correlation_id
    if tenant_id:
        extra["tenant_id"] = tenant_id

    logger.info(event, extra=extra)


def log_error(event: str, **fields: Any) -> None:
    """
    Helper function to log errors with standard fields
    """
    logger = get_logger("ia-conversational")

    extra = dict(fields)
    correlation_id = extra.pop("correlation_id", correlation_id_var.get(""))
    tenant_id = extra.pop("tenant_id", tenant_id_var.get(""))

    if correlation_id:
        extra["correlation_id"] = correlation_id
    if tenant_id:
        extra["tenant_id"] = tenant_id

    logger.error(event, extra=extra)


def set_correlation_context(correlation_id: str, tenant_id: str) -> None:
    """Set correlation and tenant context for current async task"""
    correlation_id_var.set(correlation_id)
    tenant_id_var.set(tenant_id)


def log_with_context(
    logger: logging.Logger,
    level: str,
    message: str,
    correlation_id: str | None = None,
    tenant_id: str | None = None,
    **kwargs: Any,
) -> None:
    """Log with correlation and tenant context (legacy function)"""
    extra = kwargs
    if correlation_id:
        extra["correlation_id"] = correlation_id
    if tenant_id:
        extra["tenant_id"] = tenant_id

    log_method = getattr(logger, level.lower())
    log_method(message, extra=extra)
