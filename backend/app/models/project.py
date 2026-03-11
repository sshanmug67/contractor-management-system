"""
Pydantic Models — Project

Hierarchy: Organization → Project → Worksites
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    PLANNING = "planning"
    ACTIVE = "active"
    REVIEW = "review"
    COMPLETE = "complete"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


# ── Request Models ────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    total_budget: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    total_budget: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[ProjectStatus] = None


# ── Response Models ───────────────────────────────────

class ProjectResponse(BaseModel):
    id: str
    org_id: str
    title: str
    description: Optional[str] = None
    total_budget: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: ProjectStatus
    progress_pct: Decimal = Decimal("0")
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ProjectSummary(BaseModel):
    """Lightweight project summary for list views."""
    id: str
    title: str
    status: ProjectStatus
    progress_pct: Decimal
    total_budget: Optional[Decimal] = None
    worksite_count: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectDetail(ProjectResponse):
    """Full project detail with nested worksites."""
    worksites: list = []       # List[WorksiteResponse] — circular import handled at runtime
    worksite_count: int = 0
    total_invoiced: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
