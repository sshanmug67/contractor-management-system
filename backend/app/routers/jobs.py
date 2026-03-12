"""
Router — Jobs

CRUD for jobs within a workgroup.
Jobs are the atomic unit of work. Status changes trigger progress cascade.

All database access goes through IJobRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_job_repo
from app.db.interfaces import IJobRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_jobs(
    workgroup_id: Optional[str] = Query(None, description="Filter by workgroup"),
    status: Optional[str] = Query(None, description="Filter by status"),
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """List jobs, optionally filtered by workgroup."""
    # TODO: repo.list_by_workgroup(workgroup_id)
    return []


@router.post("/", status_code=201)
async def create_job(
    data: dict,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Create a new job within a workgroup."""
    # TODO: repo.create(data)
    pass


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Get job detail with checklist and invoice status."""
    # TODO: repo.get_by_id(job_id)
    pass


@router.patch("/{job_id}")
async def update_job(
    job_id: str,
    updates: dict,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Update job fields (title, budget, duration, etc.)."""
    # TODO: repo.update(job_id, updates)
    pass


@router.post("/{job_id}/status")
async def update_job_status(
    job_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """
    Change job status. Triggers progress cascade on completion.
    Pattern 2 (async): immediate write + progress_worker.delay().
    """
    # TODO: repo.update_status(job_id, data['status'])
    # TODO: If status == 'complete':
    #   progress_worker.delay(job_id)
    pass


@router.post("/{job_id}/start")
async def start_job(
    job_id: str,
    # worker=Depends(get_current_worker),  # Contractor auth
    repo: IJobRepository = Depends(get_job_repo),
):
    """Contractor starts work on a job."""
    # TODO: repo.update_status(job_id, 'in_progress')
    pass


@router.post("/{job_id}/complete")
async def complete_job(
    job_id: str,
    # worker=Depends(get_current_worker),  # Contractor auth
    repo: IJobRepository = Depends(get_job_repo),
):
    """
    Contractor marks job complete.
    Pattern 2 (async): update status + fire progress_worker.delay().
    """
    # TODO: repo.update_status(job_id, 'complete')
    # TODO: progress_worker.delay(job_id)
    pass


@router.get("/{job_id}/checklist")
async def get_checklist(
    job_id: str,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Get the checklist items for a job."""
    # TODO: repo.get_checklist(job_id)
    return []


@router.patch("/{job_id}/checklist")
async def update_checklist(
    job_id: str,
    data: dict,
    # worker=Depends(get_current_worker),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Update checklist item status (contractor checks off items)."""
    # TODO: repo.update_checklist(job_id, data)
    pass


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    # user=Depends(get_current_user),
    repo: IJobRepository = Depends(get_job_repo),
):
    """Delete a job (only if not started)."""
    # TODO: repo.delete(job_id)
    pass
