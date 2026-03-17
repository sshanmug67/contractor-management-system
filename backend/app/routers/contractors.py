"""
Router — Contractors

Manage contractor companies, their workers, and verifications.
Contractor pool for allocation and scoring.

All database access goes through IContractorRepository via ProviderRegistry.

File: app/routers/contractors.py
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.dependencies import get_contractor_repo, get_providers
from app.db.interfaces import IContractorRepository
from app.models.contractor import (
    ContractorCreate,
    ContractorUpdate,
    ContractorResponse,
    ContractorDetail,
)

logger = logging.getLogger(__name__)

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


# ═══════════════════════════════════════════════════════════
# LIST / SEARCH
# ═══════════════════════════════════════════════════════════

@router.get("/")
async def list_contractors(
    trade: Optional[str] = Query(None, description="Filter by trade/skill"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search by company name"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """
    List contractors in the organization's pool.

    Supports filtering by trade, verification status, active status,
    and text search on company name.
    """
    org_id = DEV_ORG_ID

    # Use skill search if trade filter provided
    if trade:
        results = await repo.search_by_skills(org_id, [trade])
        # Apply additional filters in-memory (small result set)
        if status:
            results = [c for c in results if c.get("verification_status") == status]
        if search:
            results = [c for c in results if search.lower() in c.get("company_name", "").lower()]
        return results

    # General list with filters
    results = await repo.list_contractors(
        org_id=org_id,
        skills=None,
        is_active=is_active,
        search=search,
        skip=skip,
        limit=limit,
    )

    # Apply status filter if provided
    if status:
        results = [c for c in results if c.get("verification_status") == status]

    return results


@router.get("/search/by-skills")
async def search_by_skills(
    skills: str = Query(..., description="Comma-separated skills/trades"),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Search contractors by skills/trades for allocation."""
    org_id = DEV_ORG_ID
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    if not skill_list:
        return []
    return await repo.search_by_skills(org_id, skill_list)


# ═══════════════════════════════════════════════════════════
# CRUD
# ═══════════════════════════════════════════════════════════

@router.post("/", status_code=201)
async def create_contractor(
    data: ContractorCreate,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Add a contractor to the pool."""
    org_id = DEV_ORG_ID
    contractor_data = data.model_dump(exclude_none=True)
    result = await repo.create_contractor(org_id, contractor_data)
    return result


@router.get("/{contractor_id}")
async def get_contractor(
    contractor_id: str,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Get contractor detail with workers and verification history."""
    result = await repo.get_contractor_detail(contractor_id)
    if not result or not result.get("contractor"):
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id}' not found")
    return result


@router.patch("/{contractor_id}")
async def update_contractor(
    contractor_id: str,
    updates: ContractorUpdate,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Update contractor info."""
    update_data = updates.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repo.update_contractor(contractor_id, update_data)
    return result


@router.delete("/{contractor_id}", status_code=204)
async def delete_contractor(
    contractor_id: str,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Soft-delete a contractor (sets is_active=False)."""
    await repo.deactivate_contractor(contractor_id)


# ═══════════════════════════════════════════════════════════
# WORKERS
# ═══════════════════════════════════════════════════════════

@router.get("/{contractor_id}/workers")
async def list_contractor_workers(
    contractor_id: str,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """List workers employed by this contractor company."""
    return await repo.get_workers(contractor_id)


@router.post("/{contractor_id}/workers", status_code=201)
async def add_contractor_worker(
    contractor_id: str,
    first_name: str = Query(...),
    last_name: str = Query(...),
    phone: str = Query(...),
    email: Optional[str] = Query(None),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Add a worker to this contractor company."""
    return await repo.upsert_worker(
        contractor_id=contractor_id,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
    )


# ═══════════════════════════════════════════════════════════
# VERIFICATIONS
# ═══════════════════════════════════════════════════════════

@router.get("/{contractor_id}/verifications")
async def list_verifications(
    contractor_id: str,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Get verification history for this contractor."""
    return await repo.get_verifications(contractor_id)


@router.post("/{contractor_id}/verifications", status_code=201)
async def add_verification(
    contractor_id: str,
    data: dict,
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Add a verification record (license, insurance, BBB)."""
    return await repo.add_verification(contractor_id, data)


# ═══════════════════════════════════════════════════════════
# STATS (for ContractorPool page header)
# ═══════════════════════════════════════════════════════════

@router.get("/stats/summary")
async def get_contractor_stats(
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """
    Get contractor pool summary stats.
    Powers the stat cards at the top of the Contractor Pool page.
    """
    org_id = DEV_ORG_ID
    all_contractors = await repo.list_contractors(org_id=org_id, limit=500)

    total = len(all_contractors)
    active = sum(1 for c in all_contractors if c.get("is_active", True))
    verified = sum(1 for c in all_contractors if c.get("verification_status") == "verified")
    pending = sum(1 for c in all_contractors if c.get("verification_status") == "pending")
    flagged = sum(1 for c in all_contractors if c.get("verification_status") == "flagged")

    # Collect all unique skills
    all_skills = set()
    for c in all_contractors:
        for skill in (c.get("skills") or []):
            all_skills.add(skill)

    return {
        "total": total,
        "active": active,
        "verified": verified,
        "pending_verification": pending,
        "flagged": flagged,
        "unique_trades": len(all_skills),
        "trades": sorted(all_skills),
    }
