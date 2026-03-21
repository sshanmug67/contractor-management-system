"""
Auth Queries

Handles:
- QR token validation (joins: qr_tokens, contractors, workgroups)
- Contractor credential verification
- Worker self-identification + lookup
- User profile lookup (business owner side)
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.auth_repository import IAuthRepository

# ── Cross-table: QR token with full context ───────────────

GET_QR_TOKEN_CONTEXT = """
    SELECT
        qt.id AS token_id,
        qt.token,
        qt.is_active,
        qt.expires_at,
        qt.workgroup_id,
        qt.contractor_id,
        wg.title AS workgroup_title,
        wg.status AS workgroup_status,
        ws.name AS worksite_name,
        ws.address_line1 AS worksite_address,
        c.company_name,
        c.email AS company_email,
        c.phone AS company_phone
    FROM qr_tokens qt
    JOIN workgroups wg ON qt.workgroup_id = wg.id
    JOIN worksites ws ON wg.worksite_id = ws.id
    JOIN contractors c ON qt.contractor_id = c.id
    WHERE qt.token = :token
      AND qt.is_active = TRUE;
"""


class AuthRepository(SupabaseBaseRepository, IAuthRepository):
    """Queries for authentication and session management."""

    # ── Business Owner Auth ───────────────────────────────

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """
        Fetch user_profile for an authenticated Supabase user.

        Joins through organizations to business_profiles for branding:
        company_name, logo, phone, email, industry, invoice defaults.
        organizations.name is deprecated — company identity lives
        in business_profiles (1:1 with organizations).
        """
        result = (
            self.client.table("user_profiles")
            .select(
                "*, organizations("
                "template, settings, "
                "business_profiles("
                "company_name, dba_name, logo_url, "
                "phone, email, industry, "
                "invoice_prefix, default_markup_pct, default_billing_cycle"
                ")"
                ")"
            )
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data

    async def create_user_profile(self, data: dict) -> dict:
        """Create a user_profile (during registration)."""
        return await self.insert_one("user_profiles", data)

    # ── QR Token ──────────────────────────────────────────

    async def validate_qr_token(self, token: str) -> Optional[dict]:
        """Look up QR token with full workgroup/contractor context."""
        result = (
            self.client.table("qr_tokens")
            .select("*, workgroups(title, status, worksites(name, address_line1)), contractors(company_name, email, phone)")
            .eq("token", token)
            .eq("is_active", True)
            .single()
            .execute()
        )
        return result.data

    async def create_qr_token(self, workgroup_id: str, contractor_id: str, token: str, expires_at: Optional[str] = None) -> dict:
        """Create a new QR token for a workgroup allocation."""
        data = {
            "workgroup_id": workgroup_id,
            "contractor_id": contractor_id,
            "token": token,
            "is_active": True,
        }
        if expires_at:
            data["expires_at"] = expires_at
        return await self.insert_one("qr_tokens", data)

    async def revoke_qr_token(self, workgroup_id: str) -> bool:
        """Deactivate QR token(s) for a workgroup."""
        result = (
            self.client.table("qr_tokens")
            .update({"is_active": False})
            .eq("workgroup_id", workgroup_id)
            .execute()
        )
        return len(result.data) > 0

    # ── Contractor Credential Verification ────────────────

    async def verify_contractor_credentials(self, contractor_id: str, email: str, phone: str) -> bool:
        """Check if email+phone match the contractor record."""
        result = (
            self.client.table("contractors")
            .select("id")
            .eq("id", contractor_id)
            .ilike("email", email)
            .eq("phone", phone)
            .eq("is_active", True)
            .execute()
        )
        return len(result.data) > 0

    # ── Worker Self-Identification ────────────────────────

    async def find_worker_by_phone(self, contractor_id: str, phone: str) -> Optional[dict]:
        """Check if a worker has already self-identified (by phone)."""
        result = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .eq("phone", phone)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def create_worker(self, data: dict) -> dict:
        """Create a contractor_worker record (first-time self-ID)."""
        return await self.insert_one("contractor_workers", data)

    async def update_worker_activity(self, worker_id: str) -> None:
        """Update last_active_at timestamp."""
        self.client.table("contractor_workers").update({
            "last_active_at": "now()",
        }).eq("id", worker_id).execute()

    # ── Worker's accessible workgroups ────────────────────

    async def get_worker_workgroups(self, contractor_id: str) -> list[dict]:
        """Get all accessible workgroups for a contractor (worker dashboard)."""
        result = (
            self.client.table("workgroups")
            .select("*, worksites(name, address_line1, city, state)")
            .eq("contractor_id", contractor_id)
            .in_("status", ["pending", "accepted", "in_progress", "review", "complete"])
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    # ── Employees (business side, for contact management) ─

    async def list_employees(self, org_id: str, is_active: Optional[bool] = None) -> list[dict]:
        """List business employees for an org."""
        query = self.client.table("business_employees").select("*").eq("org_id", org_id)
        if is_active is not None:
            query = query.eq("is_active", is_active)
        result = query.order("first_name").execute()
        return result.data or []

    async def create_employee(self, org_id: str, data: dict) -> dict:
        """Create a business employee."""
        data["org_id"] = org_id
        return await self.insert_one("business_employees", data)

    async def get_employee_detail(self, employee_id: str) -> dict:
        """Get employee with worksite assignments."""
        employee = await self.fetch_one("business_employees", employee_id)

        assignments = (
            self.client.table("worksite_contacts")
            .select("contact_role, worksites(id, name)")
            .eq("employee_id", employee_id)
            .execute()
        )

        return {
            "employee": employee,
            "worksite_assignments": assignments.data or [],
        }

    async def deactivate_qr_token(self, workgroup_id: str) -> bool:
        """Deactivate QR tokens for a completed workgroup."""
        result = (
            self.client.table("qr_tokens")
            .update({"is_active": False})
            .eq("workgroup_id", workgroup_id)
            .execute()
        )
        return len(result.data or []) > 0

    async def expire_old_tokens(self) -> int:
        """Deactivate all expired QR tokens."""
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        result = (
            self.client.table("qr_tokens")
            .update({"is_active": False})
            .eq("is_active", True)
            .lt("expires_at", now)
            .execute()
        )
        return len(result.data or [])

    async def get_or_create_worker_session(
        self, contractor_id: str, first_name: str, last_name: str,
        phone: str, email: str = None,
    ) -> dict:
        """Look up or create a self-identified worker."""
        # Check if worker already exists
        existing = (
            self.client.table("contractor_workers")
            .select("*")
            .eq("contractor_id", contractor_id)
            .eq("phone", phone)
            .limit(1)
            .execute()
        )
        if existing.data:
            worker = existing.data[0]
            # Update last active
            await self.update_one("contractor_workers", worker["id"], {
                "last_active_at": "now()",
            })
            return worker
        else:
            return await self.insert_one("contractor_workers", {
                "contractor_id": contractor_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "email": email,
            })

    async def update_worker_last_active(self, worker_id: str) -> None:
        """Update last_active_at timestamp."""
        await self.update_one("contractor_workers", worker_id, {
            "last_active_at": "now()",
        })
