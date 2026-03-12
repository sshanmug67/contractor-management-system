"""
Dashboard Cache — L2 Redis Cache Helpers

Read/write dashboard stats from Redis.
Used by:
  - dashboard_stats_worker (writes every 5 min)
  - analytics router (reads on API request)

Key schema:
  cms:cache:dashboard_stats:{org_id}  → full dashboard stats JSON
  cms:cache:ai_insights:{org_id}      → AI-generated insights JSON
  cms:cache:site_presence:{worksite_id} → today's check-in summary
"""

import logging
from typing import Optional
from app.cache.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# ── TTL Constants (seconds) ───────────────────────────────
DASHBOARD_STATS_TTL = 600       # 10 min (2x the 5-min refresh)
AI_INSIGHTS_TTL = 2100          # 35 min (2x the 30-min refresh)
SITE_PRESENCE_TTL = 300         # 5 min


# ── Dashboard Stats ───────────────────────────────────────

def get_cached_dashboard_stats(org_id: str) -> Optional[dict]:
    """Read dashboard stats from Redis L2 cache."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:dashboard_stats:{org_id}")


def set_cached_dashboard_stats(org_id: str, stats: dict) -> bool:
    """Write dashboard stats to Redis L2 cache."""
    client = get_redis_client()
    success = client.set_json(
        f"cms:cache:dashboard_stats:{org_id}",
        stats,
        ttl_seconds=DASHBOARD_STATS_TTL,
    )
    if success:
        # Publish refresh event for any listeners
        client.publish(f"cms:stats:refreshed:{org_id}", {"org_id": org_id})
    return success


# ── AI Insights ───────────────────────────────────────────

def get_cached_ai_insights(org_id: str) -> Optional[list]:
    """Read AI insights from Redis L2 cache."""
    client = get_redis_client()
    data = client.get_json(f"cms:cache:ai_insights:{org_id}")
    return data.get("insights") if data else None


def set_cached_ai_insights(org_id: str, insights: list) -> bool:
    """Write AI insights to Redis L2 cache."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:ai_insights:{org_id}",
        {"insights": insights},
        ttl_seconds=AI_INSIGHTS_TTL,
    )


# ── Site Presence ─────────────────────────────────────────

def get_cached_site_presence(worksite_id: str) -> Optional[dict]:
    """Read today's check-in summary from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:site_presence:{worksite_id}")


def set_cached_site_presence(worksite_id: str, presence: dict) -> bool:
    """Write today's check-in summary to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:site_presence:{worksite_id}",
        presence,
        ttl_seconds=SITE_PRESENCE_TTL,
    )
