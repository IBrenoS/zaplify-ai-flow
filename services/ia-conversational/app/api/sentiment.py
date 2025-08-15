"""
Sentiment analysis endpoints - Enhanced with HuggingFace Transformers
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.core.logging import log_error, log_info
from app.schemas.assistant import SentimentRequest, SentimentResponse
from app.services.nlp_service import nlp_service

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.post("/analyze", response_model=SentimentResponse)
async def analyze_sentiment(
    request: SentimentRequest, req: Request
) -> SentimentResponse:
    """
    Analyze sentiment from user text using HuggingFace Transformers
    Falls back to rule-based analysis if models are unavailable
    """

    correlation_id = getattr(req.state, "correlation_id", "unknown")
    tenant_id = getattr(req.state, "tenant_id", "demo")

    try:
        log_info(
            f"Processing sentiment analysis for text: '{request.text[:50]}...'",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            text_length=len(request.text),
            service_status=nlp_service.get_status(),
        )

        # Use NLP service for real analysis
        sentiment, confidence, score, metadata = await nlp_service.analyze_sentiment(
            text=request.text, correlation_id=correlation_id, tenant_id=tenant_id
        )

        response = SentimentResponse(
            sentiment=sentiment, confidence=confidence, score=score
        )

        log_info(
            f"Sentiment analyzed: {response.sentiment}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            sentiment=response.sentiment,
            confidence=response.confidence,
            score=response.score,
            method=metadata.get("method", "unknown"),
            text_length=len(request.text),
        )

        return response

    except Exception as e:
        log_error(
            f"Sentiment analysis failed: {e}",
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            text=request.text[:100],
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze sentiment",
        ) from e
