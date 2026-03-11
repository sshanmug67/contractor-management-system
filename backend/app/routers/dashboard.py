"""
Router — Dashboard

Aggregated endpoints for the Owner Dashboard UI.
Skips auth for development — hardcoded org_id.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_dashboard_repo
from app.db.repositories.dashboard_queries import DashboardRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/owner")
async def get_owner_dashboard(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    repo: DashboardRepository = Depends(get_dashboard_repo),
):
    """
    Full owner dashboard payload — single API call for the entire UI.

    Returns project, worksites with nested workgroups/jobs,
    budget summary, and dependency chains.
    """
    org_id = DEV_ORG_ID  # TODO: Replace with get_current_user().org_id

    data = await repo.get_owner_dashboard(org_id, project_id)
    return data


@router.get("/owner/budget")
async def get_budget_summary(
    repo: DashboardRepository = Depends(get_dashboard_repo),
):
    """Budget summary across all projects."""
    org_id = DEV_ORG_ID
    return await repo.get_budget_summary(org_id)
