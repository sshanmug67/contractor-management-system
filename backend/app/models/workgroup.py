"""
Pydantic Models — Workgroup

A contractor contract unit within a Project.
Contains one or more Jobs. Optionally assigned to a Worksite.

v3 MIGRATION CHANGES:
  - WorkgroupCreate: added project_id (required), worksite_id now Optional
  - WorkgroupResponse: added project_id, worksite_id now Optional
  - WorkgroupDetail: inherits changes from WorkgroupResponse (automatic)
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class WorkgroupStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"           # allocated, waiting for contractor response
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    APPROVED = "approved"
    COMPLETE = "complete"
    DISPUTED = "disputed"


# ── Request Models ────────────────────────────────────

class WorkgroupCreate(BaseModel):
    project_id: str                                     # ← v3: NEW (required)
    worksite_id: Optional[str] = None                   # ← v3: was required str
    title: str
    trade: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class WorkgroupUpdate(BaseModel):
    title: Optional[str] = None
    trade: Optional[str] = None
    budget: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[WorkgroupStatus] = None
    worksite_id: Optional[str] = None                   # ← v3: allow changing worksite

class WorkgroupAllocate(BaseModel):
    """Allocate a contractor to this workgroup."""
    contractor_id: str

class WorkgroupAcceptReject(BaseModel):
    """Contractor accepts or rejects the workgroup."""
    action: str = Field(..., pattern="^(accept|reject)$")
    reason: Optional[str] = None        # required if reject

class WorkgroupDependencyCreate(BaseModel):
    depends_on_workgroup_id: str
    dependency_type: str = "finish_to_start"


# ── Response Models ───────────────────────────────────

class WorkgroupResponse(BaseModel):
    id: str
    project_id: str                                     # ← v3: NEW
    worksite_id: Optional[str] = None                   # ← v3: was required str
    contractor_id: Optional[str] = None
    title: str
    trade: Optional[str] = None
    budget: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: WorkgroupStatus
    progress_pct: Decimal = Decimal("0")
    accepted_by: Optional[str] = None
    accepted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class WorkgroupDetail(WorkgroupResponse):
    """Full workgroup detail with jobs, contractor info, and site presence."""
    contractor_name: Optional[str] = None
    worksite_name: Optional[str] = None
    jobs: list = []                     # List[JobResponse]
    job_count: int = 0
    total_invoiced: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    remaining_budget: Decimal = Decimal("0")
    total_checkins: int = 0
    unique_workers: int = 0
    dependencies: list = []             # List[WorkgroupDependencyResponse]

class WorkgroupDependencyResponse(BaseModel):
    id: str
    workgroup_id: str
    depends_on_workgroup_id: str
    depends_on_title: Optional[str] = None
    dependency_type: str
    is_satisfied: bool = False
