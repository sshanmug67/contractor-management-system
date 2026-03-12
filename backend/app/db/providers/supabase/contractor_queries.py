"""
Contractor Queries

Handles:
- Contractor CRUD + skill search
- Contractor detail (joins: contractor_workers, workgroups, verifications)
- Worker management (read-only from business side)
- Verification records
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.contractor_repository import IContractorRepository

class ContractorRepository(SupabaseBaseRepository, IContractorRepository):
    """Queries for contractor pool management."""

    TABLE = "contractors"

    async def list_contractors(
        self,
        org_id: str,
        skills: Optional[list[str]] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """List contractors with optional skill/active/search filters."""
        query = self.client.table(self.TABLE).select("*").eq("org_id", org_id)

        if is_active is not None:
            query = query.eq("is_active", is_active)
        if search:
            query = query.ilike("company_name", f"%{search}%")
        if skills:
            query = query.contains("skills", skills)

        query = query.order("company_name").range(skip, skip + limit - 1)
        result = query.execute()
        return result.data or []

    async def create_contractor(self, org_id: str, data: dict) -> dict:
        """Register a new contractor company."""
        data["org_id"] = org_id
        return await self.insert_one(self.TABLE, data)

    async def get_contractor(self, contractor_id: str) -> Optional[dict]:
        """Get basic contractor record."""
        return await self.fetch_one(self.TABLE, contractor_id)

    async def get_contractor_detail(self, contractor_id: str) -> dict:
        """Get contractor with workers, active workgroups, and verifications."""
        contractor = await self.fetch_one(self.TABLE, contractor_id)

        workers = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("first_seen_at")
            .execute()
        )

        active_workgroups = (
            self.client.table("workgroups")
            .select("*, worksites(name)")
            .eq("contractor_id", contractor_id)
            .in_("status", ["pending", "accepted", "in_progress"])
            .execute()
        )

        verifications = (
            self.client.table("contractor_verifications")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "contractor": contractor,
            "workers": workers.data or [],
            "active_workgroups": active_workgroups.data or [],
            "verifications": verifications.data or [],
        }

    async def update_contractor(self, contractor_id: str, data: dict) -> dict:
        """Update contractor details."""
        return await self.update_one(self.TABLE, contractor_id, data)

    async def deactivate_contractor(self, contractor_id: str) -> dict:
        """Soft delete — sets is_active=False."""
        return await self.update_one(self.TABLE, contractor_id, {"is_active": False})

    # ── Workers ───────────────────────────────────────────

    async def list_workers(self, contractor_id: str) -> list[dict]:
        """List self-identified workers for a contractor."""
        result = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("first_seen_at")
            .execute()
        )
        return result.data or []

    async def get_worker(self, worker_id: str) -> Optional[dict]:
        """Get a single worker record."""
        return await self.fetch_one("contractor_workers", worker_id)

    # ── Verifications ─────────────────────────────────────

    async def add_verification(self, contractor_id: str, data: dict) -> dict:
        """Create a verification record."""
        data["contractor_id"] = contractor_id
        return await self.insert_one("contractor_verifications", data)

    async def list_verifications(self, contractor_id: str) -> list[dict]:
        """List all verification records for a contractor."""
        result = (
            self.client.table("contractor_verifications")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    async def get_expiring_verifications(self, days_ahead: int = 30) -> list[dict]:
        """Find verifications expiring within N days (for scheduled alerts)."""
        # TODO: expires_at < NOW() + interval days_ahead days
        return []

    async def search_by_skills(
        self, org_id: str, skills: list[str],
        worksite_lat: float = None, worksite_lng: float = None,
    ) -> list[dict]:
        """Find contractors matching skills, optionally sorted by proximity."""
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .overlaps("skills", skills)
            .execute()
        )
        return result.data or []

    async def upsert_worker(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: str = None,
    ) -> dict:
        """Create or update a self-identified worker."""
        # Check if worker exists by phone + contractor
        existing = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .eq("phone", phone)
            .limit(1)
            .execute()
        )
        if existing.data:
            worker_id = existing.data[0]["id"]
            return await self.update_one("contractor_workers", worker_id, {
                "last_active_at": "now()",
            })
        else:
            return await self.insert_one("contractor_workers", {
                "contractor_id": contractor_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "email": email,
            })

    async def get_workers(self, contractor_id: str) -> list[dict]:
        """Get all self-identified workers for a contractor company."""
        result = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("first_seen_at")
            .execute()
        )
        return result.data or []

    async def add_verification(self, contractor_id: str, data: dict) -> dict:
        """Add a verification record."""
        data["contractor_id"] = contractor_id
        return await self.insert_one("contractor_verifications", data)

    async def get_verifications(self, contractor_id: str) -> list[dict]:
        """Get all verification records for a contractor."""
        result = (
            self.client.table("contractor_verifications")
            .select("*")
            .eq("contractor_id", contractor_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    async def get_stale_verifications(self, days_threshold: int = 30) -> list[dict]:
        """Get contractors needing re-verification."""
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=days_threshold)).isoformat()
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("is_active", True)
            .or_(f"last_verified_at.is.null,last_verified_at.lt.{cutoff}")
            .execute()
        )
        return result.data or []

    async def update_verification_status(self, contractor_id: str, status: str) -> None:
        """Update contractor verification status."""
        from datetime import datetime
        await self.update_one("contractors", contractor_id, {
            "verification_status": status,
            "last_verified_at": datetime.utcnow().isoformat(),
        })

    async def validate_credentials(self, email: str, phone: str) -> dict:
        """Validate contractor company shared credentials (QR auth)."""
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("email", email)
            .eq("phone", phone)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
