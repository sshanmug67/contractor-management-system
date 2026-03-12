"""
Router — Worksites

CRUD for worksites within a project.
A worksite is a physical location (address) where work happens.

All database access goes through IWorksiteRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_worksite_repo
from app.db.interfaces import IWorksiteRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_worksites(
    project_id: Optional[str] = Query(None, description="Filter by project"),
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """List worksites, optionally filtered by project."""
    # TODO: repo.list_by_project(project_id) or repo.list_by_org(org_id)
    return []


@router.post("/", status_code=201)
async def create_worksite(
    data: dict,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Create a new worksite within a project."""
    # TODO: repo.create(data)
    pass


@router.get("/{worksite_id}")
async def get_worksite(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Get worksite detail with workgroups summary."""
    # TODO: repo.get_by_id(worksite_id)
    pass


@router.patch("/{worksite_id}")
async def update_worksite(
    worksite_id: str,
    updates: dict,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Update worksite fields."""
    # TODO: repo.update(worksite_id, updates)
    pass


@router.delete("/{worksite_id}", status_code=204)
async def delete_worksite(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Delete a worksite (only if no active workgroups)."""
    # TODO: repo.delete(worksite_id)
    pass


@router.get("/{worksite_id}/contacts")
async def list_worksite_contacts(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """List contacts assigned to this worksite."""
    # TODO: repo.get_contacts(worksite_id)
    return []


@router.post("/{worksite_id}/contacts", status_code=201)
async def assign_worksite_contact(
    worksite_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Assign a contact to this worksite."""
    # TODO: repo.assign_contact(worksite_id, data)
    pass


@router.delete("/{worksite_id}/contacts/{contact_id}", status_code=204)
async def remove_worksite_contact(
    worksite_id: str,
    contact_id: str,
    # user=Depends(get_current_user),
    repo: IWorksiteRepository = Depends(get_worksite_repo),
):
    """Remove a contact from this worksite."""
    # TODO: repo.remove_contact(worksite_id, contact_id)
    pass
