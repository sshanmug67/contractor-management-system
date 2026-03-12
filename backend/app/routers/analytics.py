"""
Router — Analytics

Aggregated analytics endpoints for dashboards and reports.
Uses cache-first pattern where applicable (Redis L2).

All database access goes through IDashboardRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_dashboard_repo
from app.db.interfaces import IDashboardRepository
from app.cache.dashboard_cache import (
    get_cached_dashboard_stats,
    get_cached_ai_insights,
    get_cached_site_presence,
)

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/overview")
async def get_org_overview(
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """
    High-level org overview: project count, total spend, active workgroups.
    Cache-first: checks Redis, falls through to ProviderRegistry on miss.
    """
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id

    cached = get_cached_dashboard_stats(org_id)
    if cached:
        return cached.get("stats", {})

    # Cache miss — query via ProviderRegistry
    data = await repo.get_owner_dashboard(org_id)
    return data.get("stats", {})


@router.get("/budget")
async def get_budget_analytics(
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """Budget analytics: totals, burn rate, per-worksite breakdown."""
    org_id = DEV_ORG_ID

    cached = get_cached_dashboard_stats(org_id)
    if cached:
        return cached.get("budget_summary", {})

    data = await repo.get_owner_dashboard(org_id)
    return data.get("budget_summary", {})


@router.get("/insights")
async def get_ai_insights(
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """AI-generated insights (populated by insights_worker every 30 min)."""
    org_id = DEV_ORG_ID

    cached = get_cached_ai_insights(org_id)
    if cached:
        return {"insights": cached}

    # No cache — return empty until insights_worker runs
    return {"insights": []}


@router.get("/site-presence/{worksite_id}")
async def get_site_presence(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """Today's site presence: check-ins, worker count, anomalies."""
    cached = get_cached_site_presence(worksite_id)
    if cached:
        return cached

    # No cache — return empty until site_presence is populated
    return {"checkins": [], "worker_count": 0, "anomalies": 0}


@router.get("/worksite/{worksite_id}/summary")
async def get_worksite_summary(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """Worksite-level analytics: workgroup progress, budget, timeline."""
    # TODO: Build from cached dashboard data or query directly
    return {}


@router.get("/timeline")
async def get_project_timeline(
    project_id: Optional[str] = Query(None),
    # user=Depends(get_current_user),
    repo: IDashboardRepository = Depends(get_dashboard_repo),
):
    """Timeline/Gantt data: workgroup start/end dates, dependencies."""
    # TODO: Build from cached dashboard data or query directly
    return {}
