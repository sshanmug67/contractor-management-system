"""
Router — Settings / Business Profile

Endpoints for business profile CRUD and onboarding.
All endpoints scoped to the authenticated user's org.

Dev mode: Uses hardcoded org_id until auth is implemented.

Branding cache: Profile saves write-through to Redis so the
sidebar, page titles, and invoice headers update immediately
without waiting for the next worker cycle.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.interfaces.business_profile_repository import IBusinessProfileRepository
from app.providers import get_provider_registry, ProviderRegistry
from app.models.business_profile import (
    BusinessProfileCreate,
    BusinessProfileUpdate,
    BusinessProfileAddressUpdate,
    BusinessProfileResponse,
    OnboardingStepUpdate,
    OnboardingStatus,
)
from app.cache.branding_cache import set_cached_branding, extract_branding

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


# ── Dependency ────────────────────────────────────────

def get_profile_repo(
    providers: ProviderRegistry = Depends(lambda: get_provider_registry()),
) -> IBusinessProfileRepository:
    return providers.business_profiles


# ── Dev-mode org resolver ─────────────────────────────
# TODO: Replace with get_current_user → org_id from JWT

def _get_org_id() -> str:
    """Temporary: return dev org_id. Replace with auth."""
    import os
    return os.environ.get(
        "DEV_ORG_ID",
        "a0000000-0000-0000-0000-000000000001"  # Metro Aerial (ERL seed)
    )


# ── Cache write-through helper ────────────────────────

def _update_branding_cache(org_id: str, profile: dict) -> None:
    """
    Write-through: update branding cache immediately after a profile save.

    Extracts branding fields and writes to Redis. Publishes
    cms:branding:updated:{org_id} so the frontend can react
    without a page refresh.

    Failures are logged but do not block the API response —
    the worker will backfill on its next cycle.
    """
    try:
        branding = extract_branding(profile)
        set_cached_branding(org_id, branding)
        _log.info("Branding cache updated for org %s", org_id)
    except Exception as e:
        _log.warning("Branding cache write-through failed for org %s: %s", org_id, e)


# ── Profile CRUD ──────────────────────────────────────

@router.get("/profile", response_model=BusinessProfileResponse)
async def get_profile(
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Get the business profile for the current org."""
    org_id = _get_org_id()
    profile = await repo.get_by_org(org_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Complete onboarding to create one.",
        )
    return profile


@router.post("/profile", response_model=BusinessProfileResponse, status_code=201)
async def create_profile(
    body: BusinessProfileCreate,
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Create the business profile (Step 1 of onboarding)."""
    org_id = _get_org_id()

    # Check if already exists
    existing = await repo.get_by_org(org_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Business profile already exists. Use PUT to update.",
        )

    data = body.model_dump(exclude_none=True)
    data["onboarding_step"] = 1
    profile = await repo.create(org_id, data)
    _log.info("Business profile created for org %s", org_id)

    # Write-through: cache branding immediately
    _update_branding_cache(org_id, profile)

    return profile


@router.put("/profile", response_model=BusinessProfileResponse)
async def update_profile(
    body: BusinessProfileUpdate,
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Update business profile fields."""
    org_id = _get_org_id()

    existing = await repo.get_by_org(org_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Create one first.",
        )

    data = body.model_dump(exclude_none=True)
    # Convert enums to strings for Supabase
    for key in ("business_type", "industry", "default_billing_cycle"):
        if key in data and hasattr(data[key], "value"):
            data[key] = data[key].value
    # Convert Decimal to float for JSON serialization
    for key in ("geo_latitude", "geo_longitude", "default_markup_pct"):
        if key in data and data[key] is not None:
            data[key] = float(data[key])

    profile = await repo.update(org_id, data)

    # Write-through: cache branding immediately
    _update_branding_cache(org_id, profile)

    return profile


@router.put("/profile/address", response_model=BusinessProfileResponse)
async def update_address(
    body: BusinessProfileAddressUpdate,
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Update primary business address (Step 2 of onboarding)."""
    org_id = _get_org_id()

    existing = await repo.get_by_org(org_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found. Create one first.",
        )

    data = body.model_dump(exclude_none=True)
    for key in ("geo_latitude", "geo_longitude"):
        if key in data and data[key] is not None:
            data[key] = float(data[key])

    # Advance onboarding if still on step 1
    if existing.get("onboarding_step", 0) < 2:
        data["onboarding_step"] = 2

    profile = await repo.update(org_id, data)

    # Write-through: cache branding immediately (address is part of branding)
    _update_branding_cache(org_id, profile)

    return profile


# ── Onboarding ────────────────────────────────────────

@router.get("/onboarding", response_model=OnboardingStatus)
async def get_onboarding_status(
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Check onboarding status — used by dashboard banner."""
    org_id = _get_org_id()
    return await repo.get_onboarding_status(org_id)


@router.put("/onboarding", response_model=BusinessProfileResponse)
async def update_onboarding(
    body: OnboardingStepUpdate,
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """Mark onboarding step complete."""
    org_id = _get_org_id()
    profile = await repo.update_onboarding(org_id, body.step, body.complete)
    return profile
