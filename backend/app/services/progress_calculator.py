"""
Service — Progress Calculator

Cascading progress calculation: Job → Workgroup → Worksite → Project

When any job status changes, progress recalculates upward through
the entire hierarchy.
"""

from decimal import Decimal


async def recalculate_workgroup_progress(workgroup_id: str, db) -> Decimal:
    """
    Recalculate workgroup progress based on job statuses.
    
    Formula: (complete + invoiced + paid jobs) / total jobs * 100
    Updates workgroup.progress_pct in DB.
    """
    # TODO: Count jobs by status for this workgroup
    # TODO: Calculate percentage
    # TODO: Update workgroup.progress_pct
    # TODO: Check if all jobs done → status = 'complete' (if all invoiced+paid)
    # TODO: Trigger recalculate_worksite_progress()
    return Decimal("0")


async def recalculate_worksite_progress(worksite_id: str, db) -> Decimal:
    """
    Recalculate worksite progress based on workgroup progresses.
    
    Formula: average of workgroup progress_pct values (weighted by budget optional)
    Updates worksite.progress_pct in DB.
    """
    # TODO: Avg of workgroup progress_pct WHERE worksite_id
    # TODO: Update worksite.progress_pct
    # TODO: Check if all workgroups complete → status = 'complete'
    # TODO: Trigger recalculate_project_progress()
    return Decimal("0")


async def recalculate_project_progress(project_id: str, db) -> Decimal:
    """
    Recalculate project progress based on worksite progresses.
    
    Formula: average of worksite progress_pct values (weighted by budget optional)
    Updates project.progress_pct in DB.
    """
    # TODO: Avg of worksite progress_pct WHERE project_id
    # TODO: Update project.progress_pct
    # TODO: Check if all worksites complete → status = 'complete'
    return Decimal("0")


async def on_job_status_change(job_id: str, new_status: str, db):
    """Entry point: called whenever a job status changes. Cascades upward."""
    # TODO: Get workgroup_id from job
    # TODO: recalculate_workgroup_progress()
    # TODO: (which cascades to worksite → project)
    pass
