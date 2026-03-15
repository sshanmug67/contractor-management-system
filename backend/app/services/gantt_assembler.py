"""
GanttData Assembler — Merges Display Data + Graph Analysis

Pure function that takes the existing dashboard payload (display
fields: contractor_name, progress_pct, invoice amounts) and enriches
it with dependency analysis annotations (float_days, is_critical,
criticality_tier, status_message, is_bottleneck, etc.).

The result is a GanttData dict that the frontend Timeline view
can consume directly. It's a superset of OwnerDashboardData —
every field the frontend currently uses is present, plus analysis
annotations as progressive enhancements.

This module has no side effects. It receives data, computes, returns.
It does NOT touch the database, Redis, or Celery.

Usage:
    from app.services.gantt_assembler import assemble_gantt_data

    gantt = assemble_gantt_data(dashboard_data, graph, project_id)
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from app.models.dependency import (
    ProjectGraph, CriticalityTier,
)
from app.services.dependency_analyzer import DependencyService


def _float_to_tier(float_days: int) -> str:
    """Convert float days to criticality tier string."""
    if float_days <= 0:
        return CriticalityTier.CRITICAL.value
    elif float_days <= 3:
        return CriticalityTier.HIGH.value
    elif float_days <= 7:
        return CriticalityTier.MEDIUM.value
    else:
        return CriticalityTier.LOW.value


def assemble_gantt_data(
    dashboard_data: dict,
    graph: ProjectGraph,
    project_id: str,
    today: Optional[date] = None,
) -> dict:
    """
    Assemble the full GanttData response by enriching dashboard
    display data with dependency analysis annotations.

    Args:
        dashboard_data: the dict from get_owner_dashboard()
            (project, worksites with nested workgroups and jobs)
        graph: the ProjectGraph from get_project_graph()
        project_id: project ID
        today: current date for deadline calculations

    Returns:
        A dict matching the GanttData model shape, ready for
        JSON serialization and Redis caching.
    """
    if today is None:
        today = date.today()

    # ── Run all analysis methods ──────────────────────────
    service = DependencyService(graph)

    snapshot = service.health_snapshot(today=today)
    ranking = service.criticality_ranking()
    bottlenecks = service.detect_bottlenecks()
    parallel = service.parallel_work_analysis()
    conflicts = service.detect_resource_conflicts()
    cashflow = service.cash_flow_projection()
    forecast = service.completion_forecast()

    # ── Build lookup indexes from analysis results ────────

    # WG schedule from the internal DAG
    wg_schedule = service._wg_dag.compute_schedule()
    wg_floats = service._wg_dag.float_map()
    wg_critical_set = set(service._wg_dag.critical_path())

    # Job schedule from the internal DAG
    job_schedule = {}
    job_floats = {}
    job_critical_set = set()
    try:
        job_schedule = service._job_dag.compute_schedule()
        job_floats = service._job_dag.float_map()
        job_critical_set = set(service._job_dag.critical_path())
    except (ValueError, Exception):
        pass  # Job DAG may have disconnected components

    # Criticality ranking index: wg_id → entry
    criticality_by_id = {
        entry.entity_id: entry for entry in ranking.rankings
    }

    # Bottleneck index: wg_id → bottleneck
    bottleneck_by_id = {
        b.entity_id: b for b in bottlenecks
    }

    # Status messages index: wg_id → message
    status_msg_by_id = {
        msg.workgroup_id: msg.message
        for msg in snapshot.workgroup_messages
    }

    # Downstream counts
    downstream_counts = {}
    for wg in graph.workgroups:
        try:
            downstream_counts[wg.id] = service._wg_dag.total_downstream_count(wg.id)
        except Exception:
            downstream_counts[wg.id] = 0

    # ── Enrich worksites → workgroups → jobs ──────────────

    project_data = dashboard_data.get("project") or {}
    worksites = dashboard_data.get("worksites", [])

    enriched_worksites = []
    for ws in worksites:
        enriched_wgs = []
        for wg in ws.get("workgroups", []):
            wg_id = wg["id"]

            # WG-level analysis annotations
            sched = wg_schedule.get(wg_id)
            crit_entry = criticality_by_id.get(wg_id)
            bn = bottleneck_by_id.get(wg_id)
            float_days = wg_floats.get(wg_id, 0)
            is_crit = wg_id in wg_critical_set

            # Enrich jobs with computed start/end dates
            # Jobs run sequentially within a WG based on their sequence number.
            # Each job's start = WG start + sum(durations of all preceding jobs).
            enriched_jobs = []
            total_job_days = 0

            # Sort jobs by sequence to ensure correct date accumulation
            sorted_jobs = sorted(
                wg.get("jobs", []),
                key=lambda j: j.get("sequence", 0) or 0,
            )

            # Parse WG start date once
            wg_start_str = wg.get("start_date")
            wg_start_dt = None
            if wg_start_str:
                try:
                    wg_start_dt = date.fromisoformat(str(wg_start_str))
                except (ValueError, TypeError):
                    pass

            cumulative_days = 0
            for job in sorted_jobs:
                job_id = job["id"]
                j_sched = job_schedule.get(job_id)
                j_float = job_floats.get(job_id)
                j_is_crit = job_id in job_critical_set
                duration = job.get("est_duration_days", 0) or 0
                total_job_days += duration

                # Compute this job's start and end dates
                job_start_date = None
                job_end_date = None
                if wg_start_dt and duration > 0:
                    job_start_date = str(wg_start_dt + timedelta(days=cumulative_days))
                    job_end_date = str(wg_start_dt + timedelta(days=cumulative_days + duration))

                cumulative_days += duration

                enriched_job = {
                    **job,
                    # Computed dates
                    "start_date": job_start_date,
                    "end_date": job_end_date,
                    # Analysis annotations
                    "earliest_start": j_sched.earliest_start if j_sched else None,
                    "earliest_finish": j_sched.earliest_finish if j_sched else None,
                    "float_days": j_float if j_float is not None else None,
                    "is_critical": j_is_crit,
                    "criticality_tier": _float_to_tier(j_float) if j_float is not None else None,
                }
                enriched_jobs.append(enriched_job)

            # ── Compute end_date from start_date + sum(job durations) ──
            # Start date is user-defined (contractor availability, permits).
            # End date is derived from actual job scope within the workgroup.
            # Falls back to DB end_date if start_date is missing or no jobs.
            computed_end_date = wg.get("end_date")
            wg_start = wg.get("start_date")
            if wg_start and total_job_days > 0:
                try:
                    start_dt = date.fromisoformat(str(wg_start))
                    computed_end_date = str(start_dt + timedelta(days=total_job_days))
                except (ValueError, TypeError):
                    pass  # Keep DB end_date as fallback

            enriched_wg = {
                **wg,
                "jobs": enriched_jobs,
                "end_date": computed_end_date,  # ★ Computed from jobs, not raw DB value
                # Analysis annotations
                "earliest_start": sched.earliest_start if sched else None,
                "earliest_finish": sched.earliest_finish if sched else None,
                "latest_start": sched.latest_start if sched else None,
                "latest_finish": sched.latest_finish if sched else None,
                "float_days": float_days,
                "is_critical": is_crit,
                "criticality_tier": crit_entry.tier.value if crit_entry else _float_to_tier(float_days),
                "is_bottleneck": bn is not None,
                "downstream_count": downstream_counts.get(wg_id, 0),
                "status_message": status_msg_by_id.get(wg_id),
            }
            enriched_wgs.append(enriched_wg)

        enriched_ws = {
            **ws,
            "workgroups": enriched_wgs,
        }
        enriched_worksites.append(enriched_ws)

    # ── Assemble the full GanttData dict ──────────────────

    gantt_data = {
        # Project header with analysis annotations
        "project": {
            **project_data,
            "project_duration_days": snapshot.project_duration_days,
            "projected_end_date": None,  # TODO: compute from start_date + duration
            "adjusted_end_date": forecast.adjusted_end_date if forecast.correction_factor > 1.05 else None,
        },

        # Enriched worksites with nested workgroups and jobs
        "worksites": enriched_worksites,

        # Critical path (for sidebar)
        "critical_path": snapshot.critical_path,
        "critical_path_details": [
            entry.model_dump() for entry in snapshot.critical_path_details
        ],

        # AI insights (for sidebar)
        "ai_insight_bullets": snapshot.ai_insight_bullets,

        # Sidebar analysis panels
        "analysis": {
            # Health snapshot summary
            "newly_unblocked_workgroups": [
                e.model_dump() for e in snapshot.newly_unblocked_workgroups
            ],
            "newly_unblocked_jobs": [
                e.model_dump() for e in snapshot.newly_unblocked_jobs
            ],
            "overdue_entities": [
                e.model_dump() for e in snapshot.overdue_entities
            ],
            "approaching_deadlines": [
                e.model_dump() for e in snapshot.approaching_deadlines
            ],

            # Criticality ranking
            "criticality_rankings": [
                e.model_dump() for e in ranking.rankings
            ],
            "criticality_top_risks": [
                e.model_dump() for e in ranking.top_risks
            ],
            "criticality_summary": ranking.summary,

            # Parallel work
            "parallel_work": parallel.model_dump(),

            # Bottlenecks
            "bottlenecks": [b.model_dump() for b in bottlenecks],

            # Resource conflicts
            "resource_conflicts": [c.model_dump() for c in conflicts],

            # Cash flow
            "cashflow": cashflow.model_dump(),

            # Completion forecast
            "forecast": forecast.model_dump(),
        },

        # Budget summary (pass through from dashboard)
        "budget_summary": dashboard_data.get("budget_summary", {}),

        # Stats (pass through from dashboard)
        "stats": dashboard_data.get("stats", {}),

        # Embedded ProjectGraph for frontend to send back to
        # preview/scenario endpoints without another DB fetch
        "graph": graph.model_dump(),
    }

    return gantt_data
