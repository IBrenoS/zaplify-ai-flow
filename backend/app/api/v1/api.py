"""
Main API router combining all endpoints
"""

from fastapi import APIRouter
from app.api.v1.endpoints import assistants, conversations, ai

api_router = APIRouter()

api_router.include_router(assistants.router, prefix="/assistants", tags=["assistants"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
