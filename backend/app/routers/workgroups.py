"""
Router — Workgroups

CRUD + contractor allocation + accept/reject + dependency management.
Core of the CMS workflow — this is where contractors get assigned.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user, get_current_worker
from app.models.workgroup import (
    WorkgroupCreate, WorkgroupUpdate, WorkgroupAllocate,
    WorkgroupAcceptReject, WorkgroupDependencyCreate,
    WorkgroupResponse, WorkgroupDetail, WorkgroupDependencyResponse,
)
from app.models.contractor import ContractorScoreResult

router = APIRouter()


@router.get("/", response_model=list[WorkgroupResponse])
async def list_workgroups(
    worksite_id: Optional[str] = Query(None),
    contractor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List workgroups with optional filters."""
    return []


@router.post("/", response_model=WorkgroupResponse, status_code=201)
async def create_workgroup(
    workgroup: WorkgroupCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a workgroup within a worksite."""
    # TODO: Validate worksite belongs to user's org
    # TODO: Insert workgroup
    # TODO: AI suggests job breakdown + budget allocation
    pass


@router.get("/{workgroup_id}", response_model=WorkgroupDetail)
async def get_workgroup(
    workgroup_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get full workgroup detail with jobs, invoices, and site presence."""
    pass


@router.patch("/{workgroup_id}", response_model=WorkgroupResponse)
async def update_workgroup(
    workgroup_id: str,
    updates: WorkgroupUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update workgroup fields."""
    pass


@router.delete("/{workgroup_id}", status_code=204)
async def delete_workgroup(
    workgroup_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a workgroup (only if draft, no active work)."""
    pass


# ── Contractor Allocation ─────────────────────────────

@router.post("/{workgroup_id}/allocate", response_model=WorkgroupResponse)
async def allocate_contractor(
    workgroup_id: str,
    allocation: WorkgroupAllocate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Allocate a contractor to this workgroup.
    
    Triggers:
    - QR token generation
    - SMS + Email notification to contractor (with QR code/link)
    - Status → 'pending'
    """
    # TODO: Validate contractor exists and is active
    # TODO: Update workgroup.contractor_id
    # TODO: Generate QR token (services/qr_generator.py)
    # TODO: Send notification (services/notification.py)
    # TODO: Set status = 'pending'
    pass


@router.get("/{workgroup_id}/recommend", response_model=list[ContractorScoreResult])
async def recommend_contractors(
    workgroup_id: str,
    limit: int = Query(5, ge=1, le=20),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """AI-scored contractor recommendations for this workgroup."""
    # TODO: Call services/allocation.py → score_contractors()
    # TODO: Return ranked list with scores per factor
    return []


# ── Accept / Reject (Contractor Side) ─────────────────

@router.post("/{workgroup_id}/respond", response_model=WorkgroupResponse)
async def accept_or_reject(
    workgroup_id: str,
    response: WorkgroupAcceptReject,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """
    Contractor accepts or rejects a workgroup assignment.
    
    Accept → status: 'in_progress', notify owner + contacts, start monitoring
    Reject → status: 'rejected', invalidate QR, notify owner, suggest alternative
    """
    # TODO: Validate worker belongs to this workgroup's contractor
    # TODO: Record accepted_by / accepted_at
    # TODO: Handle accept vs reject logic
    # TODO: Trigger notifications
    pass


# ── Dependencies ──────────────────────────────────────

@router.post("/{workgroup_id}/dependencies", response_model=WorkgroupDependencyResponse, status_code=201)
async def add_dependency(
    workgroup_id: str,
    dep: WorkgroupDependencyCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add a dependency: this workgroup depends on another workgroup."""
    # TODO: Validate both workgroups exist (can be cross-worksite)
    # TODO: Prevent circular dependencies
    # TODO: Insert into workgroup_dependencies
    pass


@router.get("/{workgroup_id}/dependencies", response_model=list[WorkgroupDependencyResponse])
async def list_dependencies(
    workgroup_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all dependencies for a workgroup."""
    return []


@router.delete("/{workgroup_id}/dependencies/{dependency_id}", status_code=204)
async def remove_dependency(
    workgroup_id: str,
    dependency_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Remove a workgroup dependency."""
    pass
