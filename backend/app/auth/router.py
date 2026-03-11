"""
CMS Auth Router

Endpoints:
- Business Owner: Supabase Auth (email/password/SSO)
- Contractor: QR token + shared company credentials
- Worker: Self-identification on first access
"""

from fastapi import APIRouter, Depends
from app.db.supabase_client import get_supabase_client

router = APIRouter()


# ── Business Owner Auth (Supabase) ────────────────────

@router.post("/login")
async def login(email: str, password: str):
    """
    Business owner login via Supabase Auth.
    Returns JWT access token + refresh token.
    """
    # TODO: Call Supabase auth.sign_in_with_password()
    # TODO: Return tokens
    return {"detail": "Not implemented"}


@router.post("/register")
async def register(email: str, password: str, org_name: str):
    """
    Register new business owner + create organization.
    Creates: auth user → organization → user_profile
    """
    # TODO: Supabase auth.sign_up()
    # TODO: Create organization record
    # TODO: Create user_profile linked to org
    return {"detail": "Not implemented"}


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh an expired JWT using Supabase refresh token."""
    # TODO: Supabase auth.refresh_session()
    return {"detail": "Not implemented"}


# ── QR Code / Contractor Auth ─────────────────────────

@router.post("/qr-verify")
async def qr_verify(token: str, company_email: str, company_phone: str):
    """
    Step 4 of QR auth flow: Validate QR token + shared credentials.
    
    Checks:
    1. QR token is valid and not expired
    2. Email + phone match the contractor company linked to token
    3. Contractor company is active
    
    Returns: session token for the contractor app.
    """
    # TODO: Look up qr_tokens by token
    # TODO: Validate contractor credentials match
    # TODO: Check contractor is_active
    # TODO: Generate session token
    # TODO: Return session + workgroup context
    return {"detail": "Not implemented"}


@router.post("/self-id")
async def worker_self_identify(
    session_token: str,
    first_name: str,
    last_name: str,
    phone: str,
    email: str = None,
):
    """
    Step 5 of QR auth flow: Worker self-identification (first time only).
    
    Creates a contractor_worker record linked to the contractor company.
    Subsequent access from same device/session skips this step.
    """
    # TODO: Validate session token
    # TODO: Check if worker already identified for this session
    # TODO: Create contractor_worker record
    # TODO: Link worker to session
    # TODO: Return updated session with worker_id
    return {"detail": "Not implemented"}


@router.get("/session")
async def get_session(session_token: str):
    """
    Check current session status.
    Returns worker info + accessible workgroups.
    """
    # TODO: Validate session
    # TODO: Return worker profile + workgroup list
    return {"detail": "Not implemented"}
