"""
Router — Projects

CRUD for projects within an organization.
Status cascade: when all worksites complete → project complete.

All database access goes through IProjectRepository via ProviderRegistry.
This router works identically with Supabase or self-hosted PostgreSQL.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_project_repo
from app.db.interfaces import IProjectRepository
from app.models.project import (
    ProjectCreate, ProjectUpdate,
    ProjectResponse, ProjectSummary, ProjectDetail,
)

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/", response_model=list[ProjectSummary])
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = 0,
    limit: int = 20,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """List all projects for the current user's organization."""
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id
    # TODO: Apply status filter if provided
    # TODO: Include worksite_count via subquery or join
    return []


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """Create a new project. AI suggests worksite breakdown."""
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id
    # TODO: Insert via repo.create(org_id, project)
    # TODO: Set created_by = user.id
    # TODO: Optionally trigger AI worksite suggestion
    pass


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """Get full project detail with worksites and progress."""
    # TODO: Fetch via repo.get_by_id(project_id)
    # TODO: Calculate total_invoiced, total_paid
    pass


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """Update project fields. Status changes trigger cascading logic."""
    # TODO: Update via repo.update(project_id, updates)
    # TODO: If status changed → audit log
    pass


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """Delete a project (only if draft/cancelled, no active workgroups)."""
    # TODO: Validate project can be deleted
    # TODO: CASCADE deletes worksites → workgroups → jobs
    pass


@router.get("/{project_id}/progress")
async def get_project_progress(
    project_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: IProjectRepository = Depends(get_project_repo),
):
    """Get detailed progress breakdown: worksites → workgroups → jobs."""
    # TODO: Build status cascade tree (Part 2 of spec)
    return {}
