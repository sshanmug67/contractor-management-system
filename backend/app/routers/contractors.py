"""
Router — Contractors

Manage contractor companies, their workers, and verifications.
Contractor pool for allocation and scoring.

All database access goes through IContractorRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_contractor_repo
from app.db.interfaces import IContractorRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_contractors(
    trade: Optional[str] = Query(None, description="Filter by trade"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """List contractors in the organization's pool."""
    # TODO: repo.list_by_org(org_id)
    return []


@router.post("/", status_code=201)
async def create_contractor(
    data: dict,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Add a contractor to the pool."""
    # TODO: repo.create(org_id, data)
    pass


@router.get("/{contractor_id}")
async def get_contractor(
    contractor_id: str,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Get contractor detail with workers and verification history."""
    # TODO: repo.get_by_id(contractor_id)
    pass


@router.patch("/{contractor_id}")
async def update_contractor(
    contractor_id: str,
    updates: dict,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Update contractor info."""
    # TODO: repo.update(contractor_id, updates)
    pass


@router.delete("/{contractor_id}", status_code=204)
async def delete_contractor(
    contractor_id: str,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Remove a contractor from the pool."""
    # TODO: repo.delete(contractor_id)
    pass


@router.get("/{contractor_id}/workers")
async def list_contractor_workers(
    contractor_id: str,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """List workers employed by this contractor company."""
    # TODO: repo.get_workers(contractor_id)
    return []


@router.post("/{contractor_id}/workers", status_code=201)
async def add_contractor_worker(
    contractor_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Add a worker to this contractor company."""
    # TODO: repo.upsert_worker(contractor_id, data)
    pass


@router.get("/{contractor_id}/verifications")
async def list_verifications(
    contractor_id: str,
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Get verification history for this contractor."""
    # TODO: repo.get_verifications(contractor_id)
    return []


@router.get("/search/by-skills")
async def search_by_skills(
    skills: str = Query(..., description="Comma-separated skills/trades"),
    # user=Depends(get_current_user),
    repo: IContractorRepository = Depends(get_contractor_repo),
):
    """Search contractors by skills/trades for allocation."""
    # TODO: repo.search_by_skills(org_id, skills.split(','))
    return []
