"""
API Router initialization
"""

from fastapi import APIRouter

from app.api import assistants, conversation, health, intent, rag, sentiment

api_router = APIRouter()

# Include all routers
api_router.include_router(health.router)
api_router.include_router(assistants.router)
api_router.include_router(conversation.router)
api_router.include_router(rag.router)
api_router.include_router(intent.router)
api_router.include_router(sentiment.router)
