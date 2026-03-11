"""
Database — Supabase Client

Provides a singleton Supabase client for all DB operations.
Uses the publishable key from project root .env.
"""

from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Initialize and cache the Supabase client.
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return client
