import redis.asyncio as redis
from redis.exceptions import ConnectionError
from src.infrastructure.config.settings import get_settings
from typing import Optional

class MockRedis:
    def __init__(self):
        self._store = {}
    async def ping(self):
        return True
    async def get(self, key):
        return self._store.get(key)
    async def setex(self, key, time, value):
        self._store[key] = value
    async def close(self):
        pass

class RedisClient:
    _instance = None

    @classmethod
    async def get_client(cls):
        if cls._instance is None:
            settings = get_settings()
            try:
                real_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
                await real_redis.ping()
                cls._instance = real_redis
            except (ConnectionError, ValueError):
                print("⚠️ WARNING: Redis connection failed. Using in-memory MockRedis for Hackathon mode.")
                cls._instance = MockRedis()
        return cls._instance

    @classmethod
    async def close(cls):
        if cls._instance:
            await cls._instance.close()
            cls._instance = None
