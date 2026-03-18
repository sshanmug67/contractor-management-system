"""
CMS Backend — Dependency Injection

Provides shared dependencies to route handlers via ProviderRegistry.
Provider selection (Supabase vs self-hosted) is handled by the registry.
Route handlers never know which provider they're using.

Changes from original:
- Removed direct Supabase client injection
- All repositories accessed via ProviderRegistry
- Auth dependencies remain provider-aware (will be abstracted in Phase B)
"""

from fastapi import Depends, HTTPException, Header, status
from typing import Optional

from app.config import get_settings
from app.providers import get_provider_registry, ProviderRegistry

# Import interfaces for type hints (not implementations)
from app.db.interfaces import (
    IProjectRepository,
    IWorksiteRepository,
    IWorkgroupRepository,
    IJobRepository,
    IInvoiceRepository,
    IContractorRepository,
    ICheckinRepository,
    IDashboardRepository,
    IAllocationRepository,
    IAuthRepository,
    ILocationRepository,
)


# ── Provider Registry ─────────────────────────────────────

def get_providers() -> ProviderRegistry:
    """Get the singleton ProviderRegistry."""
    return get_provider_registry()


# ── Repository Dependencies ───────────────────────────────
# Each returns the interface type, hiding the concrete provider.

def get_project_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IProjectRepository:
    return providers.projects

def get_worksite_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IWorksiteRepository:
    return providers.worksites

def get_workgroup_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IWorkgroupRepository:
    return providers.workgroups

def get_job_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IJobRepository:
    return providers.jobs

def get_invoice_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IInvoiceRepository:
    return providers.invoices

def get_contractor_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IContractorRepository:
    return providers.contractors

def get_checkin_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> ICheckinRepository:
    return providers.checkins

def get_dashboard_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IDashboardRepository:
    return providers.dashboard

def get_allocation_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IAllocationRepository:
    return providers.allocation

def get_auth_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> IAuthRepository:
    return providers.auth

def get_location_repo(
    providers: ProviderRegistry = Depends(get_providers),
) -> ILocationRepository:
    return providers.locations


# ── Business Owner Auth (Supabase JWT) ────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_repo: IAuthRepository = Depends(get_auth_repo),
):
    """
    Validate JWT from Authorization header.
    Returns the authenticated user profile with org context.

    Used for: Business Owner dashboard endpoints.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.split(" ")[1]

    # TODO: Validate JWT via AuthProvider (Phase B abstraction)
    # For now, Supabase JWT validation
    # user_id = validate_supabase_jwt(token)
    # profile = await auth_repo.get_user_profile(user_id)
    # return profile

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth not yet implemented",
    )


# ── Contractor Worker Auth (QR Token) ─────────────────────

async def get_current_worker(
    authorization: Optional[str] = Header(None),
    auth_repo: IAuthRepository = Depends(get_auth_repo),
):
    """
    Validate QR session token from Authorization header.
    Returns the authenticated contractor worker with workgroup context.

    Used for: Contractor app endpoints.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid session token",
        )

    token = authorization.split(" ")[1]

    # TODO: Decode session token
    # TODO: Look up worker + contractor + workgroup context
    # session = await auth_repo.validate_qr_token(token)
    # ...

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Worker auth not yet implemented",
    )


# ── Org Scope Helper ──────────────────────────────────────

async def get_org_id(current_user=Depends(get_current_user)) -> str:
    """Extract org_id from authenticated user for scoping queries."""
    return current_user["org_id"]
