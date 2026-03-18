"""
Router — Check-ins

GPS check-in/check-out for contractor workers at worksites.
Check-in triggers geo_worker for fence validation (Pattern 2 async).

All database access goes through ICheckinRepository via ProviderRegistry.

v3 MIGRATION CHANGES:
  - check_in: resolves effective worksite via COALESCE(job.worksite_id,
    workgroup.worksite_id). Returns 422 if both are null (project-level
    task with no physical location — GPS check-in not applicable).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.dependencies import get_checkin_repo, get_providers
from app.db.interfaces import ICheckinRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


async def _resolve_effective_worksite(providers, workgroup_id: str, job_id: str = None) -> dict:
    """
    v3: Resolve the effective worksite for a check-in using the
    COALESCE pattern: job.worksite_id → workgroup.worksite_id → null.

    Returns:
        {"worksite_id": str, "worksite": dict} if location found
        {"worksite_id": None} if no location (project-level task)
    """
    effective_worksite_id = None

    # Check job-level override first (if job_id provided)
    if job_id:
        job = await providers.jobs.get_job(job_id)
        if job and job.get("worksite_id"):
            effective_worksite_id = job["worksite_id"]

    # Fall back to workgroup-level worksite
    if not effective_worksite_id:
        wg = await providers.workgroups.get_workgroup(workgroup_id)
        if wg and wg.get("worksite_id"):
            effective_worksite_id = wg["worksite_id"]

    if not effective_worksite_id:
        return {"worksite_id": None}

    # Fetch the worksite details (for geo-fence coordinates)
    worksite = await providers.worksites.get_worksite(effective_worksite_id)
    return {
        "worksite_id": effective_worksite_id,
        "worksite": worksite,
    }


@router.post("/", status_code=202)
async def check_in(
    data: dict,
    # worker=Depends(get_current_worker),  # Contractor auth via QR
    repo: ICheckinRepository = Depends(get_checkin_repo),
    providers=Depends(get_providers),
):
    """
    Record a GPS check-in at a worksite.
    Pattern 2 (async): create record + fire geo_worker.delay().

    v3: Resolves effective worksite via COALESCE pattern.
    Returns 422 if the workgroup/job has no physical location.
    """
    workgroup_id = data.get("workgroup_id")
    job_id = data.get("job_id")  # optional — for job-level location override

    if not workgroup_id:
        raise HTTPException(status_code=400, detail="workgroup_id is required")

    # ── v3: Resolve effective worksite ─────────────────
    location = await _resolve_effective_worksite(providers, workgroup_id, job_id)

    if location["worksite_id"] is None:
        raise HTTPException(
            status_code=422,
            detail=(
                "This workgroup has no assigned physical location. "
                "GPS check-in is not required for project-level tasks. "
                "Assign a worksite to the workgroup or job to enable check-ins."
            ),
        )

    # ── Create check-in record ────────────────────────
    checkin_data = {
        "workgroup_id": workgroup_id,
        "worksite_id": location["worksite_id"],
        "geo_latitude": data.get("geo_latitude"),
        "geo_longitude": data.get("geo_longitude"),
        "device_info": data.get("device_info"),
        # worker_id will come from auth: worker.id
    }

    # TODO: checkin = await repo.create(checkin_data)

    # TODO: Fire geo_worker for fence validation
    # geo_worker.delay(checkin['id'], 'checkin')

    # return {'id': checkin['id'], 'status': 'recorded', 'worksite_id': location['worksite_id']}
    return {
        "status": "recorded",
        "worksite_id": location["worksite_id"],
        "message": "Check-in recorded. Geo-fence validation pending.",
    }


@router.post("/{checkin_id}/checkout")
async def check_out(
    checkin_id: str,
    data: dict,
    # worker=Depends(get_current_worker),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """Record check-out time for an existing check-in."""
    # TODO: repo.checkout(checkin_id, data)
    pass


@router.get("/worksite/{worksite_id}")
async def list_worksite_checkins(
    worksite_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    # user=Depends(get_current_user),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """List check-ins for a worksite, optionally filtered by date."""
    # TODO: repo.get_by_worksite(worksite_id) or repo.get_today_by_worksite(worksite_id)
    return []


@router.get("/worksite/{worksite_id}/today")
async def get_today_presence(
    worksite_id: str,
    # user=Depends(get_current_user),
    repo: ICheckinRepository = Depends(get_checkin_repo),
):
    """Get today's site presence: who checked in, when, still on-site."""
    # TODO: repo.get_today_by_worksite(worksite_id)
    return []
