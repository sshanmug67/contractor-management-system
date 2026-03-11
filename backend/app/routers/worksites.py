"""
Router — Worksites

CRUD for worksites within a project.
Manages contact persons (business employees) and geo-fence settings.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.worksite import (
    WorksiteCreate, WorksiteUpdate, WorksiteContactAssign,
    WorksiteResponse, WorksiteDetail, WorksiteContactResponse,
)

router = APIRouter()


@router.get("/", response_model=list[WorksiteResponse])
async def list_worksites(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List worksites, optionally filtered by project."""
    # TODO: Query worksites with org scoping via project
    return []


@router.post("/", response_model=WorksiteResponse, status_code=201)
async def create_worksite(
    worksite: WorksiteCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a new worksite within a project."""
    # TODO: Validate project belongs to user's org
    # TODO: Insert worksite
    # TODO: Geocode address → set geo_latitude/geo_longitude if not provided
    pass


@router.get("/{worksite_id}", response_model=WorksiteDetail)
async def get_worksite(
    worksite_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get full worksite detail with contacts and workgroups."""
    # TODO: Fetch worksite + contacts + workgroup summaries
    pass


@router.patch("/{worksite_id}", response_model=WorksiteResponse)
async def update_worksite(
    worksite_id: str,
    updates: WorksiteUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update worksite fields including geo-fence settings."""
    # TODO: Update worksite record
    pass


@router.delete("/{worksite_id}", status_code=204)
async def delete_worksite(
    worksite_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a worksite (only if no active workgroups)."""
    pass


# ── Contact Person Management ─────────────────────────

@router.post("/{worksite_id}/contacts", response_model=WorksiteContactResponse, status_code=201)
async def assign_contact(
    worksite_id: str,
    assignment: WorksiteContactAssign,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Assign a business employee as contact person for this worksite."""
    # TODO: Validate employee belongs to same org
    # TODO: Insert into worksite_contacts (junction table)
    # TODO: Enforce: at least one PRIMARY contact per worksite
    pass


@router.get("/{worksite_id}/contacts", response_model=list[WorksiteContactResponse])
async def list_contacts(
    worksite_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all contact persons for a worksite."""
    return []


@router.delete("/{worksite_id}/contacts/{employee_id}", status_code=204)
async def remove_contact(
    worksite_id: str,
    employee_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Remove a contact person from a worksite."""
    # TODO: Prevent removing last primary contact
    pass
