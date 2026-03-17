"""
Router — Template Library

CRUD endpoints for project templates.
Templates are org-scoped; system templates are read-only.

Endpoints:
  GET    /api/templates                     List templates
  GET    /api/templates/{id}                Get full template
  POST   /api/templates                     Create custom template
  PUT    /api/templates/{id}                Update template
  DELETE /api/templates/{id}                Archive (soft-delete)
  POST   /api/templates/{id}/duplicate      Duplicate (for customizing system templates)
  POST   /api/templates/from-project/{id}   Extract project skeleton as template

File: app/routers/templates.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.dependencies import get_providers
from app.db.interfaces.template_repository import ITemplateRepository
from app.services.template_service import TemplateService
from app.models.project_settings import (
    CreateTemplateRequest,
    UpdateTemplateRequest,
    CreateFromProjectRequest,
    TemplateListItem,
    ProjectTemplate,
)

router = APIRouter(
    prefix="/api/templates",
    tags=["Templates"],
)

# ── Dev org ID — same as other routers ────────────────────
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"


def _get_template_service(providers=Depends(get_providers)) -> TemplateService:
    """Build TemplateService from the ProviderRegistry."""
    return TemplateService(providers.templates)


# ═══════════════════════════════════════════════════════════
# LIST
# ═══════════════════════════════════════════════════════════

@router.get("", response_model=list[TemplateListItem])
async def list_templates(
    industry: Optional[str] = Query(None, description="Filter by industry"),
    search: Optional[str] = Query(None, description="Search by name"),
    include_system: bool = Query(True, description="Include system templates"),
    sort_by: str = Query("updated_at", pattern="^(updated_at|usage_count|name)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: TemplateService = Depends(_get_template_service),
):
    """
    List templates for the organization.

    Returns lightweight items (no scaffold_data) for the template grid.
    Includes system templates by default.
    """
    return await service.list_templates(
        org_id=DEV_ORG_ID,
        industry=industry,
        search=search,
        include_system=include_system,
        sort_by=sort_by,
        skip=skip,
        limit=limit,
    )


# ═══════════════════════════════════════════════════════════
# GET
# ═══════════════════════════════════════════════════════════

@router.get("/{template_id}", response_model=ProjectTemplate)
async def get_template(
    template_id: str,
    service: TemplateService = Depends(_get_template_service),
):
    """Get full template detail including scaffold_data."""
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return template


# ═══════════════════════════════════════════════════════════
# CREATE
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=ProjectTemplate, status_code=201)
async def create_template(
    request: CreateTemplateRequest,
    service: TemplateService = Depends(_get_template_service),
):
    """Create a new custom template."""
    return await service.create_template(
        org_id=DEV_ORG_ID,
        created_by=None,  # TODO: from auth
        request=request,
    )


# ═══════════════════════════════════════════════════════════
# UPDATE
# ═══════════════════════════════════════════════════════════

@router.put("/{template_id}", response_model=ProjectTemplate)
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    service: TemplateService = Depends(_get_template_service),
):
    """
    Update template fields. Increments version automatically.
    Only allowed for custom templates (not system).
    """
    try:
        return await service.update_template(template_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════
# ARCHIVE (soft delete)
# ═══════════════════════════════════════════════════════════

@router.delete("/{template_id}")
async def archive_template(
    template_id: str,
    service: TemplateService = Depends(_get_template_service),
):
    """
    Archive a template (soft-delete).
    Does not affect projects already created from this template.
    """
    success = await service.archive_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found or is a system template")
    return {"status": "archived", "template_id": template_id}


# ═══════════════════════════════════════════════════════════
# DUPLICATE
# ═══════════════════════════════════════════════════════════

@router.post("/{template_id}/duplicate", response_model=ProjectTemplate, status_code=201)
async def duplicate_template(
    template_id: str,
    service: TemplateService = Depends(_get_template_service),
):
    """
    Duplicate a template into the org as a new custom template.
    Useful for customizing system templates.
    """
    try:
        return await service.duplicate_template(
            template_id=template_id,
            org_id=DEV_ORG_ID,
            created_by=None,  # TODO: from auth
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════
# CREATE FROM PROJECT
# ═══════════════════════════════════════════════════════════

@router.post("/from-project/{project_id}", response_model=ProjectTemplate, status_code=201)
async def create_from_project(
    project_id: str,
    request: CreateFromProjectRequest,
    service: TemplateService = Depends(_get_template_service),
):
    """
    Extract a project's workgroup/job skeleton and save as a template.
    Strips project-specific data (dates, budgets, contractors).
    Converts budgets to percentages of total.
    """
    try:
        return await service.create_from_project(
            project_id=project_id,
            org_id=DEV_ORG_ID,
            created_by=None,  # TODO: from auth
            name=request.name,
            description=request.description,
            tags=request.tags,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
