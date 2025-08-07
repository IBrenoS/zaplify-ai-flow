"""
Zaplify AI Flow - Backend Core
FastAPI application with AI conversational capabilities
"""

from fastapi import FastAPI, Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
import os
from dotenv import load_dotenv

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import init_db

# Load environment variables
load_dotenv()

# Create FastAPI instance
app = FastAPI(
    title="Zaplify AI Flow API",
    description="Backend API for AI-powered conversational sales platform",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    await init_db()
    print("🚀 Zaplify AI Flow Backend started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 Zaplify AI Flow Backend shutting down...")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Zaplify AI Flow API",
        "version": "0.1.0",
        "status": "healthy",
        "docs": f"{settings.API_V1_STR}/docs" if settings.DEBUG else None
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "database": "connected",  # TODO: Add actual DB health check
        "redis": "connected",     # TODO: Add actual Redis health check
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.API_WORKERS
    )
