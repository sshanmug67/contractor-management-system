"""
Worksite Queries

Handles:
- Worksite CRUD
- Worksite detail with contact persons (joins: worksite_contacts, business_employees)
- Worksite with workgroup summaries
- Contact person assignment/removal
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.worksite_repository import IWorksiteRepository

# ── Cross-table: Worksite detail with contacts ────────────

GET_WORKSITE_DETAIL = """
    SELECT * FROM v_worksite_with_contacts
    WHERE id = :worksite_id;
"""

# ── Cross-table: Workgroups at a worksite with progress ───

GET_WORKSITE_WORKGROUPS = """
    SELECT
        wg.*,
        c.company_name AS contractor_name,
        COUNT(DISTINCT j.id) AS job_count,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('complete', 'invoiced', 'paid')) AS jobs_complete
    FROM workgroups wg
    LEFT JOIN contractors c ON wg.contractor_id = c.id
    LEFT JOIN jobs j ON wg.id = j.workgroup_id
    WHERE wg.worksite_id = :worksite_id
    GROUP BY wg.id, c.company_name
    ORDER BY wg.start_date, wg.title;
"""


class WorksiteRepository(SupabaseBaseRepository, IWorksiteRepository):
    """Queries for worksite + contact person operations."""

    TABLE = "worksites"

    async def list_worksites(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        """List worksites, optionally filtered by project."""
        query = self.client.table(self.TABLE).select("*")
        if project_id:
            query = query.eq("project_id", project_id)
        if status:
            query = query.eq("status", status)
        query = query.order("start_date")
        result = query.execute()
        return result.data or []

    async def create_worksite(self, data: dict) -> dict:
        """Create a new worksite."""
        return await self.insert_one(self.TABLE, data)

    async def get_worksite(self, worksite_id: str) -> Optional[dict]:
        """Get basic worksite record."""
        return await self.fetch_one(self.TABLE, worksite_id)

    async def get_worksite_detail(self, worksite_id: str) -> Optional[dict]:
        """Get worksite with contacts from v_worksite_with_contacts view."""
        result = (
            self.client.table("v_worksite_with_contacts")
            .select("*")
            .eq("id", worksite_id)
            .single()
            .execute()
        )
        return result.data

    async def get_worksite_workgroups(self, worksite_id: str) -> list[dict]:
        """Get all workgroups at a worksite with contractor names and job counts."""
        result = (
            self.client.table("workgroups")
            .select("*, contractors(company_name), jobs(count)")
            .eq("worksite_id", worksite_id)
            .order("start_date")
            .execute()
        )
        return result.data or []

    async def update_worksite(self, worksite_id: str, data: dict) -> dict:
        """Update worksite fields."""
        return await self.update_one(self.TABLE, worksite_id, data)

    async def delete_worksite(self, worksite_id: str) -> bool:
        """Delete worksite (cascades to workgroups → jobs)."""
        return await self.delete_one(self.TABLE, worksite_id)

    # ── Contact Person Management ─────────────────────────

    async def assign_contact(self, worksite_id: str, employee_id: str, contact_role: str) -> dict:
        """Assign a business employee as contact for a worksite."""
        return await self.insert_one("worksite_contacts", {
            "worksite_id": worksite_id,
            "employee_id": employee_id,
            "contact_role": contact_role,
        })

    async def list_contacts(self, worksite_id: str) -> list[dict]:
        """List contact persons for a worksite with employee details."""
        result = (
            self.client.table("worksite_contacts")
            .select("*, business_employees(*)")
            .eq("worksite_id", worksite_id)
            .execute()
        )
        return result.data or []

    async def remove_contact(self, worksite_id: str, employee_id: str) -> bool:
        """Remove a contact person from a worksite."""
        result = (
            self.client.table("worksite_contacts")
            .delete()
            .eq("worksite_id", worksite_id)
            .eq("employee_id", employee_id)
            .execute()
        )
        return len(result.data) > 0

    async def get_primary_contacts(self, worksite_id: str) -> list[dict]:
        """Get primary contact(s) for notification routing."""
        result = (
            self.client.table("worksite_contacts")
            .select("*, business_employees(*)")
            .eq("worksite_id", worksite_id)
            .eq("contact_role", "primary")
            .execute()
        )
        return result.data or []

    async def cascade_progress(self, worksite_id: str):
        """Recalculate worksite progress from workgroup averages."""
        return await self.rpc("fn_recalculate_worksite_progress", {"p_worksite_id": worksite_id})

    async def get_contacts(self, worksite_id: str) -> list[dict]:
        """Get all contacts for a worksite with employee details."""
        result = (
            self.client.table("worksite_contacts")
            .select("*, business_employees(*)")
            .eq("worksite_id", worksite_id)
            .execute()
        )
        return result.data or []

    async def update_progress(self, worksite_id: str, progress_pct: float) -> None:
        """Update worksite progress percentage."""
        await self.update_one("worksites", worksite_id, {
            "progress_pct": progress_pct,
        })
