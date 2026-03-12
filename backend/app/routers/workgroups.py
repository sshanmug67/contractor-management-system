"""
Router — Workgroups

CRUD for workgroups within a worksite.
A workgroup is a trade assignment (e.g., "Roofing at 123 Main St").
Allocation and dependency management included.

All database access goes through IWorkgroupRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_workgroup_repo
from app.db.interfaces import IWorkgroupRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_workgroups(
    worksite_id: Optional[str] = Query(None, description="Filter by worksite"),
    status: Optional[str] = Query(None, description="Filter by status"),
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """List workgroups, optionally filtered by worksite or status."""
    # TODO: repo.list_by_worksite(worksite_id) or repo.list_by_org(org_id)
    return []


@router.post("/", status_code=201)
async def create_workgroup(
    data: dict,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Create a new workgroup within a worksite."""
    # TODO: repo.create(data)
    pass


@router.get("/{workgroup_id}")
async def get_workgroup(
    workgroup_id: str,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Get workgroup detail with jobs and dependency info."""
    # TODO: repo.get_by_id(workgroup_id)
    pass


@router.patch("/{workgroup_id}")
async def update_workgroup(
    workgroup_id: str,
    updates: dict,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Update workgroup fields."""
    # TODO: repo.update(workgroup_id, updates)
    pass


@router.delete("/{workgroup_id}", status_code=204)
async def delete_workgroup(
    workgroup_id: str,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Delete a workgroup (only if draft, no active jobs)."""
    # TODO: repo.delete(workgroup_id)
    pass


@router.post("/{workgroup_id}/allocate", status_code=200)
async def allocate_workgroup(
    workgroup_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """
    Allocate a workgroup to a contractor.
    Pattern 2 (async): immediate status write + fire qr_worker.delay().
    """
    # TODO: repo.update_status(workgroup_id, 'allocated')
    # TODO: qr_worker.delay(workgroup_id, contractor_id)
    pass


@router.post("/{workgroup_id}/accept")
async def accept_workgroup(
    workgroup_id: str,
    # worker=Depends(get_current_worker),  # Contractor auth
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Contractor accepts workgroup allocation."""
    # TODO: repo.update_status(workgroup_id, 'accepted')
    # TODO: notification_worker.delay('contractor_accepted', ...)
    pass


@router.post("/{workgroup_id}/reject")
async def reject_workgroup(
    workgroup_id: str,
    # worker=Depends(get_current_worker),  # Contractor auth
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Contractor rejects workgroup allocation."""
    # TODO: repo.update_status(workgroup_id, 'rejected')
    # TODO: notification_worker.delay('contractor_rejected', ...)
    pass


@router.get("/{workgroup_id}/dependencies")
async def get_dependencies(
    workgroup_id: str,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Get dependency chain for this workgroup."""
    # TODO: repo.get_dependencies(workgroup_id)
    return []


@router.post("/{workgroup_id}/dependencies", status_code=201)
async def add_dependency(
    workgroup_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Add a dependency (this workgroup depends on another)."""
    # TODO: repo.add_dependency(workgroup_id, data['depends_on_workgroup_id'])
    pass


@router.get("/{workgroup_id}/progress")
async def get_workgroup_progress(
    workgroup_id: str,
    # user=Depends(get_current_user),
    repo: IWorkgroupRepository = Depends(get_workgroup_repo),
):
    """Get progress breakdown: jobs completion status."""
    # TODO: repo.get_progress(workgroup_id)
    return {}
