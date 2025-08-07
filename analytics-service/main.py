from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from config import analytics_config
from services.metrics_service import MetricsService
from services.funnel_analytics_service import FunnelAnalyticsService
from services.conversation_analytics_service import ConversationAnalyticsService
from services.cache_service import CacheService
from models.analytics_models import (
    MetricsRequest,
    FunnelAnalyticsRequest,
    ConversationAnalyticsRequest,
    AnalyticsResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
metrics_service = None
funnel_analytics_service = None
conversation_analytics_service = None
cache_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global metrics_service, funnel_analytics_service, conversation_analytics_service, cache_service

    logger.info(f"Starting {analytics_config.SERVICE_NAME} v{analytics_config.VERSION}")

    # Initialize services
    cache_service = CacheService()
    await cache_service.initialize()

    metrics_service = MetricsService(cache_service)
    funnel_analytics_service = FunnelAnalyticsService(cache_service)
    conversation_analytics_service = ConversationAnalyticsService(cache_service)

    await metrics_service.initialize()
    await funnel_analytics_service.initialize()
    await conversation_analytics_service.initialize()

    logger.info("Analytics service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down analytics service")
    if cache_service:
        await cache_service.close()

# Create FastAPI app
app = FastAPI(
    title="Zaplify Analytics Service",
    description="Analytics and metrics processing service for Zaplify AI Flow",
    version=analytics_config.VERSION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": analytics_config.SERVICE_NAME,
        "version": analytics_config.VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

# Metrics endpoints
@app.get("/metrics/kpi")
async def get_kpi_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Get KPI metrics for dashboard"""
    try:
        return await metrics_service.get_kpi_metrics(start_date, end_date, user_id)
    except Exception as e:
        logger.error(f"Error getting KPI metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/conversion")
async def get_conversion_metrics(
    funnel_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get conversion metrics"""
    try:
        return await metrics_service.get_conversion_metrics(funnel_id, start_date, end_date)
    except Exception as e:
        logger.error(f"Error getting conversion metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/performance")
async def get_performance_metrics(
    assistant_id: Optional[str] = None,
    time_range: str = "24h"
):
    """Get assistant performance metrics"""
    try:
        return await metrics_service.get_performance_metrics(assistant_id, time_range)
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Funnel analytics endpoints
@app.get("/analytics/funnel/{funnel_id}")
async def get_funnel_analytics(funnel_id: str, time_range: str = "7d"):
    """Get detailed funnel analytics"""
    try:
        return await funnel_analytics_service.get_funnel_analytics(funnel_id, time_range)
    except Exception as e:
        logger.error(f"Error getting funnel analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/funnel/{funnel_id}/conversion-flow")
async def get_conversion_flow(funnel_id: str):
    """Get funnel conversion flow data"""
    try:
        return await funnel_analytics_service.get_conversion_flow(funnel_id)
    except Exception as e:
        logger.error(f"Error getting conversion flow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/funnel/{funnel_id}/bottlenecks")
async def get_funnel_bottlenecks(funnel_id: str):
    """Identify funnel bottlenecks"""
    try:
        return await funnel_analytics_service.identify_bottlenecks(funnel_id)
    except Exception as e:
        logger.error(f"Error identifying bottlenecks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Conversation analytics endpoints
@app.get("/analytics/conversations")
async def get_conversation_analytics(
    assistant_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get conversation analytics"""
    try:
        return await conversation_analytics_service.get_conversation_analytics(
            assistant_id, start_date, end_date
        )
    except Exception as e:
        logger.error(f"Error getting conversation analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/conversations/sentiment")
async def get_sentiment_analysis(
    assistant_id: Optional[str] = None,
    time_range: str = "7d"
):
    """Get sentiment analysis of conversations"""
    try:
        return await conversation_analytics_service.get_sentiment_analysis(assistant_id, time_range)
    except Exception as e:
        logger.error(f"Error getting sentiment analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/conversations/topics")
async def get_conversation_topics(
    assistant_id: Optional[str] = None,
    time_range: str = "7d",
    limit: int = 10
):
    """Get most discussed topics"""
    try:
        return await conversation_analytics_service.get_conversation_topics(
            assistant_id, time_range, limit
        )
    except Exception as e:
        logger.error(f"Error getting conversation topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Real-time analytics endpoints
@app.get("/analytics/real-time/activity")
async def get_real_time_activity():
    """Get real-time activity metrics"""
    try:
        return await metrics_service.get_real_time_activity()
    except Exception as e:
        logger.error(f"Error getting real-time activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/real-time/conversations")
async def get_active_conversations():
    """Get currently active conversations"""
    try:
        return await conversation_analytics_service.get_active_conversations()
    except Exception as e:
        logger.error(f"Error getting active conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Data processing endpoints
@app.post("/analytics/process/batch")
async def process_batch_data(background_tasks: BackgroundTasks):
    """Process batch analytics data"""
    try:
        background_tasks.add_task(metrics_service.process_batch_data)
        return {"message": "Batch processing started", "status": "processing"}
    except Exception as e:
        logger.error(f"Error starting batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/cache/refresh")
async def refresh_analytics_cache():
    """Refresh analytics cache"""
    try:
        await cache_service.clear_analytics_cache()
        return {"message": "Analytics cache refreshed", "status": "success"}
    except Exception as e:
        logger.error(f"Error refreshing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Export endpoints
@app.get("/analytics/export/metrics")
async def export_metrics(
    format: str = "json",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export metrics data"""
    try:
        return await metrics_service.export_metrics(format, start_date, end_date)
    except Exception as e:
        logger.error(f"Error exporting metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=analytics_config.HOST,
        port=analytics_config.PORT,
        reload=analytics_config.DEBUG
    )
