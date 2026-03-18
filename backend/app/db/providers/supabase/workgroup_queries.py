"""
Workgroup Queries

Handles:
- Workgroup CRUD
- Workgroup detail (joins 7 tables: workgroups, worksites, contractors, jobs, invoices, site_checkins, dependencies)
- Allocation (assign contractor, generate QR)
- Accept/reject flow
- Dependency management

v3 MIGRATION CHANGES:
  - Added: list_by_project() — primary query pattern (direct project_id, no worksite join)
  - Fixed: GET_WORKGROUP_DETAIL — JOIN worksites changed to LEFT JOIN for null worksite_id
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.workgroup_repository import IWorkgroupRepository

# ── Cross-table: Full workgroup detail ────────────────────
# This is the core query — one API call, 7 tables

GET_WORKGROUP_DETAIL = """
    SELECT
        wg.*,
        ws.name AS worksite_name,
        ws.geo_latitude AS worksite_lat,
        ws.geo_longitude AS worksite_lng,
        ws.geo_fence_radius_m,
        c.company_name AS contractor_name,
        c.phone AS contractor_phone,
        c.email AS contractor_email,

        -- Job summary
        (SELECT COUNT(*) FROM jobs WHERE workgroup_id = wg.id) AS job_count,
        (SELECT COUNT(*) FROM jobs
         WHERE workgroup_id = wg.id
           AND status IN ('complete', 'invoiced', 'paid')) AS jobs_complete,

        -- Invoice summary (from view)
        COALESCE((
            SELECT SUM(amount) FROM invoices
            WHERE workgroup_id = wg.id AND status != 'rejected'
        ), 0) AS total_invoiced,
        COALESCE((
            SELECT SUM(amount) FROM invoices
            WHERE workgroup_id = wg.id AND status = 'paid'
        ), 0) AS total_paid,

        -- Site presence summary
        (SELECT COUNT(*) FROM site_checkins
         WHERE workgroup_id = wg.id) AS total_checkins,
        (SELECT COUNT(DISTINCT worker_id) FROM site_checkins
         WHERE workgroup_id = wg.id) AS unique_workers

    FROM workgroups wg
    LEFT JOIN worksites ws ON wg.worksite_id = ws.id
    LEFT JOIN contractors c ON wg.contractor_id = c.id
    WHERE wg.id = :workgroup_id;
"""

# ── Cross-table: Jobs with invoice status ─────────────────

GET_WORKGROUP_JOBS = """
    SELECT
        j.*,
        i.invoice_number,
        i.status AS invoice_status,
        i.amount AS invoice_amount
    FROM jobs j
    LEFT JOIN invoices i ON j.invoice_id = i.id
    WHERE j.workgroup_id = :workgroup_id
    ORDER BY j.sequence;
"""

# ── Cross-table: Dependencies with completion status ──────

GET_WORKGROUP_DEPENDENCIES = """
    SELECT
        wd.*,
        dep_wg.title AS depends_on_title,
        dep_wg.status AS depends_on_status,
        dep_wg.progress_pct AS depends_on_progress,
        (dep_wg.status = 'complete') AS is_satisfied
    FROM workgroup_dependencies wd
    JOIN workgroups dep_wg ON wd.depends_on_workgroup_id = dep_wg.id
    WHERE wd.workgroup_id = :workgroup_id;
"""

# ── Cross-table: Who accepted + worker who did it ─────────

GET_ACCEPTANCE_INFO = """
    SELECT
        wg.accepted_at,
        cw.first_name || ' ' || cw.last_name AS accepted_by_name,
        cw.phone AS accepted_by_phone
    FROM workgroups wg
    LEFT JOIN contractor_workers cw ON wg.accepted_by = cw.id
    WHERE wg.id = :workgroup_id;
"""


class WorkgroupRepository(SupabaseBaseRepository, IWorkgroupRepository):
    """Queries for workgroup operations — the core of the CMS workflow."""

    TABLE = "workgroups"

    async def list_workgroups(
        self,
        worksite_id: Optional[str] = None,
        contractor_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        """List workgroups with optional filters."""
        query = self.client.table(self.TABLE).select("*, contractors(company_name)")

        if worksite_id:
            query = query.eq("worksite_id", worksite_id)
        if contractor_id:
            query = query.eq("contractor_id", contractor_id)
        if status:
            query = query.eq("status", status)

        query = query.order("start_date")
        result = query.execute()
        return result.data or []

    async def list_by_project(
        self,
        project_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """
        v3 NEW — Primary query pattern.
        List all workgroups for a project (direct, no worksite join).
        """
        query = (
            self.client.table(self.TABLE)
            .select("*, contractors(company_name)")
            .eq("project_id", project_id)
        )

        if status:
            query = query.eq("status", status)

        query = query.order("start_date").range(skip, skip + limit - 1)
        result = query.execute()
        return result.data or []

    async def create_workgroup(self, data: dict) -> dict:
        """Create a workgroup within a worksite."""
        return await self.insert_one(self.TABLE, data)

    async def get_workgroup(self, workgroup_id: str) -> Optional[dict]:
        """Get basic workgroup record."""
        return await self.fetch_one(self.TABLE, workgroup_id)

    async def get_workgroup_detail(self, workgroup_id: str) -> dict:
        """
        Get full workgroup detail — the 7-table join.
        Returns workgroup + jobs + dependencies + presence stats.
        """
        # Main detail (workgroup + worksite + contractor + aggregates)
        wg = (
            self.client.table(self.TABLE)
            .select("*, worksites(name, geo_latitude, geo_longitude, geo_fence_radius_m), contractors(company_name, phone, email)")
            .eq("id", workgroup_id)
            .single()
            .execute()
        )

        # Jobs with invoice status
        jobs = (
            self.client.table("jobs")
            .select("*, invoices(invoice_number, status, amount)")
            .eq("workgroup_id", workgroup_id)
            .order("sequence")
            .execute()
        )

        # Dependencies
        deps = (
            self.client.table("workgroup_dependencies")
            .select("*, depends_on:depends_on_workgroup_id(title, status, progress_pct)")
            .eq("workgroup_id", workgroup_id)
            .execute()
        )

        # Invoice summary from view
        inv_summary = (
            self.client.table("v_workgroup_invoice_summary")
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .single()
            .execute()
        )

        # Site presence from view
        presence = (
            self.client.table("v_workgroup_site_presence")
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .single()
            .execute()
        )

        return {
            "workgroup": wg.data,
            "jobs": jobs.data or [],
            "dependencies": deps.data or [],
            "invoice_summary": inv_summary.data,
            "site_presence": presence.data,
        }

    async def update_workgroup(self, workgroup_id: str, data: dict) -> dict:
        """Update workgroup fields."""
        return await self.update_one(self.TABLE, workgroup_id, data)

    async def delete_workgroup(self, workgroup_id: str) -> bool:
        """Delete workgroup (cascades to jobs)."""
        return await self.delete_one(self.TABLE, workgroup_id)

    # ── Allocation ────────────────────────────────────────

    async def allocate_contractor(self, workgroup_id: str, contractor_id: str) -> dict:
        """Assign a contractor and set status to pending."""
        return await self.update_one(self.TABLE, workgroup_id, {
            "contractor_id": contractor_id,
            "status": "pending",
        })

    # ── Accept / Reject ───────────────────────────────────

    async def accept_workgroup(self, workgroup_id: str, worker_id: str) -> dict:
        """Contractor accepts — set status, record who accepted."""
        return await self.update_one(self.TABLE, workgroup_id, {
            "status": "in_progress",
            "accepted_by": worker_id,
            "accepted_at": "now()",
        })

    async def reject_workgroup(self, workgroup_id: str) -> dict:
        """Contractor rejects — set status, QR token gets invalidated separately."""
        return await self.update_one(self.TABLE, workgroup_id, {
            "status": "rejected",
            "contractor_id": None,
        })

    # ── Dependencies ──────────────────────────────────────

    async def add_dependency(self, workgroup_id: str, depends_on_id: str, dep_type: str = "finish_to_start") -> dict:
        """Add a workgroup dependency."""
        return await self.insert_one("workgroup_dependencies", {
            "workgroup_id": workgroup_id,
            "depends_on_workgroup_id": depends_on_id,
            "dependency_type": dep_type,
        })

    async def get_dependencies(self, workgroup_id: str) -> list[dict]:
        """Get dependencies with status of the depended-on workgroup."""
        result = (
            self.client.table("workgroup_dependencies")
            .select("*, depends_on:depends_on_workgroup_id(title, status, progress_pct)")
            .eq("workgroup_id", workgroup_id)
            .execute()
        )
        return result.data or []

    async def get_dependents(self, workgroup_id: str) -> list[dict]:
        """Get workgroups that depend ON this one (for unblock notifications)."""
        result = (
            self.client.table("workgroup_dependencies")
            .select("*, dependent:workgroup_id(id, title, status)")
            .eq("depends_on_workgroup_id", workgroup_id)
            .execute()
        )
        return result.data or []

    async def remove_dependency(self, dependency_id: str) -> bool:
        """Remove a workgroup dependency."""
        return await self.delete_one("workgroup_dependencies", dependency_id)

    # ── Progress ──────────────────────────────────────────

    async def cascade_progress(self, workgroup_id: str):
        """Recalculate workgroup progress from job statuses."""
        return await self.rpc("fn_recalculate_workgroup_progress", {"p_workgroup_id": workgroup_id})

    async def update_status(self, workgroup_id: str, status: str) -> dict:
        """Update workgroup status."""
        return await self.update_one("workgroups", workgroup_id, {"status": status})

    async def update_progress(self, workgroup_id: str, progress_pct: float) -> None:
        """Update workgroup progress percentage."""
        await self.update_one("workgroups", workgroup_id, {"progress_pct": progress_pct})
