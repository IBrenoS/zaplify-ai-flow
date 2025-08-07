"""
Assistant endpoints for managing AI assistants
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.models.assistant import (
    AssistantCreate,
    AssistantUpdate,
    AssistantResponse,
    AssistantWithStats
)
from app.services.assistant_service import assistant_service
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=AssistantResponse, status_code=status.HTTP_201_CREATED)
async def create_assistant(
    assistant_data: AssistantCreate,
    db = Depends(get_db)
):
    """Create a new AI assistant"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        assistant = await assistant_service.create_assistant(assistant_data, user_id)
        return assistant

    except Exception as e:
        logger.error(f"Error creating assistant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assistant"
        )


@router.get("/", response_model=List[AssistantResponse])
async def get_assistants(
    db = Depends(get_db)
):
    """Get all assistants for the current user"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        assistants = await assistant_service.get_user_assistants(user_id)
        return assistants

    except Exception as e:
        logger.error(f"Error getting assistants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistants"
        )


@router.get("/{assistant_id}", response_model=AssistantResponse)
async def get_assistant(
    assistant_id: str,
    db = Depends(get_db)
):
    """Get a specific assistant by ID"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        assistant = await assistant_service.get_assistant(assistant_id, user_id)

        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )

        return assistant

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assistant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistant"
        )


@router.put("/{assistant_id}", response_model=AssistantResponse)
async def update_assistant(
    assistant_id: str,
    update_data: AssistantUpdate,
    db = Depends(get_db)
):
    """Update an assistant"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        assistant = await assistant_service.update_assistant(assistant_id, user_id, update_data)

        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )

        return assistant

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assistant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assistant"
        )


@router.delete("/{assistant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assistant(
    assistant_id: str,
    db = Depends(get_db)
):
    """Delete an assistant"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        success = await assistant_service.delete_assistant(assistant_id, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting assistant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assistant"
        )


@router.get("/{assistant_id}/stats", response_model=AssistantWithStats)
async def get_assistant_with_stats(
    assistant_id: str,
    db = Depends(get_db)
):
    """Get assistant with statistics"""
    try:
        # TODO: Get user_id from JWT token
        user_id = "temp_user_id"  # Temporary until auth is implemented

        assistant = await assistant_service.get_assistant_with_stats(assistant_id, user_id)

        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )

        return assistant

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assistant stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistant statistics"
        )
