"""
Router — Branding

Lightweight endpoint that returns the company branding context
for the current org. Called once on frontend app init to populate
sidebar, page titles, invoice headers, etc.

Read path: Redis L2 cache → Supabase fallback → cache backfill.
Write path: dashboard_stats_worker (periodic) + settings router (on save).
"""

import logging
from fastapi import APIRouter, Depends

from app.db.interfaces.business_profile_repository import IBusinessProfileRepository
from app.providers import get_provider_registry, ProviderRegistry
from app.cache.branding_cache import get_cached_branding, set_cached_branding, extract_branding

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Branding"])


# ── Dependency ────────────────────────────────────────

def get_profile_repo(
    providers: ProviderRegistry = Depends(lambda: get_provider_registry()),
) -> IBusinessProfileRepository:
    return providers.business_profiles


# ── Dev-mode org resolver ─────────────────────────────

def _get_org_id() -> str:
    """Temporary: return dev org_id. Replace with auth."""
    import os
    return os.environ.get(
        "DEV_ORG_ID",
        "a0000000-0000-0000-0000-000000000001",
    )


# ── Branding Endpoint ─────────────────────────────────

@router.get("/branding")
async def get_branding(
    repo: IBusinessProfileRepository = Depends(get_profile_repo),
):
    """
    Get company branding for the current org.

    Returns company name, logo, address, and invoice defaults.
    Reads from Redis L2 cache first. On cache miss, falls through
    to Supabase and backfills the cache for next request.

    Called by frontend on app init — powers sidebar, page titles,
    invoice headers, PDF exports, and contractor-facing views.
    """
    org_id = _get_org_id()

    # ── 1. Try Redis cache ────────────────────────────
    cached = get_cached_branding(org_id)
    if cached:
        return cached

    # ── 2. Cache miss → query Supabase ────────────────
    _log.info("Branding cache miss for org %s — querying DB", org_id)
    profile = await repo.get_by_org(org_id)

    if not profile:
        return {
            "company_name": "CMS",
            "logo_url": None,
            "industry": None,
        }

    # ── 3. Extract branding fields + backfill cache ───
    branding = extract_branding(profile)
    set_cached_branding(org_id, branding)

    return branding
