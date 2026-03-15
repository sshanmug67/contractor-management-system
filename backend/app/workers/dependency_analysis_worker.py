"""
Dependency Analysis Worker — Periodic + Event-Driven Cache Refresh

Pre-computes the full GanttData (display data + all 9 analysis methods)
for all active projects and caches the result in Redis.

When the business owner opens the Timeline tab, the data is already warm
in Redis — instant load with all intelligence baked in.

Triggers:
  - Celery Beat: Daily at 5:00 AM (configurable via CMS_BEAT_DEPENDENCY_HOUR)
  - Event-driven: Called with project_id after job completion, dependency
    change, or workgroup status change

Cache key: cms:cache:gantt:{project_id}  TTL: 10 minutes
Pub/sub: cms:analysis:refreshed:{project_id}

Also caches individual analysis results for the standalone endpoints:
  cms:cache:health_snapshot:{project_id}
  cms:cache:criticality:{project_id}
  cms:cache:cashflow:{project_id}

Pattern mirrors dashboard_stats_worker.py.
"""

import asyncio
from datetime import date

from app.workers.celery_app import app
from app.workers.worker_logging import worker_log
from app.cache.redis_client import get_redis_client
from app.cache.dependency_cache import (
    set_cached_gantt_data,
    set_cached_health_snapshot,
    set_cached_criticality,
    set_cached_cashflow,
)

TAG = "DEPENDENCY_ANALYSIS"

# ── Dev org ID from seed data — same as dashboard_stats_worker ──
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"


@app.task(
    name="app.workers.dependency_analysis_worker.refresh_dependency_analysis",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def refresh_dependency_analysis(self, project_id: str = None):
    """
    Refresh dependency analysis + GanttData for active projects.

    If project_id is provided, refresh only that project (event-driven).
    If None, refresh all active projects (daily Beat schedule).

    Flow:
        1. Get active projects (all or single)
        2. For each project:
           a. Fetch dashboard data via ProviderRegistry
           b. Fetch ProjectGraph via ProviderRegistry
           c. Run GanttData assembler (all 9 analysis methods)
           d. Cache full GanttData in Redis
           e. Cache individual analysis results
           f. Publish refresh event
        3. Write worker heartbeat
    """
    try:
        if project_id:
            worker_log(TAG, f"Event-triggered refresh for project {project_id}")
        else:
            worker_log(TAG, "Starting daily dependency analysis refresh")

        from app.providers import get_provider_registry
        providers = get_provider_registry()
        redis = get_redis_client()
        today = date.today()

        # ── Get project list ──────────────────────────────
        if project_id:
            projects = [{"id": project_id}]
        else:
            # Get all active projects for the org
            # MVP: use DEV_ORG_ID. Multi-org: iterate all orgs.
            projects = asyncio.run(
                providers.dashboard.get_portfolio_projects(DEV_ORG_ID)
            )
            if not projects:
                worker_log(TAG, "No active projects found — skipping")
                return {"status": "skipped", "reason": "no_projects"}

        refreshed = 0
        for project in projects:
            pid = project["id"]
            try:
                _refresh_project(providers, pid, today)
                refreshed += 1
            except Exception as exc:
                worker_log(TAG, f"Failed for project {pid}: {exc}")
                # Continue to next project

        # ── Write heartbeat ───────────────────────────────
        redis.write_heartbeat("dependency_analysis_worker")

        worker_log(
            TAG,
            f"Dependency analysis refresh complete — "
            f"{refreshed}/{len(projects)} projects cached"
        )
        return {"status": "success", "projects_refreshed": refreshed}

    except Exception as exc:
        worker_log(TAG, f"FAILED — {exc}")
        raise self.retry(exc=exc)


def _refresh_project(providers, project_id: str, today: date):
    """
    Refresh dependency analysis for a single project.

    Fetches both dashboard data (display fields) and ProjectGraph
    (for analysis), runs the assembler, and caches everything.
    """
    from app.models.dependency import ProjectGraph
    from app.services.gantt_assembler import assemble_gantt_data
    from app.services.dependency_analyzer import DependencyService

    # ── 1. Fetch dashboard data (display fields) ─────────
    # We need org_id to call get_owner_dashboard. For MVP,
    # we call get_owner_dashboard with DEV_ORG_ID + project_id.
    dashboard_data = asyncio.run(
        providers.dashboard.get_owner_dashboard(
            DEV_ORG_ID,
            project_id=project_id,
        )
    )

    if not dashboard_data or not dashboard_data.get("project"):
        worker_log(TAG, f"No dashboard data for project {project_id} — skipping")
        return

    # ── 2. Fetch ProjectGraph (for analysis) ──────────────
    graph_dict = asyncio.run(
        providers.dashboard.get_project_graph(project_id)
    )

    if not graph_dict or not graph_dict.get("workgroups"):
        worker_log(TAG, f"No workgroups for project {project_id} — skipping")
        return

    graph = ProjectGraph(**graph_dict)

    # ── 3. Assemble GanttData (display + all analysis) ────
    gantt_data = assemble_gantt_data(
        dashboard_data=dashboard_data,
        graph=graph,
        project_id=project_id,
        today=today,
    )

    # ── 4. Cache full GanttData ───────────────────────────
    success = set_cached_gantt_data(project_id, gantt_data)

    if success:
        wg_count = sum(
            len(ws.get("workgroups", []))
            for ws in gantt_data.get("worksites", [])
        )
        critical_count = sum(
            1 for ws in gantt_data.get("worksites", [])
            for wg in ws.get("workgroups", [])
            if wg.get("is_critical")
        )
        worker_log(
            TAG,
            f"Cached GanttData for project {project_id}: "
            f"{wg_count} workgroups, {critical_count} critical, "
            f"duration={gantt_data['project'].get('project_duration_days', '?')}d"
        )
    else:
        worker_log(TAG, f"Redis write failed for project {project_id}")

    # ── 5. Also cache individual analysis results ─────────
    # These feed the standalone /health, /criticality, /cashflow endpoints
    # so they don't need to recompute if the full GanttData is already cached.
    service = DependencyService(graph)

    snapshot = service.health_snapshot(today=today)
    set_cached_health_snapshot(project_id, snapshot.model_dump())

    ranking = service.criticality_ranking()
    set_cached_criticality(project_id, ranking.model_dump())

    cashflow = service.cash_flow_projection()
    set_cached_cashflow(project_id, cashflow.model_dump())

    worker_log(TAG, f"Cached individual analysis results for project {project_id}")
