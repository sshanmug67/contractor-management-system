"""
Pydantic Models — Site Check-in (GPS)

Layer 1 of the double-proof geo-verification system.
Records worker GPS position relative to worksite geo-fence.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ── Request Models ────────────────────────────────────

class CheckinCreate(BaseModel):
    workgroup_id: str
    geo_latitude: Decimal = Field(..., decimal_places=7)
    geo_longitude: Decimal = Field(..., decimal_places=7)
    device_info: Optional[dict] = None

class CheckoutRequest(BaseModel):
    checkin_id: str


# ── Response Models ───────────────────────────────────

class CheckinResponse(BaseModel):
    id: str
    workgroup_id: str
    worksite_id: str
    worker_id: str
    geo_latitude: Decimal
    geo_longitude: Decimal
    distance_from_site_m: Optional[Decimal] = None
    within_geo_fence: bool
    device_info: Optional[dict] = None
    checked_in_at: datetime
    checked_out_at: Optional[datetime] = None

class CheckinVerification(BaseModel):
    """Result of geo-fence check on a check-in attempt."""
    within_geo_fence: bool
    distance_from_site_m: Decimal
    geo_fence_radius_m: int
    worksite_name: str
    message: str                        # "Within range" / "Outside geo-fence (352m away)"
