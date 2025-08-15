"""
Redis connection and configuration
"""

import json
import os
from typing import Any

import redis

from app.core.logging import get_logger

logger = get_logger(__name__)


class RedisService:
    """Redis service with feature flag and fallback support"""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.client = None
        self._available = False
        self.env = os.getenv("ENV", "development")
        self.memory_cache = {}  # In-memory fallback for dev

        if self.redis_url:
            try:
                self.client = redis.from_url(self.redis_url, decode_responses=True)
                # Test connection
                self.client.ping()
                self._available = True
                logger.info("Redis connection established")
            except Exception as e:
                logger.error(f"Redis connection failed: {e}")
                self._available = False
        else:
            logger.warning("REDIS_URL not set - using fallback mode")

    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self._available

    def _get_memory_key(self, key: str) -> str:
        """Generate memory cache key"""
        return f"mem_{key}"

    def set(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """Set value with optional TTL"""
        try:
            if self.is_available():
                serialized = json.dumps(value) if not isinstance(value, str) else value
                return self.client.set(key, serialized, ex=ttl)
            else:
                # Fallback to memory in dev
                if self.env == "development":
                    self.memory_cache[self._get_memory_key(key)] = {
                        "value": value,
                        "ttl": ttl,
                    }
                    logger.warning(f"Using in-memory cache for key: {key}")
                    return True
                else:
                    logger.error("Redis unavailable in production - operation failed")
                    return False
        except Exception as e:
            logger.error(f"Redis SET failed for key {key}: {e}")
            return False

    def setex(self, key: str, ttl: int, value: Any) -> bool:
        """Set value with TTL (Redis SETEX command)"""
        try:
            if self.is_available():
                serialized = json.dumps(value) if not isinstance(value, str) else value
                return self.client.setex(key, ttl, serialized)
            else:
                # Fallback to memory in dev
                if self.env == "development":
                    self.memory_cache[self._get_memory_key(key)] = {
                        "value": value,
                        "ttl": ttl,
                    }
                    logger.warning(f"Using in-memory cache for key: {key}")
                    return True
                else:
                    logger.error("Redis unavailable in production - operation failed")
                    return False
        except Exception as e:
            logger.error(f"Redis SETEX failed for key {key}: {e}")
            return False

    def get(self, key: str) -> Any | None:
        """Get value"""
        try:
            if self.is_available():
                value = self.client.get(key)
                if value:
                    try:
                        return json.loads(value)
                    except json.JSONDecodeError:
                        return value
                return None
            else:
                # Fallback to memory in dev
                if self.env == "development":
                    cached = self.memory_cache.get(self._get_memory_key(key))
                    if cached:
                        logger.warning(f"Retrieved from in-memory cache: {key}")
                        return cached["value"]
                return None
        except Exception as e:
            logger.error(f"Redis GET failed for key {key}: {e}")
            return None

    def delete(self, key: str) -> bool:
        """Delete key"""
        try:
            if self.is_available():
                return bool(self.client.delete(key))
            else:
                if self.env == "development":
                    mem_key = self._get_memory_key(key)
                    if mem_key in self.memory_cache:
                        del self.memory_cache[mem_key]
                        return True
                return False
        except Exception as e:
            logger.error(f"Redis DELETE failed for key {key}: {e}")
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            if self.is_available():
                return bool(self.client.exists(key))
            else:
                if self.env == "development":
                    return self._get_memory_key(key) in self.memory_cache
                return False
        except Exception as e:
            logger.error(f"Redis EXISTS failed for key {key}: {e}")
            return False


# Global Redis instance
redis_service = RedisService()
