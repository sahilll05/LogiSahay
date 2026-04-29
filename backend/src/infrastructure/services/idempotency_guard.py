from src.infrastructure.cache.redis_client import RedisClient
import json

class IdempotencyGuard:
    @staticmethod
    async def get(key: str):
        redis = await RedisClient.get_client()
        val = await redis.get(f"idem:{key}")
        return json.loads(val) if val else None

    @staticmethod
    async def set(key: str, value: dict, ttl: int = 3600):
        redis = await RedisClient.get_client()
        await redis.setex(f"idem:{key}", ttl, json.dumps(value))
