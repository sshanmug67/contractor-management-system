"""
Router — Dashboard

Aggregated endpoints for the Owner Dashboard UI.
Uses cache-first pattern: reads from Redis L2, falls through to
ProviderRegistry on cache miss. Never contacts a specific provider directly.

Cache is populated by dashboard_stats_worker (Celery Beat, every 5 min).
On cache hit: ~2ms response. On cache miss: ~200ms (6 DB queries via provider).

Skips auth for development — hardcoded org_id.
"""

import logging
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_dashboard_repo
from app.db.interfaces import IDashboardRepository
from app.cache.dashboard_cache import get_cached_dashboard_stats

logger = logging.getLogger(__name__)

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/owner")
async def get_owner_dashboard(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """
    Full owner dashboard payload — single API call for the entire UI.

    Cache-first pattern:
        1. Check Redis L2 cache (populated by dashboard_stats_worker every 5 min)
        2. CACHE HIT  → return immediately (~2ms, no DB query)
        3. CACHE MISS → fall through to ProviderRegistry (~200ms, 6 DB queries)

    Returns project, worksites with nested workgroups/jobs,
    budget summary, and dependency chains.

    The response shape is identical whether served from cache or from
    the database. The UI does not know which source provided the data.
    """
    org_id = DEV_ORG_ID  # TODO: Replace with get_current_user().org_id

    # ── 1. Try Redis L2 cache first ───────────────────
    # Only use cache for unfiltered requests (no project_id filter).
    # Filtered requests bypass cache and query the DB directly,
    # since the cache stores the full org-level payload.
    if project_id is None:
        cached = get_cached_dashboard_stats(org_id)
        if cached is not None:
            logger.debug(f"Dashboard cache HIT for org {org_id}")
            return cached

    # ── 2. Cache miss — query through ProviderRegistry ─
    # repo is IDashboardRepository, injected via Depends().
    # Could be Supabase or SQLAlchemy — the router doesn't know.
    logger.debug(f"Dashboard cache MISS for org {org_id} — querying database")
    data = await repo.get_owner_dashboard(org_id, project_id)
    return data


@router.get("/owner/budget")
async def get_budget_summary(
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """Budget summary across all projects."""
    org_id = DEV_ORG_ID  # TODO: Replace with get_current_user().org_id
    return await repo.get_budget_summary(org_id)
