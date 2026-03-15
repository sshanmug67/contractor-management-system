"""
Router — Dependency Analysis Endpoints

Provides endpoints for dependency management and graph analysis:
  POST /preview          Preview impact of proposed changes
  POST /apply            Apply validated changes
  POST /scenarios        Run what-if scenario simulation
  GET  /graph/{id}       Get project graph (for frontend cache)
  GET  /health/{id}      Get health snapshot
  GET  /criticality/{id} Get criticality ranking

All endpoints follow Pattern 2 from the Dashboard Cache Architecture:
  - Router handles HTTP, fetches graph via ProviderRegistry
  - Calls DependencyService (pure logic, no DB)
  - Returns result to frontend or fires background tasks

File: app/routers/dependency_changes.py
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_providers
from app.models.dependency import (
    ProjectGraph,
    BatchChange,
    ScenarioRequest,
    AnalysisResponse,
    ScenarioReport,
    HealthSnapshot,
    CriticalityReport,
)
from app.services.dependency_analyzer import DependencyService


router = APIRouter(
    prefix="/api/dependencies",
    tags=["dependencies"],
)


# ── Helper: fetch graph and build service ─────────────────

async def _get_service(project_id: str, providers) -> tuple[DependencyService, ProjectGraph]:
    """
    Fetch the project graph from the database via ProviderRegistry
    and construct the DependencyService.

    This is the ONLY place where the database is touched.
    The DependencyService itself is pure.
    """
    graph_dict = await providers.dashboard.get_project_graph(project_id)

    if not graph_dict or not graph_dict.get("workgroups"):
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found or has no workgroups.",
        )

    graph = ProjectGraph(**graph_dict)
    service = DependencyService(graph)
    return service, graph


# ══════════════════════════════════════════════════════════════
# CHANGE VALIDATION: Preview + Apply
# ══════════════════════════════════════════════════════════════


@router.post("/preview", response_model=AnalysisResponse)
async def preview_changes(
    batch: BatchChange,
    providers=Depends(get_providers),
):
    """
    Preview the impact of proposed dependency changes.

    The frontend calls this when the user clicks "Preview Impact"
    in the Manage Project UI after staging changes.

    Returns validation result (pass/fail) + impact analysis
    (timeline shifts, critical path changes, affected entities).

    Does NOT modify the database. Pure analysis only.
    """
    service, graph = await _get_service(batch.project_id, providers)
    result = service.validate_changes(batch)

    if not result.validation.valid:
        raise HTTPException(
            status_code=409,
            detail=result.validation.model_dump(),
        )

    return result


@router.post("/apply")
async def apply_changes(
    batch: BatchChange,
    providers=Depends(get_providers),
):
    """
    Apply validated dependency changes to the database.

    Re-validates (graph may have changed since preview), then
    writes changes and fires background cascade.

    Flow:
      1. Fetch fresh graph (may have changed since preview)
      2. Re-validate all changes
      3. Write each change to the database
      4. Fire background cascade worker
      5. Return success

    Pattern 2: immediate write + async side effects.
    """
    service, graph = await _get_service(batch.project_id, providers)
    result = service.validate_changes(batch)

    if not result.validation.valid:
        raise HTTPException(
            status_code=409,
            detail=result.validation.model_dump(),
        )

    # Apply each change to the database
    applied_count = 0
    for change in batch.changes:
        await _apply_change_to_db(providers, change)
        applied_count += 1

    # Fire background cascade (invalidate cache, recalc progress, notify)
    try:
        from app.workers.dependency_worker import process_cascade
        process_cascade.delay(batch.project_id)
    except ImportError:
        pass  # Worker not yet implemented

    return {
        "status": "applied",
        "change_count": applied_count,
        "project_id": batch.project_id,
    }


async def _apply_change_to_db(providers, change):
    """
    Persist a single validated change to the database.

    Uses the appropriate repository methods from ProviderRegistry.
    Each change type maps to a specific repository call.
    """
    if change.action == "add_wg_dep":
        await providers.workgroups.add_dependency(
            workgroup_id=change.to_id,          # dependent
            depends_on_id=change.from_id,       # predecessor
        )
    elif change.action == "remove_wg_dep":
        # Find the dependency record by from/to
        deps = await providers.workgroups.get_dependencies(change.to_id)
        for dep in deps:
            dep_on = dep.get("depends_on_workgroup_id") or dep.get("depends_on", {}).get("id", "")
            if dep_on == change.from_id:
                await providers.workgroups.remove_dependency(dep["id"])
                break

    elif change.action == "add_job_dep":
        await providers.jobs.add_dependency(
            job_id=change.to_id,
            depends_on_id=change.from_id,
        )
    elif change.action == "remove_job_dep":
        deps = await providers.jobs.get_dependencies(change.to_id)
        for dep in deps:
            dep_on = dep.get("depends_on_job_id", "")
            if dep_on == change.from_id:
                await providers.jobs.remove_dependency(dep["id"])
                break

    elif change.action == "remove_workgroup":
        await providers.workgroups.delete_workgroup(change.target_id)
    elif change.action == "remove_job":
        await providers.jobs.delete_job(change.target_id)

    elif change.action == "add_workgroup" and change.data:
        await providers.workgroups.create_workgroup(change.data)
    elif change.action == "add_job" and change.data:
        await providers.jobs.create_job(change.data)


# ══════════════════════════════════════════════════════════════
# SCENARIO SIMULATION
# ══════════════════════════════════════════════════════════════


@router.post("/scenarios", response_model=ScenarioReport)
async def run_scenarios(
    request: ScenarioRequest,
    providers=Depends(get_providers),
):
    """
    Run what-if delay scenarios and compare results.

    The frontend sends one or more scenarios, each with delay
    assumptions on specific workgroups/jobs. The service simulates
    the ripple effect and returns per-scenario impact + comparison.

    This is a read-only analysis — no database changes.
    """
    service, graph = await _get_service(request.project_id, providers)
    report = service.simulate_scenarios(request.scenarios)
    return report


# ══════════════════════════════════════════════════════════════
# GRAPH + ANALYSIS ENDPOINTS
# ══════════════════════════════════════════════════════════════


@router.get("/graph/{project_id}")
async def get_project_graph(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return the raw ProjectGraph for a project.

    Used by the frontend to cache the graph locally so it can
    send it back to preview/scenario endpoints without a round trip.
    Also useful for debugging.
    """
    graph_dict = await providers.dashboard.get_project_graph(project_id)

    if not graph_dict or not graph_dict.get("workgroups"):
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found or has no workgroups.",
        )

    return graph_dict


@router.get("/health/{project_id}", response_model=HealthSnapshot)
async def get_health_snapshot(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return the health snapshot for a project.

    Includes: critical path, newly unblocked entities, overdue
    alerts, per-workgroup status messages, and AI insight bullets.

    This powers the Critical Path sidebar and AI Insights panel.
    """
    service, graph = await _get_service(project_id, providers)
    return service.health_snapshot(today=date.today())


@router.get("/criticality/{project_id}", response_model=CriticalityReport)
async def get_criticality_ranking(
    project_id: str,
    delay_days: int = 7,
    providers=Depends(get_providers),
):
    """
    Return the criticality ranking for a project.

    Ranks every active workgroup by schedule sensitivity.
    Shows float days, criticality tier, and projected delay
    impact if the workgroup slips by `delay_days`.

    This powers criticality badges on workgroup cards and the
    "Focus on X — it's your biggest schedule risk" insight.
    """
    service, graph = await _get_service(project_id, providers)
    return service.criticality_ranking(delay_days=delay_days)


@router.get("/parallel/{project_id}")
async def get_parallel_work(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return parallel work analysis.

    Shows which workgroups are unblocked but idle — "3 workgroups
    unblocked, only 1 active."
    """
    service, graph = await _get_service(project_id, providers)
    return service.parallel_work_analysis().model_dump()


@router.get("/bottlenecks/{project_id}")
async def get_bottlenecks(
    project_id: str,
    threshold: int = 2,
    providers=Depends(get_providers),
):
    """
    Return bottleneck detection results.

    Identifies workgroups where many dependency paths converge.
    """
    service, graph = await _get_service(project_id, providers)
    return [b.model_dump() for b in service.detect_bottlenecks(threshold=threshold)]


@router.get("/conflicts/{project_id}")
async def get_resource_conflicts(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return resource conflict detection results.

    Identifies contractors assigned to overlapping workgroups.
    """
    service, graph = await _get_service(project_id, providers)
    return [c.model_dump() for c in service.detect_resource_conflicts()]


@router.get("/cashflow/{project_id}")
async def get_cash_flow(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return cash flow projection.

    Monthly projected invoices based on graph-derived timeline.
    """
    service, graph = await _get_service(project_id, providers)
    return service.cash_flow_projection().model_dump()


@router.get("/forecast/{project_id}")
async def get_completion_forecast(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return completion forecast based on actual vs estimated performance.
    """
    service, graph = await _get_service(project_id, providers)
    return service.completion_forecast().model_dump()
