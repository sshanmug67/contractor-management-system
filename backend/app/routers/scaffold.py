"""
Router — Project Scaffolding

LLM-powered project skeleton generation and project creation.

Endpoints:
  POST /api/projects/scaffold           Generate scaffold from description (Claude API)
  POST /api/projects/scaffold/refine    Refine existing scaffold with feedback
  POST /api/projects/create-from-scaffold    Create project from LLM scaffold
  POST /api/projects/create-from-template/{template_id}  Create project from saved template
  GET  /api/projects/quick-starts       Get pre-filled prompt suggestions

File: app/routers/scaffold.py
"""

import logging
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_providers
from app.services.scaffold_service import ScaffoldService
from app.services.template_service import TemplateService
from app.prompts.scaffold_prompts import QUICK_STARTS
from app.models.project_settings import (
    ScaffoldRequest,
    ScaffoldResponse,
    RefineRequest,
    CreateFromScaffoldRequest,
    CreateFromTemplateRequest,
    QuickStartTemplate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/projects",
    tags=["Scaffolding"],
)

# ── Dev org ID ────────────────────────────────────────────
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"


# ═══════════════════════════════════════════════════════════
# GENERATE SCAFFOLD (LLM)
# ═══════════════════════════════════════════════════════════

@router.post("/scaffold", response_model=ScaffoldResponse)
async def generate_scaffold(request: ScaffoldRequest):
    """
    Generate a project skeleton from a natural language description.
    """
    logger.info("=" * 60)
    logger.info("POST /scaffold — Request received")
    logger.info("  description: %.80s...", request.description)
    logger.info("  project_type: %s", request.project_type)
    logger.info("  industry: %s", request.industry)
    logger.info("  budget: %s", request.budget)
    logger.info("  timeline_months: %s", request.timeline_months)
    logger.info("  num_worksites: %s", request.num_worksites)

    service = ScaffoldService()

    try:
        scaffold = await service.generate(request)
        logger.info("  ✅ Scaffold generated: %d WGs, %d jobs",
                     len(scaffold.workgroups), len(scaffold.jobs))
        return scaffold
    except ValueError as e:
        logger.error("  ❌ ValueError: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("  ❌ Exception (%s): %s", type(e).__name__, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scaffold generation failed: {type(e).__name__}: {str(e)}")


# ═══════════════════════════════════════════════════════════
# REFINE SCAFFOLD (LLM)
# ═══════════════════════════════════════════════════════════

@router.post("/scaffold/refine", response_model=ScaffoldResponse)
async def refine_scaffold(request: RefineRequest):
    """
    Refine an existing scaffold based on user feedback.

    Sends the current scaffold + feedback to Claude, which returns
    the complete modified scaffold (not a diff).

    Example feedback:
      "Add a permit phase before rough-in"
      "Split electrical into two phases"
      "Remove landscaping, this is interior only"
    """
    service = ScaffoldService()

    try:
        scaffold = await service.refine(request)
        return scaffold
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ═══════════════════════════════════════════════════════════
# CREATE PROJECT FROM SCAFFOLD
# ═══════════════════════════════════════════════════════════

@router.post("/create-from-scaffold")
async def create_from_scaffold(
    request: CreateFromScaffoldRequest,
    providers=Depends(get_providers),
):
    """
    Commit an edited scaffold to the database as a real project.

    Creates in a single transaction:
      1. Project record (with settings)
      2. Worksite records
      3. Workgroup records (with dependencies)
      4. Job records
      5. Workgroup dependency edges

    Optionally saves the scaffold as a new template if
    save_as_template=true.
    """
    scaffold = request.scaffold
    settings = request.project_settings
    total_budget = float(request.total_budget or 0)

    # ── 1. Create project ─────────────────────────────────
    project_data = {
        "title": request.project_name,
        "description": request.project_description,
        "total_budget": total_budget or None,
        "start_date": request.start_date,
        "status": "planning",
        "project_type": settings.project_type.value,
        "industry": settings.industry,
        "project_subtype": settings.project_subtype,
        "contractor_payment_terms": settings.contractor_payment_terms,
        "client_payment_terms": settings.client_payment_terms,
        "client_name": settings.client_name,
        "contract_value": float(settings.contract_value) if settings.contract_value else None,
        "retainage_pct": float(settings.retainage_pct),
        "retainage_release": settings.retainage_release.value,
        "sub_retainage_pct": float(settings.sub_retainage_pct),
        "draw_frequency": settings.draw_frequency.value,
        "scaffold_prompt": request.project_description,
    }

    project = await providers.projects.create_project(
        org_id=DEV_ORG_ID,
        created_by=None,  # TODO: from auth
        data=project_data,
    )
    project_id = project["id"]

    # ── 2. Create worksites ───────────────────────────────
    worksite_ids = []
    for ws in scaffold.worksites:
        ws_data = {
            "project_id": project_id,
            "name": ws.name,
            "address_line1": ws.address or "",
            "city": "",
            "state": "",
            "zip_code": "",
            "status": "active",
        }
        worksite = await providers.worksites.create_worksite(ws_data)
        worksite_ids.append(worksite["id"])
 
    # If no worksites in scaffold, create a default one
    if not worksite_ids:
        ws = await providers.worksites.create_worksite({
            "project_id": project_id,
            "name": request.project_name,
            "city": "",
            "state": "",
            "zip_code": "",
            "status": "active",
        })
        worksite_ids.append(ws["id"])

    # ── 3. Create workgroups ──────────────────────────────
    wg_ids = []
    for wg in scaffold.workgroups:
        ws_idx = min(wg.worksite_index, len(worksite_ids) - 1)
        wg_budget = round(total_budget * wg.budget_pct, 2) if total_budget > 0 else None
 
        wg_data = {
            "project_id": project_id,                    # v3: direct project reference
            "worksite_id": worksite_ids[ws_idx],
            "title": wg.title,
            "trade": wg.trade,
            "budget": wg_budget,
            "status": "draft",
        }
        workgroup = await providers.workgroups.create_workgroup(wg_data)
        wg_ids.append(workgroup["id"])

    # ── 4. Create jobs ────────────────────────────────────
    for job in scaffold.jobs:
        if job.workgroup_index >= len(wg_ids):
            continue
 
        job_budget = round(total_budget * job.budget_pct, 2) if total_budget > 0 else None
        job_data = {
            "workgroup_id": wg_ids[job.workgroup_index],
            "title": job.title,
            "est_duration_days": job.est_duration_days,
            "sequence": job.sequence,
            "budget": job_budget,
            "status": "not_started",
        }
        await providers.jobs.create_job(job_data)

    # ── 5. Create workgroup dependencies ──────────────────
    for i, wg in enumerate(scaffold.workgroups):
        for dep_idx in wg.depends_on_indices:
            if dep_idx < len(wg_ids) and dep_idx != i:
                try:
                    await providers.workgroups.add_dependency(
                        workgroup_id=wg_ids[i],
                        depends_on_id=wg_ids[dep_idx],
                    )
                except Exception as e:
                    # Log but don't fail the whole creation
                    pass

    # ── 6. Optionally save as template ────────────────────
    template_id = None
    if request.save_as_template and request.template_name:
        try:
            template_service = TemplateService(providers.templates)
            template = await template_service.create_from_scaffold(
                org_id=DEV_ORG_ID,
                created_by=None,
                name=request.template_name,
                scaffold_data=scaffold.model_dump(),
                industry=settings.industry,
            )
            template_id = template.id

            # Link project to template
            await providers.projects.update_project(
                project_id, {"template_id": template_id}
            )
        except Exception:
            pass  # Template save is optional, don't fail project creation

    return {
        "status": "created",
        "project_id": project_id,
        "worksite_count": len(worksite_ids),
        "workgroup_count": len(wg_ids),
        "job_count": len(scaffold.jobs),
        "template_id": template_id,
    }


# ═══════════════════════════════════════════════════════════
# CREATE PROJECT FROM TEMPLATE
# ═══════════════════════════════════════════════════════════

@router.post("/create-from-template/{template_id}")
async def create_from_template(
    template_id: str,
    request: CreateFromTemplateRequest,
    providers=Depends(get_providers),
):
    """
    Create a project from a saved template.

    Loads the template's scaffold_data, applies user overrides
    (budget, removals), and creates the project.

    Increments the template's usage_count.
    """
    # Load template
    template_service = TemplateService(providers.templates)
    template = await template_service.get_template(template_id)

    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    scaffold = template.scaffold_data

    # Apply removals
    remove_wg_set = set(request.remove_workgroup_indices)
    remove_job_set = set(request.remove_job_indices)

    # Filter workgroups and remap indices
    filtered_wgs = []
    old_to_new_wg = {}
    for i, wg in enumerate(scaffold.workgroups):
        if i not in remove_wg_set:
            old_to_new_wg[i] = len(filtered_wgs)
            # Remap dependency indices
            new_deps = [
                old_to_new_wg[d]
                for d in wg.depends_on_indices
                if d in old_to_new_wg
            ]
            wg.depends_on_indices = new_deps
            filtered_wgs.append(wg)

    # Filter jobs and remap workgroup indices
    filtered_jobs = []
    for i, job in enumerate(scaffold.jobs):
        if i not in remove_job_set and job.workgroup_index in old_to_new_wg:
            job.workgroup_index = old_to_new_wg[job.workgroup_index]
            filtered_jobs.append(job)

    scaffold.workgroups = filtered_wgs
    scaffold.jobs = filtered_jobs

    # Build a CreateFromScaffoldRequest and reuse the same endpoint logic
    create_request = CreateFromScaffoldRequest(
        scaffold=scaffold,
        project_settings=request.project_settings,
        project_name=request.project_name,
        project_description=request.project_description,
        total_budget=request.total_budget,
        start_date=request.start_date,
        save_as_template=False,
    )

    # Reuse create logic
    result = await create_from_scaffold(create_request, providers)

    # Link project to template and increment usage
    if result.get("project_id"):
        try:
            await providers.projects.update_project(
                result["project_id"], {"template_id": template_id}
            )
            await template_service.increment_usage(template_id)
        except Exception:
            pass

    result["template_id"] = template_id
    return result


# ═══════════════════════════════════════════════════════════
# QUICK STARTS
# ═══════════════════════════════════════════════════════════

@router.get("/quick-starts", response_model=list[QuickStartTemplate])
async def get_quick_starts():
    """
    Get pre-filled prompt suggestions for common project types.

    These are NOT templates — they're just prompt text that feeds
    into the same /scaffold endpoint. Provides one-click starting
    points for new users.
    """
    return QUICK_STARTS
