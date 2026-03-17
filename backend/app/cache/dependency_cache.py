"""
Dependency Cache — L2 Redis Cache Helpers

Read/write dependency analysis results from Redis.
Used by:
  - dependency_analysis_worker (writes daily 5 AM + on events)
  - dependency_changes router (reads on API request, fallback to live compute)

Key schema:
  cms:cache:gantt:{project_id}            → full GanttData JSON (the big one)
  cms:cache:health_snapshot:{project_id}  → health snapshot JSON
  cms:cache:criticality:{project_id}      → criticality ranking JSON
  cms:cache:cashflow:{project_id}         → cash flow projection JSON
  cms:cache:delay_insights:{project_id}   → deadline monitor results JSON
  cms:cache:sensitivity:{project_id}      → sensitivity analysis JSON
"""

import logging
from typing import Optional
from app.cache.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# ── TTL Constants (seconds) ───────────────────────────────
GANTT_DATA_TTL = 600            # 10 min (refreshed on events + daily)
HEALTH_SNAPSHOT_TTL = 600       # 10 min
CRITICALITY_TTL = 600           # 10 min
CASHFLOW_TTL = 600              # 10 min
DELAY_INSIGHTS_TTL = 21600      # 6 hours (matches deadline monitor interval)
SENSITIVITY_TTL = 600           # 10 min


# ── GanttData (full enriched timeline response) ───────────

def get_cached_gantt_data(project_id: str) -> Optional[dict]:
    """Read full GanttData from Redis L2 cache."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:gantt:{project_id}")


def set_cached_gantt_data(project_id: str, data: dict) -> bool:
    """Write full GanttData to Redis L2 cache."""
    client = get_redis_client()
    success = client.set_json(
        f"cms:cache:gantt:{project_id}",
        data,
        ttl_seconds=GANTT_DATA_TTL,
    )
    if success:
        client.publish(
            f"cms:analysis:refreshed:{project_id}",
            {"project_id": project_id, "type": "gantt"},
        )
    return success


# ── Health Snapshot ───────────────────────────────────────

def get_cached_health_snapshot(project_id: str) -> Optional[dict]:
    """Read health snapshot from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:health_snapshot:{project_id}")


def set_cached_health_snapshot(project_id: str, data: dict) -> bool:
    """Write health snapshot to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:health_snapshot:{project_id}",
        data,
        ttl_seconds=HEALTH_SNAPSHOT_TTL,
    )


# ── Criticality Ranking ──────────────────────────────────

def get_cached_criticality(project_id: str) -> Optional[dict]:
    """Read criticality ranking from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:criticality:{project_id}")


def set_cached_criticality(project_id: str, data: dict) -> bool:
    """Write criticality ranking to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:criticality:{project_id}",
        data,
        ttl_seconds=CRITICALITY_TTL,
    )


# ── Cash Flow Projection ─────────────────────────────────

def get_cached_cashflow(project_id: str) -> Optional[dict]:
    """Read cash flow projection from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:cashflow:{project_id}")


def set_cached_cashflow(project_id: str, data: dict) -> bool:
    """Write cash flow projection to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:cashflow:{project_id}",
        data,
        ttl_seconds=CASHFLOW_TTL,
    )


# ── Delay Insights (deadline monitor) ────────────────────

def get_cached_delay_insights(project_id: str) -> Optional[dict]:
    """Read delay impact results from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:delay_insights:{project_id}")


def set_cached_delay_insights(project_id: str, data: dict) -> bool:
    """Write delay impact results to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:delay_insights:{project_id}",
        data,
        ttl_seconds=DELAY_INSIGHTS_TTL,
    )


# ── Sensitivity Analysis ─────────────────────────────────

def get_cached_sensitivity(project_id: str) -> Optional[dict]:
    """Read sensitivity analysis report from Redis."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:sensitivity:{project_id}")


def set_cached_sensitivity(project_id: str, data: dict) -> bool:
    """Write sensitivity analysis report to Redis."""
    client = get_redis_client()
    return client.set_json(
        f"cms:cache:sensitivity:{project_id}",
        data,
        ttl_seconds=SENSITIVITY_TTL,
    )


def invalidate_sensitivity(project_id: str) -> None:
    """
    Invalidate only the sensitivity cache for a project.

    Called by POST /sensitivity/{id}/refresh to force recomputation
    without clearing all other analysis caches (gantt, health, etc.).

    For clearing ALL caches, use invalidate_project_analysis() instead.
    """
    client = get_redis_client()
    client.delete_key(f"cms:cache:sensitivity:{project_id}")
    logger.info(f"Invalidated sensitivity cache for project {project_id}")


# ── Invalidation (all caches) ────────────────────────────

def invalidate_project_analysis(project_id: str) -> None:
    """
    Invalidate all analysis caches for a project.

    Called when the dependency graph changes (add/remove deps,
    add/remove workgroups/jobs, job completion, etc.).
    The next read will trigger a live recompute.
    """
    client = get_redis_client()
    keys = [
        f"cms:cache:gantt:{project_id}",
        f"cms:cache:health_snapshot:{project_id}",
        f"cms:cache:criticality:{project_id}",
        f"cms:cache:cashflow:{project_id}",
        f"cms:cache:delay_insights:{project_id}",
        f"cms:cache:sensitivity:{project_id}",
    ]
    for key in keys:
        client.delete_key(key)
    logger.info(f"Invalidated analysis caches for project {project_id}")