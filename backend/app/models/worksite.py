"""
Pydantic Models — Worksite

A physical work location within a Project.
Has geo-fence, contact persons, and contains Workgroups.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class WorksiteStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETE = "complete"
    ON_HOLD = "on_hold"


class ContactRole(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"


# ── Request Models ────────────────────────────────────

class WorksiteCreate(BaseModel):
    project_id: str
    name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    phone: Optional[str] = None
    site_notes: Optional[str] = None
    geo_latitude: Optional[Decimal] = Field(None, decimal_places=7)
    geo_longitude: Optional[Decimal] = Field(None, decimal_places=7)
    geo_fence_radius_m: int = 200
    budget: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class WorksiteUpdate(BaseModel):
    name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    site_notes: Optional[str] = None
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None
    geo_fence_radius_m: Optional[int] = None
    budget: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[WorksiteStatus] = None

class WorksiteContactAssign(BaseModel):
    employee_id: str
    contact_role: ContactRole


# ── Response Models ───────────────────────────────────

class WorksiteContactResponse(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None          # employee's job role
    contact_role: ContactRole           # primary / secondary

class WorksiteResponse(BaseModel):
    id: str
    project_id: str
    name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    phone: Optional[str] = None
    site_notes: Optional[str] = None
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None
    geo_fence_radius_m: int = 200
    budget: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: WorksiteStatus
    progress_pct: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime

class WorksiteDetail(WorksiteResponse):
    """Full worksite with contacts and workgroup summaries."""
    contacts: list[WorksiteContactResponse] = []
    workgroups: list = []       # List[WorkgroupResponse]
    workgroup_count: int = 0
