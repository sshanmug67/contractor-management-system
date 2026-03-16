"""
Router — Dependency Analysis Endpoints

Provides endpoints for dependency management and graph analysis:
  GET  /gantt/{id}        Full GanttData (cache-first, powers Timeline tab)
  POST /preview           Preview impact of proposed changes
  POST /apply             Apply validated changes + invalidate cache
  POST /scenarios         Run what-if scenario simulation
  GET  /graph/{id}        Get raw ProjectGraph (for frontend cache)
  GET  /health/{id}       Get health snapshot (cache-first)
  GET  /criticality/{id}  Get criticality ranking (cache-first)
  GET  /parallel/{id}     Get parallel work analysis
  GET  /bottlenecks/{id}  Get bottleneck detection
  GET  /conflicts/{id}    Get resource conflicts
  GET  /cashflow/{id}     Get cash flow projection (cache-first)
  GET  /forecast/{id}     Get completion forecast

Cache-first pattern (same as dashboard):
  1. Check Redis L2 cache
  2. CACHE HIT: Return immediately (~2ms)
  3. CACHE MISS: Compute live (~200ms), return, backfill cache

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
    SensitivityReport,
)

from app.services.dependency_analyzer import DependencyService
from app.cache.dependency_cache import (
    get_cached_gantt_data,
    set_cached_gantt_data,
    get_cached_health_snapshot,
    set_cached_health_snapshot,
    get_cached_criticality,
    set_cached_criticality,
    get_cached_cashflow,
    set_cached_cashflow,
    invalidate_project_analysis,
    get_cached_sensitivity,
    set_cached_sensitivity,
    invalidate_sensitivity,
)


router = APIRouter(
    prefix="/api/dependencies",
    tags=["Dependencies"],
)

# ── Dev org ID — same as dashboard_stats_worker ───────────
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"


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
# GANTT DATA — Full enriched timeline response (cache-first)
# ══════════════════════════════════════════════════════════════


@router.get("/gantt/{project_id}")
async def get_gantt_data(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Return the full GanttData for the Timeline tab.

    This is the PRIMARY endpoint for the frontend Timeline view.
    Returns everything: display data (contractor names, progress,
    invoices) + analysis annotations (critical path, float, tiers,
    bottlenecks, status messages) + sidebar data (insights,
    rankings, conflicts, parallel work).

    Cache-first: checks Redis L2 cache before computing.
    The dependency_analysis_worker pre-warms this cache daily
    at 5 AM and on every job completion / dependency change.
    """
    # ── 1. Check cache ────────────────────────────────────
    cached = get_cached_gantt_data(project_id)
    if cached:
        return cached

    # ── 2. Cache miss — compute live ──────────────────────
    from app.services.gantt_assembler import assemble_gantt_data

    # Fetch dashboard data (display fields)
    dashboard_data = await providers.dashboard.get_owner_dashboard(
        DEV_ORG_ID, project_id=project_id,
    )
    if not dashboard_data or not dashboard_data.get("project"):
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found.",
        )

    # Fetch ProjectGraph (for analysis)
    graph_dict = await providers.dashboard.get_project_graph(project_id)
    if not graph_dict or not graph_dict.get("workgroups"):
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' has no workgroups.",
        )

    graph = ProjectGraph(**graph_dict)

    # Assemble GanttData (display + all analysis)
    gantt_data = assemble_gantt_data(
        dashboard_data=dashboard_data,
        graph=graph,
        project_id=project_id,
        today=date.today(),
    )

    # ── 3. Backfill cache ─────────────────────────────────
    set_cached_gantt_data(project_id, gantt_data)

    return gantt_data


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

    Returns validation result (pass/fail) + impact analysis.
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

    Re-validates, writes changes, invalidates cache, and fires
    background refresh.
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

    # Invalidate analysis cache (graph changed)
    invalidate_project_analysis(batch.project_id)

    # Fire background refresh to rebuild cache
    try:
        from app.workers.dependency_analysis_worker import refresh_dependency_analysis
        refresh_dependency_analysis.delay(batch.project_id)
    except ImportError:
        pass  # Worker not yet deployed

    return {
        "status": "applied",
        "change_count": applied_count,
        "project_id": batch.project_id,
    }


async def _apply_change_to_db(providers, change):
    """Persist a single validated change to the database."""
    if change.action == "add_wg_dep":
        await providers.workgroups.add_dependency(
            workgroup_id=change.to_id,
            depends_on_id=change.from_id,
        )
    elif change.action == "remove_wg_dep":
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
    Read-only analysis — no database changes.
    """
    service, graph = await _get_service(request.project_id, providers)
    report = service.simulate_scenarios(request.scenarios)
    return report


# ══════════════════════════════════════════════════════════════
# GRAPH + ANALYSIS ENDPOINTS (cache-first where applicable)
# ══════════════════════════════════════════════════════════════


@router.get("/graph/{project_id}")
async def get_project_graph(
    project_id: str,
    providers=Depends(get_providers),
):
    """Return the raw ProjectGraph for a project."""
    graph_dict = await providers.dashboard.get_project_graph(project_id)
    if not graph_dict or not graph_dict.get("workgroups"):
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")
    return graph_dict


@router.get("/health/{project_id}", response_model=HealthSnapshot)
async def get_health_snapshot(
    project_id: str,
    providers=Depends(get_providers),
):
    """
    Health snapshot — cache-first.
    Powers the Critical Path sidebar and AI Insights panel.
    """
    cached = get_cached_health_snapshot(project_id)
    if cached:
        return cached

    service, graph = await _get_service(project_id, providers)
    result = service.health_snapshot(today=date.today())

    # Backfill cache
    set_cached_health_snapshot(project_id, result.model_dump())
    return result


@router.get("/criticality/{project_id}", response_model=CriticalityReport)
async def get_criticality_ranking(
    project_id: str,
    delay_days: int = 7,
    providers=Depends(get_providers),
):
    """
    Criticality ranking — cache-first.
    Powers criticality badges and "Focus on X" insights.
    """
    if delay_days == 7:  # Only cache the default
        cached = get_cached_criticality(project_id)
        if cached:
            return cached

    service, graph = await _get_service(project_id, providers)
    result = service.criticality_ranking(delay_days=delay_days)

    if delay_days == 7:
        set_cached_criticality(project_id, result.model_dump())
    return result


@router.get("/parallel/{project_id}")
async def get_parallel_work(
    project_id: str,
    providers=Depends(get_providers),
):
    """Parallel work analysis — which workgroups are unblocked but idle."""
    service, graph = await _get_service(project_id, providers)
    return service.parallel_work_analysis().model_dump()


@router.get("/bottlenecks/{project_id}")
async def get_bottlenecks(
    project_id: str,
    threshold: int = 2,
    providers=Depends(get_providers),
):
    """Bottleneck detection — high fan-out convergence nodes."""
    service, graph = await _get_service(project_id, providers)
    return [b.model_dump() for b in service.detect_bottlenecks(threshold=threshold)]


@router.get("/conflicts/{project_id}")
async def get_resource_conflicts(
    project_id: str,
    providers=Depends(get_providers),
):
    """Resource conflict detection — same contractor overlapping workgroups."""
    service, graph = await _get_service(project_id, providers)
    return [c.model_dump() for c in service.detect_resource_conflicts()]


@router.get("/cashflow/{project_id}")
async def get_cash_flow(
    project_id: str,
    providers=Depends(get_providers),
):
    """Cash flow projection — cache-first."""
    cached = get_cached_cashflow(project_id)
    if cached:
        return cached

    service, graph = await _get_service(project_id, providers)
    result = service.cash_flow_projection()

    set_cached_cashflow(project_id, result.model_dump())
    return result


@router.get("/forecast/{project_id}")
async def get_completion_forecast(
    project_id: str,
    providers=Depends(get_providers),
):
    """Completion forecast — actual vs estimated correction."""
    service, graph = await _get_service(project_id, providers)
    return service.completion_forecast().model_dump()

# ══════════════════════════════════════════════════════════════
# SENSITIVITY ANALYSIS ENDPOINTS (cache-first where applicable)
# ══════════════════════════════════════════════════════════════
@router.get("/sensitivity/{project_id}", response_model=SensitivityReport)
async def get_sensitivity_analysis(
    project_id: str,
    test_delay: int = 3,
    providers=Depends(get_providers),
):
    """
    Get sensitivity analysis for a project — cache-first.
 
    Returns per-workgroup sensitivity rankings showing which WGs
    are most dangerous to delay. Computed daily by the worker and
    refreshed on job completions.
 
    Query params:
        test_delay: delay days to simulate per WG (default 3).
                    Only default (3) is cached.
    """
    # Cache-first for default test_delay
    if test_delay == 3:
        cached = get_cached_sensitivity(project_id)
        if cached:
            return cached
 
    service, graph = await _get_service(project_id, providers)
 
    # Build worksite lookup for per-site grouping
    worksite_lookup = _build_worksite_lookup(providers, project_id)
 
    report = service.sensitivity_analysis(
        test_delay=test_delay,
        worksite_lookup=worksite_lookup,
    )
    result = report.model_dump()
 
    if test_delay == 3:
        set_cached_sensitivity(project_id, result)
 
    return result
 
 
@router.post("/sensitivity/{project_id}/refresh")
async def refresh_sensitivity_analysis(
    project_id: str,
    test_delay: int = 3,
    providers=Depends(get_providers),
):
    """
    Force-refresh sensitivity analysis for a project.
 
    Called by the frontend "Run Sensitivity Analysis" button.
    Invalidates cache, recomputes, caches, and returns fresh results.
    """
    # Invalidate stale cache
    invalidate_sensitivity(project_id)
 
    service, graph = await _get_service(project_id, providers)
    worksite_lookup = await _build_worksite_lookup_async(providers, project_id)
 
    report = service.sensitivity_analysis(
        test_delay=test_delay,
        worksite_lookup=worksite_lookup,
    )
    result = report.model_dump()
 
    # Cache fresh results
    set_cached_sensitivity(project_id, result)
 
    return result
 
 
async def _build_worksite_lookup_async(providers, project_id: str) -> dict:
    """
    Build {wg_id: (worksite_id, worksite_name)} from dashboard data.
    Used to enrich sensitivity entries with site context.
    """
    dashboard_data = await providers.dashboard.get_owner_dashboard(
        DEV_ORG_ID, project_id=project_id,
    )
    lookup = {}
    if dashboard_data:
        for ws in dashboard_data.get("worksites", []):
            ws_id = ws.get("id", "")
            ws_name = ws.get("name", "")
            for wg in ws.get("workgroups", []):
                lookup[wg["id"]] = (ws_id, ws_name)
    return lookup