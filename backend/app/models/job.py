"""
Pydantic Models — Job

A single discrete task within a Workgroup.
Has checklists, uploads, and can be referenced by invoices.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class JobStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    INVOICED = "invoiced"
    PAID = "paid"


# ── Request Models ────────────────────────────────────

class JobCreate(BaseModel):
    workgroup_id: str
    title: str
    description: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    est_duration_days: Optional[int] = Field(None, ge=0)
    sequence: int = 1

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    budget: Optional[Decimal] = None
    est_duration_days: Optional[int] = None
    sequence: Optional[int] = None
    status: Optional[JobStatus] = None

class JobDependencyCreate(BaseModel):
    depends_on_job_id: str

class ChecklistItemUpdate(BaseModel):
    """Update a single checklist item."""
    item_index: int
    checked: bool
    note: Optional[str] = None


# ── Response Models ───────────────────────────────────

class JobResponse(BaseModel):
    id: str
    workgroup_id: str
    title: str
    description: Optional[str] = None
    budget: Optional[Decimal] = None
    est_duration_days: Optional[int] = None
    sequence: int
    status: JobStatus
    invoice_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class JobDetail(JobResponse):
    """Full job detail with checklist, uploads, and dependencies."""
    checklist: Optional[dict] = None    # checklist items from checklists table
    uploads: list = []                  # List[UploadResponse]
    dependencies: list = []             # List[JobDependencyResponse]

class JobDependencyResponse(BaseModel):
    id: str
    job_id: str
    depends_on_job_id: str
    depends_on_title: Optional[str] = None
    is_satisfied: bool = False
