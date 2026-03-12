"""
Redis Client — Singleton Connection

Provides a shared Redis client for caching, pub/sub, and distributed locks.
Graceful fallback: if Redis is unavailable, operations return None instead of crashing.

Pattern mirrors CVE Intel's v2_redis_client.py.
"""

import json
import logging
from typing import Optional
from functools import lru_cache

import redis
from app.cache.redis_config import get_redis_config

logger = logging.getLogger(__name__)


class RedisClient:
    """Thread-safe Redis client with graceful fallback."""

    def __init__(self):
        config = get_redis_config()
        self._client = redis.Redis.from_url(
            config.url,
            max_connections=config.max_connections,
            socket_timeout=config.socket_timeout,
            socket_connect_timeout=config.socket_connect_timeout,
            retry_on_timeout=config.retry_on_timeout,
            decode_responses=config.decode_responses,
        )
        self._available = self._check_connection()

    def _check_connection(self) -> bool:
        """Test Redis connectivity on startup."""
        try:
            self._client.ping()
            logger.info("Redis connected successfully")
            return True
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis unavailable: {e}. Cache operations will be skipped.")
            return False

    @property
    def is_available(self) -> bool:
        return self._available

    @property
    def client(self) -> redis.Redis:
        return self._client

    # ── Cache Operations ──────────────────────────────────

    def get_json(self, key: str) -> Optional[dict]:
        """Get a JSON value from Redis. Returns None on miss or error."""
        if not self._available:
            return None
        try:
            raw = self._client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Redis GET error for '{key}': {e}")
            return None

    def set_json(self, key: str, value: dict, ttl_seconds: int = 600) -> bool:
        """Set a JSON value in Redis with TTL. Returns False on error."""
        if not self._available:
            return False
        try:
            self._client.setex(key, ttl_seconds, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.warning(f"Redis SET error for '{key}': {e}")
            return False

    def delete_key(self, key: str) -> bool:
        """Delete a key. Returns False on error."""
        if not self._available:
            return False
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis DELETE error for '{key}': {e}")
            return False

    # ── Pub/Sub ───────────────────────────────────────────

    def publish(self, channel: str, message: dict) -> bool:
        """Publish a JSON message to a Redis channel."""
        if not self._available:
            return False
        try:
            self._client.publish(channel, json.dumps(message, default=str))
            return True
        except Exception as e:
            logger.warning(f"Redis PUBLISH error on '{channel}': {e}")
            return False

    # ── Distributed Locks ─────────────────────────────────

    def acquire_lock(self, key: str, ttl_seconds: int = 30) -> bool:
        """Acquire a distributed lock. Returns True if acquired."""
        if not self._available:
            return True  # If no Redis, skip locking (single-instance fallback)
        try:
            return bool(self._client.set(key, "locked", nx=True, ex=ttl_seconds))
        except Exception as e:
            logger.warning(f"Redis LOCK error for '{key}': {e}")
            return True  # Fail open

    def release_lock(self, key: str) -> None:
        """Release a distributed lock."""
        self.delete_key(key)

    # ── Health Check ──────────────────────────────────────

    def health(self) -> dict:
        """Return Redis health info for /api/health endpoint."""
        if not self._available:
            return {"connected": False, "error": "Redis unavailable"}
        try:
            info = self._client.info("memory")
            return {
                "connected": True,
                "memory_used_mb": round(info.get("used_memory", 0) / 1024 / 1024, 2),
                "keys": self._client.dbsize(),
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    # ── Worker Heartbeat ──────────────────────────────────

    def write_heartbeat(self, worker_name: str) -> None:
        """Record worker heartbeat for monitoring."""
        import datetime
        self.set_json(
            f"cms:health:worker:{worker_name}",
            {"last_beat": datetime.datetime.utcnow().isoformat(), "status": "alive"},
            ttl_seconds=3600,
        )


@lru_cache()
def get_redis_client() -> RedisClient:
    """Get or create the singleton RedisClient."""
    return RedisClient()
