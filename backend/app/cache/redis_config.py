"""
Redis Configuration

Reads Redis connection settings from app config.
Provides connection parameters for both the Redis client and Celery broker.
"""

from dataclasses import dataclass
from app.config import get_settings


@dataclass
class RedisConfig:
    """Redis connection configuration."""
    url: str
    max_connections: int = 10
    socket_timeout: float = 5.0
    socket_connect_timeout: float = 5.0
    retry_on_timeout: bool = True
    decode_responses: bool = True

    @property
    def broker_url(self) -> str:
        """Celery broker URL (same Redis instance, db 0)."""
        return self.url

    @property
    def result_backend(self) -> str:
        """Celery result backend (same Redis instance, db 1)."""
        base = self.url.rsplit("/", 1)[0]
        return f"{base}/1"


def get_redis_config() -> RedisConfig:
    """Build RedisConfig from application settings."""
    settings = get_settings()
    redis_url = getattr(settings, "redis_url", "redis://localhost:6379/0")
    return RedisConfig(url=redis_url)
