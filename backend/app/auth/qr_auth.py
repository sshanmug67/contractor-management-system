"""
QR Auth — Token + Shared Credential Validation (Contractor Side)

Validates the QR token (tied to a workgroup) and the company's
shared phone + email credentials.

Flow:
  QR link → Enter company email + phone → Validate → Session created
"""

from typing import Optional
from app.config import get_settings


async def validate_qr_token(token: str, db) -> Optional[dict]:
    """
    Look up and validate a QR token.
    
    Checks:
    - Token exists in qr_tokens table
    - Token is_active = True
    - Token has not expired (expires_at > now)
    
    Returns: { workgroup_id, contractor_id } or None
    """
    # TODO: Query qr_tokens where token = token AND is_active = True
    # TODO: Check expires_at
    # TODO: Return workgroup + contractor context
    return None


async def validate_contractor_credentials(
    contractor_id: str,
    email: str,
    phone: str,
    db,
) -> bool:
    """
    Verify the shared company credentials match the contractor record.
    
    Both email AND phone must match (case-insensitive email, normalized phone).
    """
    # TODO: Query contractors where id = contractor_id
    # TODO: Compare email (case-insensitive) and phone (normalized)
    # TODO: Check is_active = True
    return False


async def create_contractor_session(
    workgroup_id: str,
    contractor_id: str,
    worker_id: Optional[str] = None,
) -> str:
    """
    Create a session token for a contractor accessing a workgroup.
    
    The session token encodes: workgroup_id + contractor_id + worker_id.
    Persists for the life of the workgroup.
    
    Returns: signed session token string
    """
    settings = get_settings()
    # TODO: Create JWT or signed token with workgroup/contractor/worker context
    # TODO: Store session if needed
    # TODO: Return token string
    return ""


async def revoke_qr_token(workgroup_id: str, db) -> bool:
    """
    Revoke/deactivate QR token for a workgroup.
    Called when: workgroup completes, or business owner manually revokes.
    """
    # TODO: Update qr_tokens SET is_active = False WHERE workgroup_id = workgroup_id
    return False
