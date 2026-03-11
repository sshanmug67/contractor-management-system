"""
Pydantic Models — Business Employee

Contact persons for Worksites. Assigned as primary/secondary.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Request Models ────────────────────────────────────

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None          # e.g., "Project Manager", "Site Supervisor"

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ── Response Models ───────────────────────────────────

class EmployeeResponse(BaseModel):
    id: str
    org_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class EmployeeDetail(EmployeeResponse):
    """Employee with their worksite assignments."""
    assigned_worksites: list = []       # List of { worksite_id, name, contact_role }
