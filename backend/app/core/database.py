"""
Database connection and initialization
Integration with Supabase
"""

import asyncio
from typing import AsyncGenerator
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global Supabase client
supabase: Client = None

async def init_db() -> None:
    """Initialize database connection"""
    global supabase
    try:
        supabase = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        )

        # Test connection
        result = supabase.table('assistants').select('id').limit(1).execute()
        logger.info("✅ Database connection established successfully")

    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise

def get_supabase() -> Client:
    """Get Supabase client instance"""
    global supabase
    if supabase is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return supabase

async def get_db() -> AsyncGenerator[Client, None]:
    """Dependency for getting database session"""
    try:
        db = get_supabase()
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise
    finally:
        # Cleanup if needed
        pass
