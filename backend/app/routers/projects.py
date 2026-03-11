"""
Router — Projects

CRUD for projects within an organization.
Status cascade: when all worksites complete → project complete.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.project import (
    ProjectCreate, ProjectUpdate,
    ProjectResponse, ProjectSummary, ProjectDetail,
)

router = APIRouter()


@router.get("/", response_model=list[ProjectSummary])
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = 0,
    limit: int = 20,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all projects for the current user's organization."""
    # TODO: Query projects WHERE org_id = user.org_id
    # TODO: Apply status filter if provided
    # TODO: Include worksite_count via subquery or join
    return []


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a new project. AI suggests worksite breakdown."""
    # TODO: Insert into projects with org_id from user
    # TODO: Set created_by = user.id
    # TODO: Optionally trigger AI worksite suggestion
    pass


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get full project detail with worksites and progress."""
    # TODO: Fetch project + nested worksites + workgroups summary
    # TODO: Calculate total_invoiced, total_paid
    pass


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update project fields. Status changes trigger cascading logic."""
    # TODO: Update project record
    # TODO: If status changed → audit log
    pass


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a project (only if draft/cancelled, no active workgroups)."""
    # TODO: Validate project can be deleted
    # TODO: CASCADE deletes worksites → workgroups → jobs
    pass


@router.get("/{project_id}/progress")
async def get_project_progress(
    project_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get detailed progress breakdown: worksites → workgroups → jobs."""
    # TODO: Build status cascade tree (Part 2 of spec)
    return {}
