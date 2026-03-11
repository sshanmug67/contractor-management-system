"""
Job Queries

Handles:
- Job CRUD
- Job detail (joins: checklists, uploads, job_dependencies)
- Status transitions (start, complete) with dependency checks
- Progress cascade trigger
"""

from typing import Optional
from app.db.repositories.base_repository import BaseRepository

# ── Cross-table: Job detail with checklist + uploads ──────

GET_JOB_DETAIL = """
    SELECT
        j.*,
        wg.title AS workgroup_title,
        wg.status AS workgroup_status,
        i.invoice_number,
        i.status AS invoice_status,
        cl.items AS checklist_items
    FROM jobs j
    JOIN workgroups wg ON j.workgroup_id = wg.id
    LEFT JOIN invoices i ON j.invoice_id = i.id
    LEFT JOIN checklists cl ON cl.job_id = j.id
    WHERE j.id = :job_id;
"""

# ── Cross-table: Job dependencies with satisfaction status ─

GET_JOB_DEPENDENCIES = """
    SELECT
        jd.*,
        dep_j.title AS depends_on_title,
        dep_j.status AS depends_on_status,
        (dep_j.status IN ('complete', 'invoiced', 'paid')) AS is_satisfied
    FROM job_dependencies jd
    JOIN jobs dep_j ON jd.depends_on_job_id = dep_j.id
    WHERE jd.job_id = :job_id;
"""


class JobRepository(BaseRepository):
    """Queries for job operations."""

    TABLE = "jobs"

    async def list_jobs(
        self,
        workgroup_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        """List jobs, optionally filtered by workgroup."""
        query = self.client.table(self.TABLE).select("*")
        if workgroup_id:
            query = query.eq("workgroup_id", workgroup_id)
        if status:
            query = query.eq("status", status)
        query = query.order("sequence")
        result = query.execute()
        return result.data or []

    async def create_job(self, data: dict) -> dict:
        """Create a job within a workgroup."""
        return await self.insert_one(self.TABLE, data)

    async def get_job(self, job_id: str) -> Optional[dict]:
        """Get basic job record."""
        return await self.fetch_one(self.TABLE, job_id)

    async def get_job_detail(self, job_id: str) -> dict:
        """Get job with checklist, uploads, and dependencies."""
        job = (
            self.client.table(self.TABLE)
            .select("*, workgroups(title, status), invoices(invoice_number, status), checklists(items)")
            .eq("id", job_id)
            .single()
            .execute()
        )

        uploads = (
            self.client.table("uploads")
            .select("*, contractor_workers(first_name, last_name)")
            .eq("job_id", job_id)
            .order("created_at", desc=True)
            .execute()
        )

        deps = (
            self.client.table("job_dependencies")
            .select("*, depends_on:depends_on_job_id(title, status)")
            .eq("job_id", job_id)
            .execute()
        )

        return {
            "job": job.data,
            "uploads": uploads.data or [],
            "dependencies": deps.data or [],
        }

    async def update_job(self, job_id: str, data: dict) -> dict:
        """Update job fields."""
        return await self.update_one(self.TABLE, job_id, data)

    async def update_job_status(self, job_id: str, status: str) -> dict:
        """Update job status and trigger progress cascade."""
        result = await self.update_one(self.TABLE, job_id, {"status": status})
        # Trigger cascade: job → workgroup → worksite → project
        await self.rpc("fn_cascade_progress", {"p_job_id": job_id})
        return result

    async def delete_job(self, job_id: str) -> bool:
        """Delete job (only if not_started and not invoiced)."""
        return await self.delete_one(self.TABLE, job_id)

    # ── Checklists ────────────────────────────────────────

    async def get_checklist(self, job_id: str) -> Optional[dict]:
        """Get checklist for a job."""
        result = (
            self.client.table("checklists")
            .select("*")
            .eq("job_id", job_id)
            .single()
            .execute()
        )
        return result.data

    async def update_checklist(self, job_id: str, items: list) -> dict:
        """Update checklist items JSONB."""
        result = (
            self.client.table("checklists")
            .update({"items": items})
            .eq("job_id", job_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    # ── Dependencies ──────────────────────────────────────

    async def add_dependency(self, job_id: str, depends_on_job_id: str) -> dict:
        """Add a job dependency (within same workgroup)."""
        return await self.insert_one("job_dependencies", {
            "job_id": job_id,
            "depends_on_job_id": depends_on_job_id,
        })

    async def get_dependencies(self, job_id: str) -> list[dict]:
        """Get job dependencies with satisfaction status."""
        result = (
            self.client.table("job_dependencies")
            .select("*, depends_on:depends_on_job_id(title, status)")
            .eq("job_id", job_id)
            .execute()
        )
        return result.data or []

    async def check_dependencies_satisfied(self, job_id: str) -> bool:
        """Check if all dependencies for a job are satisfied (complete/invoiced/paid)."""
        deps = await self.get_dependencies(job_id)
        if not deps:
            return True
        return all(
            dep.get("depends_on", {}).get("status") in ("complete", "invoiced", "paid")
            for dep in deps
        )

    # ── Bulk: Get jobs available for invoicing ────────────

    async def get_invoiceable_jobs(self, workgroup_id: str) -> list[dict]:
        """Get completed jobs not yet on any invoice."""
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .eq("status", "complete")
            .is_("invoice_id", "null")
            .order("sequence")
            .execute()
        )
        return result.data or []
