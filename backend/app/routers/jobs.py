"""
Router — Jobs

CRUD + status transitions + checklists + dependencies.
Jobs are the atomic work units within a Workgroup.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user, get_current_worker
from app.models.job import (
    JobCreate, JobUpdate, JobDependencyCreate, ChecklistItemUpdate,
    JobResponse, JobDetail, JobDependencyResponse,
)

router = APIRouter()


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    workgroup_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List jobs, optionally filtered by workgroup."""
    return []


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(
    job: JobCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a job within a workgroup."""
    # TODO: Validate workgroup belongs to user's org
    # TODO: Insert job
    pass


@router.get("/{job_id}", response_model=JobDetail)
async def get_job(
    job_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get full job detail with checklist, uploads, dependencies."""
    pass


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    updates: JobUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update job fields. Status changes trigger progress recalculation."""
    # TODO: Update job
    # TODO: If status changed → recalculate workgroup progress
    # TODO: If status = 'complete' → check dependencies, prompt invoice
    pass


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a job (only if not_started and not invoiced)."""
    pass


# ── Status Transitions (Contractor Side) ──────────────

@router.post("/{job_id}/start", response_model=JobResponse)
async def start_job(
    job_id: str,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """Mark a job as in-progress. Requires active check-in."""
    # TODO: Validate worker has checked in to worksite
    # TODO: Check job dependencies are satisfied
    # TODO: Update status → 'in_progress'
    pass


@router.post("/{job_id}/complete", response_model=JobResponse)
async def complete_job(
    job_id: str,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """Mark a job as complete. Triggers dependency checks."""
    # TODO: Validate required photos/checklist items
    # TODO: Update status → 'complete'
    # TODO: Recalculate workgroup/worksite/project progress
    # TODO: Check if this unblocks dependent jobs
    # TODO: Notify owner + contacts
    pass


# ── Checklists ────────────────────────────────────────

@router.get("/{job_id}/checklist")
async def get_checklist(
    job_id: str,
    db=Depends(get_db),
):
    """Get the checklist for a job."""
    # TODO: Query checklists WHERE job_id
    return {}


@router.patch("/{job_id}/checklist")
async def update_checklist_item(
    job_id: str,
    update: ChecklistItemUpdate,
    db=Depends(get_db),
):
    """Update a checklist item (check/uncheck)."""
    # TODO: Update items JSONB array at the given index
    pass


# ── Job Dependencies ──────────────────────────────────

@router.post("/{job_id}/dependencies", response_model=JobDependencyResponse, status_code=201)
async def add_job_dependency(
    job_id: str,
    dep: JobDependencyCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add a dependency: this job depends on another job (within same workgroup)."""
    # TODO: Validate both jobs in same workgroup
    # TODO: Prevent circular dependencies
    pass


@router.get("/{job_id}/dependencies", response_model=list[JobDependencyResponse])
async def list_job_dependencies(
    job_id: str,
    db=Depends(get_db),
):
    """List dependencies for a job."""
    return []
