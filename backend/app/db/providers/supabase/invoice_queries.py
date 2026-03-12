"""
Invoice Queries

Handles:
- Invoice CRUD
- Data needed for AI validation (10-point checklist)
- Workgroup invoice summary (from v_workgroup_invoice_summary view)
- Double-billing checks
- Payment status updates
"""

from typing import Optional
from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.invoice_repository import IInvoiceRepository

# ── Cross-table: Invoice with full context for validation ─

GET_INVOICE_FOR_VALIDATION = """
    SELECT
        i.*,
        wg.budget AS workgroup_budget,
        wg.status AS workgroup_status,
        c.company_name AS contractor_name,
        cw.first_name || ' ' || cw.last_name AS submitted_by_name,

        -- Previous invoices for this workgroup (for double-billing check)
        (SELECT COALESCE(SUM(amount), 0) FROM invoices
         WHERE workgroup_id = i.workgroup_id
           AND status NOT IN ('rejected', 'draft')
           AND id != i.id
        ) AS previously_invoiced,

        -- Site presence data
        (SELECT COUNT(*) FROM site_checkins
         WHERE workgroup_id = i.workgroup_id) AS checkin_count,
        (SELECT COUNT(DISTINCT worker_id) FROM site_checkins
         WHERE workgroup_id = i.workgroup_id) AS workers_on_site

    FROM invoices i
    JOIN workgroups wg ON i.workgroup_id = wg.id
    JOIN contractors c ON i.contractor_id = c.id
    LEFT JOIN contractor_workers cw ON i.submitted_by_worker = cw.id
    WHERE i.id = :invoice_id;
"""

# ── Double-billing check: jobs already on another invoice ─

CHECK_DOUBLE_BILLING = """
    SELECT j.id, j.title, j.invoice_id, inv.invoice_number
    FROM jobs j
    JOIN invoices inv ON j.invoice_id = inv.id
    WHERE j.id = ANY(:job_ids)
      AND j.invoice_id IS NOT NULL;
"""


class InvoiceRepository(SupabaseBaseRepository, IInvoiceRepository):
    """Queries for invoice operations."""

    TABLE = "invoices"

    async def list_invoices(
        self,
        workgroup_id: Optional[str] = None,
        contractor_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict]:
        """List invoices with optional filters."""
        query = self.client.table(self.TABLE).select("*")
        if workgroup_id:
            query = query.eq("workgroup_id", workgroup_id)
        if contractor_id:
            query = query.eq("contractor_id", contractor_id)
        if status:
            query = query.eq("status", status)
        query = query.order("created_at", desc=True)
        result = query.execute()
        return result.data or []

    async def create_invoice(self, data: dict) -> dict:
        """Create an invoice record."""
        return await self.insert_one(self.TABLE, data)

    async def get_invoice(self, invoice_id: str) -> Optional[dict]:
        """Get basic invoice record."""
        return await self.fetch_one(self.TABLE, invoice_id)

    async def get_invoice_for_validation(self, invoice_id: str) -> dict:
        """Get invoice with full context needed for AI validation."""
        invoice = (
            self.client.table(self.TABLE)
            .select("*, workgroups(budget, status), contractors(company_name), contractor_workers(first_name, last_name)")
            .eq("id", invoice_id)
            .single()
            .execute()
        )
        return invoice.data

    async def update_invoice_status(self, invoice_id: str, status: str, extra: Optional[dict] = None) -> dict:
        """Update invoice status (with optional extra fields like ai_flags)."""
        data = {"status": status}
        if extra:
            data.update(extra)
        return await self.update_one(self.TABLE, invoice_id, data)

    async def approve_invoice(self, invoice_id: str, approved_by: str) -> dict:
        """Mark invoice as approved."""
        return await self.update_one(self.TABLE, invoice_id, {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": "now()",
        })

    async def mark_paid(self, invoice_id: str) -> dict:
        """Mark invoice as paid after payment processing."""
        return await self.update_one(self.TABLE, invoice_id, {
            "status": "paid",
            "paid_at": "now()",
        })

    # ── Double-billing check ──────────────────────────────

    async def check_double_billing(self, workgroup_id: str, job_ids: list[str]) -> list[dict]:
        """Check if any of the given jobs are already on another invoice."""
        result = await self.rpc("fn_check_double_billing", {
            "p_workgroup_id": workgroup_id,
            "p_job_ids": job_ids,
        })
        return result or []

    # ── Link jobs to invoice ──────────────────────────────

    async def link_jobs_to_invoice(self, invoice_id: str, job_ids: list[str]) -> None:
        """Set invoice_id on jobs and update their status to 'invoiced'."""
        for job_id in job_ids:
            self.client.table("jobs").update({
                "invoice_id": invoice_id,
                "status": "invoiced",
            }).eq("id", job_id).execute()

    async def mark_jobs_paid(self, invoice_id: str) -> None:
        """Update all jobs on an invoice to 'paid' status."""
        self.client.table("jobs").update({
            "status": "paid",
        }).eq("invoice_id", invoice_id).execute()

    # ── Workgroup invoice summary (from view) ─────────────

    async def get_workgroup_summary(self, workgroup_id: str) -> Optional[dict]:
        """Get invoice summary from v_workgroup_invoice_summary."""
        result = (
            self.client.table("v_workgroup_invoice_summary")
            .select("*")
            .eq("workgroup_id", workgroup_id)
            .single()
            .execute()
        )
        return result.data

    # ── Previous invoices for a workgroup ─────────────────

    async def get_previous_invoices(self, workgroup_id: str) -> list[dict]:
        """Get all non-draft invoices for a workgroup (for validation context)."""
        result = (
            self.client.table(self.TABLE)
            .select("id, invoice_number, amount, status, line_items")
            .eq("workgroup_id", workgroup_id)
            .neq("status", "draft")
            .order("created_at")
            .execute()
        )
        return result.data or []

    async def update_status(self, invoice_id: str, status: str) -> dict:
        """Update invoice status."""
        return await self.update_one("invoices", invoice_id, {"status": status})

    async def set_ai_flags(self, invoice_id: str, validated: bool, flags: list[dict]) -> dict:
        """Set AI validation result and flags."""
        return await self.update_one("invoices", invoice_id, {
            "ai_validated": validated,
            "ai_flags": flags,
            "status": "ai_validated" if validated else "ai_flagged",
        })

    async def reject_invoice(self, invoice_id: str, reason: str) -> dict:
        """Reject an invoice with reason."""
        return await self.update_one("invoices", invoice_id, {
            "status": "rejected",
            "ai_flags": [{"type": "rejection", "reason": reason}],
        })

    async def get_cumulative_total(self, workgroup_id: str) -> float:
        """Sum of all non-rejected invoice amounts for a workgroup."""
        result = (
            self.client.table("invoices")
            .select("amount")
            .eq("workgroup_id", workgroup_id)
            .neq("status", "rejected")
            .execute()
        )
        return sum(float(inv["amount"]) for inv in (result.data or []))

    async def check_double_billing(self, workgroup_id: str, job_ids: list[str]) -> list[str]:
        """Return job_ids that already appear on another invoice."""
        result = (
            self.client.table("jobs")
            .select("id, invoice_id")
            .in_("id", job_ids)
            .not_.is_("invoice_id", "null")
            .execute()
        )
        return [job["id"] for job in (result.data or [])]

    async def get_pending_approvals(self, org_id: str) -> list[dict]:
        """All invoices awaiting approval across org."""
        result = (
            self.client.table("invoices")
            .select("*, workgroups(title, worksite_id, worksites(name, project_id, projects(org_id)))")
            .eq("status", "pending_approval")
            .execute()
        )
        # Filter by org_id (Supabase nested filter workaround)
        return [
            inv for inv in (result.data or [])
            if inv.get("workgroups", {}).get("worksites", {}).get("projects", {}).get("org_id") == org_id
        ]
