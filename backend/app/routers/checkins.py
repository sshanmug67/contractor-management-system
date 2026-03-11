"""
Router — Site Check-ins (GPS)

Layer 1 of the double-proof geo-verification system.
Workers check in via GPS before starting work on a workgroup.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_worker, get_current_user
from app.models.checkin import (
    CheckinCreate, CheckoutRequest,
    CheckinResponse, CheckinVerification,
)

router = APIRouter()


@router.post("/", response_model=CheckinResponse, status_code=201)
async def check_in(
    checkin: CheckinCreate,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """
    GPS check-in to a worksite.
    
    - Calculates distance from worksite center
    - Verifies within geo-fence radius
    - Records: worker, GPS, timestamp, distance, device info
    - Must check in before marking jobs in-progress
    """
    # TODO: Look up worksite via workgroup → worksite
    # TODO: Calculate distance (services/geo_verification.py)
    # TODO: Check within geo-fence radius
    # TODO: Create site_checkins record
    # TODO: AI flag if outside geo-fence
    pass


@router.post("/checkout", response_model=CheckinResponse)
async def check_out(
    checkout: CheckoutRequest,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """Optional check-out. Auto-checked-out after X hours of inactivity."""
    # TODO: Update site_checkins SET checked_out_at = NOW()
    pass


@router.get("/", response_model=list[CheckinResponse])
async def list_checkins(
    workgroup_id: Optional[str] = Query(None),
    worker_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """List check-in records with filters (for dashboard/analytics)."""
    return []


@router.get("/verify")
async def verify_location(
    workgroup_id: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    db=Depends(get_db),
) -> CheckinVerification:
    """
    Pre-check: verify if a GPS position is within worksite geo-fence.
    Used by the app to show distance before actual check-in.
    """
    # TODO: Look up worksite geo-fence
    # TODO: Calculate distance
    # TODO: Return verification result
    pass
