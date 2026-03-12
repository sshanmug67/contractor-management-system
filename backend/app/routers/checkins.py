"""
Router — Check-ins

GPS check-in/check-out for contractor workers at worksites.
Check-in triggers geo_worker for fence validation (Pattern 2 async).

All database access goes through ICheckinRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_checkin_repo
from app.db.interfaces import ICheckinRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.post("/", status_code=202)
async def check_in(
    data: dict,
    # worker=Depends(get_current_worker),  # Contractor auth via QR
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """
    Record a GPS check-in at a worksite.
    Pattern 2 (async): create record + fire geo_worker.delay().
    """
    # TODO: checkin = await repo.create(data)
    # TODO: geo_worker.delay(checkin['id'], 'checkin')
    # return {'id': checkin['id'], 'status': 'recorded'}
    pass


@router.post("/{checkin_id}/checkout")
async def check_out(
    checkin_id: str,
    data: dict,
    # worker=Depends(get_current_worker),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """Record check-out time for an existing check-in."""
    # TODO: repo.checkout(checkin_id, data)
    pass


@router.get("/worksite/{worksite_id}")
async def list_worksite_checkins(
    worksite_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    # user=Depends(get_current_user),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """List check-ins for a worksite, optionally filtered by date."""
    # TODO: repo.get_by_worksite(worksite_id) or repo.get_today_by_worksite(worksite_id)
    return []


@router.get("/worksite/{worksite_id}/today")
async def get_today_presence(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """Get today's site presence: who checked in, when, still on-site."""
    # TODO: repo.get_today_by_worksite(worksite_id)
    return []
