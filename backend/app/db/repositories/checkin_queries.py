"""
Check-in Queries

Handles:
- GPS check-in / check-out records
- Geo-fence verification data (worksite lat/lng/radius)
- Site presence analytics (from v_workgroup_site_presence view)
- Worker check-in history
"""

from typing import Optional
from app.db.repositories.base_repository import BaseRepository

# ── Cross-table: Check-in with worksite geo-fence data ────

GET_CHECKIN_CONTEXT = """
    SELECT
        ws.geo_latitude AS worksite_lat,
        ws.geo_longitude AS worksite_lng,
        ws.geo_fence_radius_m,
        ws.name AS worksite_name,
        ws.id AS worksite_id,
        wg.contractor_id
    FROM workgroups wg
    JOIN worksites ws ON wg.worksite_id = ws.id
    WHERE wg.id = :workgroup_id;
"""


class CheckinRepository(BaseRepository):
    """Queries for GPS check-in operations and site presence analytics."""

    TABLE = "site_checkins"

    async def create_checkin(self, data: dict) -> dict:
        """Record a GPS check-in."""
        return await self.insert_one(self.TABLE, data)

    async def checkout(self, checkin_id: str) -> dict:
        """Record check-out time."""
        return await self.update_one(self.TABLE, checkin_id, {
            "checked_out_at": "now()",
        })

    async def get_checkin_context(self, workgroup_id: str) -> Optional[dict]:
        """Get worksite geo-fence data for a workgroup (needed before check-in)."""
        result = (
            self.client.table("workgroups")
            .select("worksite_id, contractor_id, worksites(geo_latitude, geo_longitude, geo_fence_radius_m, name)")
            .eq("id", workgroup_id)
            .single()
            .execute()
        )
        return result.data

    async def list_checkins(
        self,
        workgroup_id: Optional[str] = None,
        worker_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> list[dict]:
        """List check-in records with optional filters."""
        query = (
            self.client.table(self.TABLE)
            .select("*, contractor_workers(first_name, last_name)")
        )

        if workgroup_id:
            query = query.eq("workgroup_id", workgroup_id)
        if worker_id:
            query = query.eq("worker_id", worker_id)
        if date_from:
            query = query.gte("checked_in_at", date_from)
        if date_to:
            query = query.lte("checked_in_at", date_to)

        query = query.order("checked_in_at", desc=True)
        result = query.execute()
        return result.data or []

    async def get_active_checkin(self, worker_id: str, workgroup_id: str) -> Optional[dict]:
        """Get current active check-in (no checkout) for a worker at a workgroup."""
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("worker_id", worker_id)
            .eq("workgroup_id", workgroup_id)
            .is_("checked_out_at", "null")
            .order("checked_in_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    # ── Presence analytics (from view) ────────────────────

    async def get_workgroup_presence(self, workgroup_id: str) -> Optional[dict]:
        """Get site presence summary from v_workgroup_site_presence."""
        result = (
            self.client.table("v_workgroup_site_presence")
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .single()
            .execute()
        )
        return result.data

    async def get_worksite_presence(self, worksite_id: str) -> list[dict]:
        """Get presence analytics for all workgroups at a worksite."""
        result = (
            self.client.table("v_workgroup_site_presence")
            .select("*")
            .eq("worksite_name", worksite_id)  # TODO: add worksite_id to view
            .execute()
        )
        return result.data or []

    # ── Worker had check-in for workgroup? (for invoice validation) ─

    async def has_site_presence(self, workgroup_id: str) -> bool:
        """Check if ANY check-ins exist for a workgroup (invoice validation #10)."""
        count = await self.count(self.TABLE, {"workgroup_id": workgroup_id})
        return count > 0
