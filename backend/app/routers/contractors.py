"""
Router — Contractors

Manage the contractor pool for an organization.
CRUD + skills search + verification status + performance.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.contractor import (
    ContractorCreate, ContractorUpdate,
    ContractorResponse, ContractorDetail,
)
from app.models.worker import WorkerResponse, WorkerActivity

router = APIRouter()


@router.get("/", response_model=list[ContractorResponse])
async def list_contractors(
    skills: Optional[str] = Query(None, description="Comma-separated skill filter"),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, description="Search by company name"),
    skip: int = 0,
    limit: int = 20,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List contractors in the organization's pool."""
    # TODO: Query contractors WHERE org_id, apply filters
    # TODO: Skills filter uses GIN index on skills array
    return []


@router.post("/", response_model=ContractorResponse, status_code=201)
async def create_contractor(
    contractor: ContractorCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Register a new contractor company."""
    # TODO: Insert contractor with org_id from user
    # TODO: Trigger initial verification check
    pass


@router.get("/{contractor_id}", response_model=ContractorDetail)
async def get_contractor(
    contractor_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get full contractor detail with workers, workgroups, verifications."""
    pass


@router.patch("/{contractor_id}", response_model=ContractorResponse)
async def update_contractor(
    contractor_id: str,
    updates: ContractorUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update contractor details."""
    pass


@router.delete("/{contractor_id}", status_code=204)
async def deactivate_contractor(
    contractor_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Deactivate a contractor (soft delete — sets is_active=False)."""
    pass


# ── Workers (Read-only from business side) ────────────

@router.get("/{contractor_id}/workers", response_model=list[WorkerResponse])
async def list_workers(
    contractor_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List self-identified workers for a contractor company."""
    return []


@router.get("/{contractor_id}/workers/{worker_id}/activity", response_model=WorkerActivity)
async def get_worker_activity(
    contractor_id: str,
    worker_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get activity summary for a specific worker."""
    pass


# ── Verification ──────────────────────────────────────

@router.post("/{contractor_id}/verify")
async def trigger_verification(
    contractor_id: str,
    verification_type: str = Query(..., description="license|insurance|bbb"),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Trigger an external verification check for a contractor."""
    # TODO: Call services/contractor_verifier.py
    # TODO: Create contractor_verifications record
    pass


@router.get("/{contractor_id}/verifications")
async def list_verifications(
    contractor_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all verification records for a contractor."""
    return []
