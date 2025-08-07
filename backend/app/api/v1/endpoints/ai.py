"""
AI endpoints for chat and AI-related functionality
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

from app.services.ai_service import ai_service
from app.services.assistant_service import assistant_service
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str
    conversation_id: str
    assistant_id: str
    context: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str
    confidence: float
    processing_time: float
    metadata: Dict[str, Any] = {}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    db = Depends(get_db)
):
    """
    Send a message to an AI assistant and get a response
    """
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        # Get assistant configuration
        assistant = await assistant_service.get_assistant(request.assistant_id, user_id)
        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )

        # TODO: Get conversation history from database
        conversation_history = []  # Placeholder

        # Generate AI response
        ai_result = await ai_service.generate_response(
            message=request.message,
            conversation_id=request.conversation_id,
            assistant=assistant,
            conversation_history=conversation_history,
            context=request.context
        )

        return ChatResponse(
            response=ai_result["response"],
            confidence=ai_result["confidence"],
            processing_time=ai_result["processing_time"],
            metadata=ai_result["metadata"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


class SentimentRequest(BaseModel):
    """Request model for sentiment analysis"""
    text: str


@router.post("/sentiment")
async def analyze_sentiment(
    request: SentimentRequest,
    db = Depends(get_db)
):
    """Analyze sentiment of a text message"""
    try:
        result = await ai_service.analyze_sentiment(request.text)
        return result

    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze sentiment"
        )


@router.post("/intent")
async def extract_intent(
    request: SentimentRequest,  # Reusing same model
    db = Depends(get_db)
):
    """Extract intent from a text message"""
    try:
        result = await ai_service.extract_intent(request.text)
        return result

    except Exception as e:
        logger.error(f"Error in intent extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract intent"
        )
