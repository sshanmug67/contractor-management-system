"""
Supabase Auth — JWT Validation (Business Owner Side)

Validates JWTs issued by Supabase Auth.
Used for all business owner / employee dashboard endpoints.
"""

from typing import Optional
import jwt
from app.config import get_settings


async def validate_supabase_jwt(token: str) -> Optional[dict]:
    """
    Validate a Supabase-issued JWT.
    
    Returns decoded payload with user_id (sub), email, role, etc.
    Returns None if invalid.
    """
    settings = get_settings()

    # TODO: Fetch Supabase JWT secret or JWKS
    # TODO: Decode and validate token
    # TODO: Check expiration
    # TODO: Return payload dict: { "sub": uuid, "email": str, "role": str }
    return None


async def get_user_profile(user_id: str, db) -> Optional[dict]:
    """
    Fetch the user_profile record for an authenticated Supabase user.
    
    Returns: { id, org_id, email, first_name, last_name, role }
    """
    # TODO: Query user_profiles where id = user_id
    # TODO: Return profile dict
    return None
