"""
Base Repository — Shared Supabase Query Helpers

Provides reusable methods for common database operations.
All query repositories inherit from this.

Pattern mirrors CVE Intel's rag_base_repository.py approach.
"""

from typing import Optional
from supabase import Client


class SupabaseBaseRepository:
    """Base class for all query repositories."""

    def __init__(self, client: Client):
        self.client = client

    # ── Single-record operations ──────────────────────────

    async def fetch_one(self, table: str, id: str) -> Optional[dict]:
        """Fetch a single record by ID."""
        result = self.client.table(table).select("*").eq("id", id).single().execute()
        return result.data

    async def insert_one(self, table: str, data: dict) -> dict:
        """Insert a single record and return it."""
        result = self.client.table(table).insert(data).execute()
        return result.data[0] if result.data else {}

    async def update_one(self, table: str, id: str, data: dict) -> dict:
        """Update a single record by ID and return it."""
        result = self.client.table(table).update(data).eq("id", id).execute()
        return result.data[0] if result.data else {}

    async def delete_one(self, table: str, id: str) -> bool:
        """Delete a single record by ID."""
        result = self.client.table(table).delete().eq("id", id).execute()
        return len(result.data) > 0

    # ── List operations ───────────────────────────────────

    async def fetch_many(
        self,
        table: str,
        filters: Optional[dict] = None,
        order_by: str = "created_at",
        ascending: bool = False,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """Fetch multiple records with optional filters and pagination."""
        query = self.client.table(table).select("*")

        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)

        query = query.order(order_by, desc=not ascending)
        query = query.range(skip, skip + limit - 1)

        result = query.execute()
        return result.data or []

    # ── Raw SQL via Supabase RPC ──────────────────────────

    async def rpc(self, function_name: str, params: Optional[dict] = None) -> any:
        """Call a PostgreSQL function via Supabase RPC."""
        result = self.client.rpc(function_name, params or {}).execute()
        return result.data

    # ── Count ─────────────────────────────────────────────

    async def count(self, table: str, filters: Optional[dict] = None) -> int:
        """Count records with optional filters."""
        query = self.client.table(table).select("*", count="exact")

        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)

        result = query.execute()
        return result.count or 0
