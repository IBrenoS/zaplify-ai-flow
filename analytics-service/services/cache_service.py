import redis.asyncio as redis
import json
import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
from config import analytics_config

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.is_connected = False

    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                analytics_config.REDIS_URL,
                password=analytics_config.REDIS_PASSWORD,
                decode_responses=True
            )

            # Test connection
            await self.redis_client.ping()
            self.is_connected = True
            logger.info("Redis cache service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")
            self.is_connected = False

    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.is_connected = False

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.is_connected:
            return None

        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = None
    ) -> bool:
        """Set value in cache"""
        if not self.is_connected:
            return False

        try:
            serialized_value = json.dumps(value, default=str)
            if ttl is None:
                ttl = analytics_config.CACHE_TTL

            await self.redis_client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.is_connected:
            return False

        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.is_connected:
            return False

        try:
            return await self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment numeric value"""
        if not self.is_connected:
            return None

        try:
            return await self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error for key {key}: {e}")
            return None

    async def get_pattern(self, pattern: str) -> List[str]:
        """Get keys matching pattern"""
        if not self.is_connected:
            return []

        try:
            return await self.redis_client.keys(pattern)
        except Exception as e:
            logger.error(f"Cache pattern error for pattern {pattern}: {e}")
            return []

    async def set_hash(self, key: str, mapping: Dict[str, Any], ttl: int = None) -> bool:
        """Set hash in cache"""
        if not self.is_connected:
            return False

        try:
            # Serialize values in the hash
            serialized_mapping = {k: json.dumps(v, default=str) for k, v in mapping.items()}
            await self.redis_client.hmset(key, serialized_mapping)

            if ttl:
                await self.redis_client.expire(key, ttl)
            return True
        except Exception as e:
            logger.error(f"Cache hash set error for key {key}: {e}")
            return False

    async def get_hash(self, key: str) -> Optional[Dict[str, Any]]:
        """Get hash from cache"""
        if not self.is_connected:
            return None

        try:
            hash_data = await self.redis_client.hgetall(key)
            if hash_data:
                # Deserialize values
                return {k: json.loads(v) for k, v in hash_data.items()}
            return None
        except Exception as e:
            logger.error(f"Cache hash get error for key {key}: {e}")
            return None

    async def add_to_list(self, key: str, value: Any, max_length: int = None) -> bool:
        """Add value to list"""
        if not self.is_connected:
            return False

        try:
            serialized_value = json.dumps(value, default=str)
            await self.redis_client.lpush(key, serialized_value)

            if max_length:
                await self.redis_client.ltrim(key, 0, max_length - 1)
            return True
        except Exception as e:
            logger.error(f"Cache list add error for key {key}: {e}")
            return False

    async def get_list(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Get list from cache"""
        if not self.is_connected:
            return []

        try:
            list_data = await self.redis_client.lrange(key, start, end)
            return [json.loads(item) for item in list_data]
        except Exception as e:
            logger.error(f"Cache list get error for key {key}: {e}")
            return []

    async def clear_analytics_cache(self) -> bool:
        """Clear all analytics-related cache entries"""
        if not self.is_connected:
            return False

        try:
            patterns = [
                "analytics:*",
                "metrics:*",
                "funnel:*",
                "conversation:*",
                "kpi:*"
            ]

            for pattern in patterns:
                keys = await self.get_pattern(pattern)
                if keys:
                    await self.redis_client.delete(*keys)

            logger.info("Analytics cache cleared successfully")
            return True
        except Exception as e:
            logger.error(f"Error clearing analytics cache: {e}")
            return False

    def generate_cache_key(self, service: str, method: str, **params) -> str:
        """Generate standardized cache key"""
        param_str = ":".join([f"{k}={v}" for k, v in sorted(params.items()) if v is not None])
        if param_str:
            return f"{service}:{method}:{param_str}"
        return f"{service}:{method}"

    async def cache_metrics(self, key: str, data: Any, ttl: int = None) -> bool:
        """Cache metrics data with standardized key format"""
        cache_key = f"metrics:{key}"
        return await self.set(cache_key, data, ttl or analytics_config.CACHE_TTL)

    async def get_cached_metrics(self, key: str) -> Optional[Any]:
        """Get cached metrics data"""
        cache_key = f"metrics:{key}"
        return await self.get(cache_key)
