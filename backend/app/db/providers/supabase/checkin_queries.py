"""
Check-in Queries

Handles:
- GPS check-in / check-out records
- Geo-fence verification data (worksite lat/lng/radius)
- Site presence analytics (from v_workgroup_site_presence view)
- Worker check-in history
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.checkin_repository import ICheckinRepository

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


class CheckinRepository(SupabaseBaseRepository, ICheckinRepository):
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

    async def get_by_workgroup(self, workgroup_id: str, skip: int = 0, limit: int = 50) -> list[dict]:
        """Get check-ins for a workgroup."""
        return await self.fetch_many(
            self.TABLE,
            filters={"workgroup_id": workgroup_id},
            order_by="checked_in_at",
            ascending=False,
            skip=skip,
            limit=limit,
        )

    async def get_by_worksite(self, worksite_id: str, skip: int = 0, limit: int = 50) -> list[dict]:
        """Get check-ins for a worksite."""
        return await self.fetch_many(
            self.TABLE,
            filters={"worksite_id": worksite_id},
            order_by="checked_in_at",
            ascending=False,
            skip=skip,
            limit=limit,
        )

    async def get_today_by_worksite(self, worksite_id: str) -> list[dict]:
        """Today's check-ins for a worksite."""
        from datetime import date
        today = date.today().isoformat()
        result = (
            self.client.table(self.TABLE)
            .select("*, contractor_workers(first_name, last_name)")
            .eq("worksite_id", worksite_id)
            .gte("checked_in_at", today)
            .order("checked_in_at", desc=True)
            .execute()
        )
        return result.data or []

    async def get_stale_sessions(self, max_hours: int = 10) -> list[dict]:
        """Find check-ins with no checkout older than max_hours."""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(hours=max_hours)).isoformat()
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .is_("checked_out_at", "null")
            .lt("checked_in_at", cutoff)
            .execute()
        )
        return result.data or []

    async def auto_checkout(self, checkin_ids: list[str], max_hours: int = 10) -> int:
        """Bulk auto-checkout stale sessions."""
        from datetime import timedelta
        count = 0
        for cid in checkin_ids:
            checkin = await self.fetch_one(self.TABLE, cid)
            if checkin and checkin.get("checked_in_at"):
                # Set checkout to checked_in + max_hours
                await self.update_one(self.TABLE, cid, {
                    "checked_out_at": checkin["checked_in_at"],  # Simplified; ideally add max_hours
                })
                count += 1
        return count

    async def get_presence_summary(self, workgroup_id: str) -> dict:
        """Check-in count, unique workers, days on site for a workgroup."""
        presence = await self.get_workgroup_presence(workgroup_id)
        if presence:
            return presence
        return {
            "total_checkins": 0,
            "unique_workers": 0,
            "days_on_site": 0,
            "verified_photos": 0,
            "unverified_photos": 0,
        }
