"""
CMS Backend — Dependency Injection

Provides shared dependencies to route handlers:
- Supabase client
- Repository instances (query-oriented, cross-table)
- Current authenticated user (business owner side)
- Current contractor worker (QR auth side)
"""

from fastapi import Depends, HTTPException, Header, status
from typing import Optional

from app.config import get_settings
from app.db.supabase_client import get_supabase_client
from app.db.repositories import (
    ProjectRepository,
    WorksiteRepository,
    WorkgroupRepository,
    JobRepository,
    InvoiceRepository,
    ContractorRepository,
    CheckinRepository,
    DashboardRepository,
    AllocationRepository,
    AuthRepository,
)


# ── Supabase Client ───────────────────────────────────────

def get_db():
    """Get Supabase client instance."""
    return get_supabase_client()


# ── Repository Factory ────────────────────────────────────
# Each repository gets the shared Supabase client.
# Route handlers depend on the specific repository they need.

def get_project_repo(db=Depends(get_db)) -> ProjectRepository:
    return ProjectRepository(db)

def get_worksite_repo(db=Depends(get_db)) -> WorksiteRepository:
    return WorksiteRepository(db)

def get_workgroup_repo(db=Depends(get_db)) -> WorkgroupRepository:
    return WorkgroupRepository(db)

def get_job_repo(db=Depends(get_db)) -> JobRepository:
    return JobRepository(db)

def get_invoice_repo(db=Depends(get_db)) -> InvoiceRepository:
    return InvoiceRepository(db)

def get_contractor_repo(db=Depends(get_db)) -> ContractorRepository:
    return ContractorRepository(db)

def get_checkin_repo(db=Depends(get_db)) -> CheckinRepository:
    return CheckinRepository(db)

def get_dashboard_repo(db=Depends(get_db)) -> DashboardRepository:
    return DashboardRepository(db)

def get_allocation_repo(db=Depends(get_db)) -> AllocationRepository:
    return AllocationRepository(db)

def get_auth_repo(db=Depends(get_db)) -> AuthRepository:
    return AuthRepository(db)


# ── Business Owner Auth (Supabase JWT) ────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_repo: AuthRepository = Depends(get_auth_repo),
):
    """
    Validate Supabase JWT from Authorization header.
    Returns the authenticated user profile with org context.

    Used for: Business Owner dashboard endpoints.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.split(" ")[1]

    # TODO: Validate JWT via Supabase Auth
    # TODO: Extract user_id from JWT payload
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
    auth_repo: AuthRepository = Depends(get_auth_repo),
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
    # TODO: Update last_active_at
    # TODO: Return worker dict

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Worker auth not yet implemented",
    )


# ── Org Scope Helper ──────────────────────────────────────

async def get_org_id(current_user=Depends(get_current_user)) -> str:
    """Extract org_id from authenticated user for scoping queries."""
    return current_user["org_id"]
