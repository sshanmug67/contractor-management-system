"""
Service — Progress Calculator

Cascading progress calculation: Job → Workgroup → Worksite → Project

When any job status changes, progress recalculates upward through
the hierarchy. The cascade branches based on whether the workgroup
has a worksite assigned:

  Standard path:  Job → Workgroup → Worksite → Project
  v3 new path:    Job → Workgroup → Project (skip worksite when null)

This service receives data and ProviderRegistry. It reads the
current state, computes new percentages, and writes them back.
Called by progress_worker (Celery task) — never by routers directly.

v3 MIGRATION CHANGES:
  - recalculate_from_job: branches cascade based on workgroup.worksite_id
  - recalculate_worksite_progress: only includes WGs with worksite_id set
  - recalculate_project_progress: includes ALL WGs for the project
    (both sited and project-level), weighted by budget
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Status constants ──────────────────────────────────

COMPLETE_JOB_STATUSES = {"complete", "invoiced", "paid"}
COMPLETE_WG_STATUSES = {"complete", "approved"}


def _safe_decimal(value) -> Decimal:
    """Convert any value to Decimal safely."""
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _pct(numerator: int, denominator: int) -> Decimal:
    """Calculate percentage as Decimal, 2 places."""
    if denominator == 0:
        return Decimal("0")
    return (Decimal(numerator) / Decimal(denominator) * 100).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def _weighted_avg(items: list[dict], pct_key: str = "progress_pct", weight_key: str = "budget") -> Decimal:
    """
    Weighted average of progress percentages by budget.
    Falls back to simple average if no budgets are set.
    """
    if not items:
        return Decimal("0")

    total_weight = sum(_safe_decimal(item.get(weight_key)) for item in items)

    if total_weight > 0:
        # Budget-weighted average
        weighted_sum = sum(
            _safe_decimal(item.get(pct_key)) * _safe_decimal(item.get(weight_key))
            for item in items
        )
        return (weighted_sum / total_weight).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        # Simple average (no budgets set)
        total_pct = sum(_safe_decimal(item.get(pct_key)) for item in items)
        return (total_pct / Decimal(len(items))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ══════════════════════════════════════════════════════════
# ENTRY POINT — Called by progress_worker
# ══════════════════════════════════════════════════════════


async def recalculate_from_job(job_id: str, providers) -> dict:
    """
    Entry point: called when a job status changes.
    Cascades progress upward through the hierarchy.

    v3: Branches based on whether the workgroup has a worksite.

    Returns dict with updated percentages for logging/verification.
    """
    # Get the job to find its workgroup
    job = await providers.jobs.get_job(job_id)
    if not job:
        logger.warning(f"Progress cascade: job {job_id} not found")
        return {}

    workgroup_id = job["workgroup_id"]

    # Step 1: Recalculate workgroup progress
    wg_pct = await recalculate_workgroup_progress(workgroup_id, providers)

    # Get workgroup to determine cascade path
    wg = await providers.workgroups.get_workgroup(workgroup_id)
    if not wg:
        logger.warning(f"Progress cascade: workgroup {workgroup_id} not found")
        return {"workgroup_pct": float(wg_pct)}

    project_id = wg.get("project_id")
    worksite_id = wg.get("worksite_id")

    result = {"workgroup_pct": float(wg_pct)}

    # Step 2: v3 branching — cascade through worksite only if assigned
    if worksite_id:
        ws_pct = await recalculate_worksite_progress(worksite_id, providers)
        result["worksite_pct"] = float(ws_pct)

    # Step 3: Recalculate project progress (always — includes ALL workgroups)
    if project_id:
        proj_pct = await recalculate_project_progress(project_id, providers)
        result["project_pct"] = float(proj_pct)

    logger.info(f"Progress cascade complete for job {job_id}: {result}")
    return result


# ══════════════════════════════════════════════════════════
# WORKGROUP PROGRESS (from job statuses)
# ══════════════════════════════════════════════════════════


async def recalculate_workgroup_progress(workgroup_id: str, providers) -> Decimal:
    """
    Recalculate workgroup progress from its job statuses.

    Formula: count(complete + invoiced + paid) / count(total) * 100
    Updates workgroup.progress_pct in DB.
    """
    jobs = await providers.jobs.list_jobs(workgroup_id)
    if not jobs:
        return Decimal("0")

    total = len(jobs)
    done = sum(1 for j in jobs if j.get("status") in COMPLETE_JOB_STATUSES)
    pct = _pct(done, total)

    await providers.workgroups.update_progress(workgroup_id, float(pct))

    logger.debug(f"Workgroup {workgroup_id}: {done}/{total} jobs done = {pct}%")
    return pct


# ══════════════════════════════════════════════════════════
# WORKSITE PROGRESS (from workgroup progresses)
# ══════════════════════════════════════════════════════════


async def recalculate_worksite_progress(worksite_id: str, providers) -> Decimal:
    """
    Recalculate worksite progress from its workgroup progresses.

    v3: Only includes workgroups that have this worksite_id set.
    Project-level workgroups (null worksite) are excluded from
    worksite-level aggregation — they roll up directly to the project.

    Formula: budget-weighted average of workgroup progress_pct values.
    Updates worksite.progress_pct in DB.
    """
    workgroups = await providers.workgroups.list_workgroups(worksite_id=worksite_id)
    if not workgroups:
        return Decimal("0")

    pct = _weighted_avg(workgroups)
    await providers.worksites.update_progress(worksite_id, float(pct))

    logger.debug(f"Worksite {worksite_id}: {len(workgroups)} WGs, weighted avg = {pct}%")
    return pct


# ══════════════════════════════════════════════════════════
# PROJECT PROGRESS (from ALL workgroups — both sited and project-level)
# ══════════════════════════════════════════════════════════


async def recalculate_project_progress(project_id: str, providers) -> Decimal:
    """
    Recalculate project progress from ALL its workgroups.

    v3: Queries workgroups by project_id directly (not through worksites).
    This includes both sited workgroups and project-level workgroups
    with null worksite_id. All are weighted by budget.

    Formula: budget-weighted average of ALL workgroup progress_pct values.
    Updates project.progress_pct in DB.
    """
    workgroups = await providers.workgroups.list_by_project(project_id)
    if not workgroups:
        return Decimal("0")

    pct = _weighted_avg(workgroups)
    await providers.projects.cascade_progress(project_id)

    logger.debug(f"Project {project_id}: {len(workgroups)} WGs (all), weighted avg = {pct}%")
    return pct
