"""
Database — Supabase Client

Provides a singleton Supabase client for all DB operations.
Uses service role key for backend operations (bypasses RLS).
"""

from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Initialize and cache the Supabase client.

    Uses the service role key for full backend access.
    RLS policies are enforced on the frontend/anon key side.
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    return client
