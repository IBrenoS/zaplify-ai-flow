"""
Intent analysis endpoints - Enhanced with HuggingFace Transformers
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.core.logging import log_error, log_info
from app.schemas.assistant import IntentRequest, IntentResponse
from app.services.nlp_service import nlp_service

router = APIRouter(prefix="/intent", tags=["intent"])


@router.post("/classify", response_model=IntentResponse)
async def classify_intent(request: IntentRequest, req: Request) -> IntentResponse:
    """
    Classify intent from user text using HuggingFace Transformers
    Falls back to keyword-based classification if models are unavailable
    """

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        log_info(
            f"Processing intent classification for text: '{request.text[:50]}...'",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            text_length=len(request.text),
            service_status=nlp_service.get_status(),
        )

        # Use NLP service for real classification
        intent, confidence, metadata = await nlp_service.classify_intent(
            text=request.text,
            labels=getattr(request, "labels", None),
            correlation_id=correlation_id,
            tenant_id=tenant_id,
        )

        response = IntentResponse(
            intent=intent,
            confidence=confidence,
            entities=metadata,  # Use metadata as entities for backward compatibility
        )

        log_info(
            f"Intent classified: {response.intent}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            intent=response.intent,
            confidence=response.confidence,
            method=metadata.get("method", "unknown"),
            text_length=len(request.text),
        )

        return response

    except Exception as e:
        log_error(
            f"Intent classification failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            text=request.text[:100],
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to classify intent",
        ) from e
