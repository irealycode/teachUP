import redis.asyncio as aioredis
import json
import os
from typing import Optional, Any
from datetime import timedelta

class RedisClient:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = await aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        print("✅ Connected to Redis")
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            print("❌ Disconnected from Redis")
    
    async def set(self, key: str, value: Any, expire: int = 3600):
        """Set a value with optional expiration (in seconds)"""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await self.redis.set(key, value, ex=expire)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get a value by key"""
        value = await self.redis.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None
    
    async def delete(self, key: str):
        """Delete a key"""
        await self.redis.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        return await self.redis.exists(key) > 0
    
    async def expire(self, key: str, seconds: int):
        """Set expiration time for a key"""
        await self.redis.expire(key, seconds)
    
    async def incr(self, key: str) -> int:
        """Increment a counter"""
        return await self.redis.incr(key)
    
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching a pattern"""
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

redis_client = RedisClient()