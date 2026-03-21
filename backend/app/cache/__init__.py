"""
Cache Layer — Redis L2 Cache + Pub/Sub

Provides:
  - RedisClient: singleton connection with graceful fallback
  - Dashboard cache helpers: read/write dashboard stats
  - Branding cache helpers: read/write company identity
  - Pub/sub for real-time event broadcasting
"""

from app.cache.redis_client import get_redis_client, RedisClient
from app.cache.redis_config import get_redis_config, RedisConfig
from app.cache.dashboard_cache import (
    get_cached_dashboard_stats,
    set_cached_dashboard_stats,
    get_cached_ai_insights,
    set_cached_ai_insights,
)
from app.cache.branding_cache import (
    get_cached_branding,
    set_cached_branding,
    invalidate_branding,
    extract_branding,
)

__all__ = [
    "get_redis_client",
    "RedisClient",
    "get_redis_config",
    "RedisConfig",
    "get_cached_dashboard_stats",
    "set_cached_dashboard_stats",
    "get_cached_ai_insights",
    "set_cached_ai_insights",
    "get_cached_branding",
    "set_cached_branding",
    "invalidate_branding",
    "extract_branding",
]
