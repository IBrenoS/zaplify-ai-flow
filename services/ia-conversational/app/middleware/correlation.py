"""
Correlation and tenant middleware using Starlette BaseHTTPMiddleware
Reads/generates x-correlation-id and x-tenant-id, saves in request.state
Returns x-correlation-id in response headers
"""

import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import log_error, log_info, set_correlation_context


class CorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle correlation ID and tenant ID
    - Reads or generates x-correlation-id
    - Reads x-tenant-id (defaults to 'demo')
    - Saves both in request.state
    - Returns x-correlation-id in response headers
    - Sets logging context for structured logs
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get or generate correlation_id
        correlation_id = request.headers.get("x-correlation-id")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        # Get or default tenant_id
        tenant_id = request.headers.get("x-tenant-id", "demo")

        # Store in request state for access in route handlers
        request.state.correlation_id = correlation_id
        request.state.tenant_id = tenant_id

        # Set logging context for this request
        set_correlation_context(correlation_id, tenant_id)

        # Log incoming request with standard fields
        log_info(
            f"Request {request.method} {request.url.path}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            method=request.method,
            path=request.url.path,
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        try:
            # Process request
            response = await call_next(request)

            # Add correlation headers to response
            response.headers["x-correlation-id"] = correlation_id
            response.headers["x-tenant-id"] = tenant_id

            # Log successful response
            log_info(
                f"Response {response.status_code}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                status_code=response.status_code,
                processing_time_ms=getattr(request.state, "processing_time", 0),
            )

            return response

        except Exception as e:
            # Log error with correlation context
            log_error(
                f"Request failed: {str(e)}",
                correlation_id=correlation_id,
                tenant_id=tenant_id,
                error_type=type(e).__name__,
                error_message=str(e),
                method=request.method,
                path=request.url.path,
            )

            # Re-raise the exception
            raise
