"""
Dashboard Queries — Implemented

Fetches all data needed for the Owner Dashboard in minimal DB round-trips.
Assembles the nested structure: Project → Worksites → Workgroups → Jobs.
"""

from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.dashboard_repository import IDashboardRepository

class DashboardRepository(SupabaseBaseRepository, IDashboardRepository):
    """Queries for the owner dashboard."""

    async def get_owner_dashboard(self, org_id: str, project_id: str = None) -> dict:
        """
        Single method that returns the full dashboard payload.

        Returns:
        {
            "project": { ... },
            "worksites": [
                {
                    ...worksite,
                    "workgroups": [
                        {
                            ...workgroup,
                            "contractor_name": "...",
                            "jobs": [ ... ],
                            "depends_on": "workgroup_id" | null
                        }
                    ]
                }
            ],
            "budget_summary": { total, spent, invoiced, remaining },
            "stats": { job_count, jobs_done, jobs_active, wg_count, wg_active, wg_pending }
        }
        """

        # ── 1. Get project(s) for this org ────────────────────
        project_query = (
            self.client.table("projects")
            .select("*")
            .eq("org_id", org_id)
            .eq("status", "active")
        )
        if project_id:
            project_query = project_query.eq("id", project_id)

        project_result = project_query.limit(1).execute()

        if not project_result.data:
            return {"project": None, "worksites": [], "budget_summary": {}, "stats": {}}

        project = project_result.data[0]

        # ── 2. Get worksites for this project ─────────────────
        worksites_result = (
            self.client.table("worksites")
            .select("*")
            .eq("project_id", project["id"])
            .order("name")
            .execute()
        )
        worksites = worksites_result.data or []

        if not worksites:
            return {
                "project": project,
                "worksites": [],
                "budget_summary": self._empty_budget(),
                "stats": self._empty_stats(),
            }

        worksite_ids = [ws["id"] for ws in worksites]

        # ── 3. Get ALL workgroups across these worksites ──────
        #    Join contractor name in one query
        workgroups_result = (
            self.client.table("workgroups")
            .select("*, contractors(company_name)")
            .in_("worksite_id", worksite_ids)
            .order("title")
            .execute()
        )
        all_workgroups = workgroups_result.data or []

        workgroup_ids = [wg["id"] for wg in all_workgroups]

        # ── 4. Get ALL jobs across these workgroups ───────────
        jobs_result = (
            self.client.table("jobs")
            .select("*")
            .in_("workgroup_id", workgroup_ids)
            .order("sequence")
            .execute()
        ) if workgroup_ids else type("R", (), {"data": []})()
        all_jobs = jobs_result.data or []

        # ── 5. Get workgroup dependencies ─────────────────────
        deps_result = (
            self.client.table("workgroup_dependencies")
            .select("workgroup_id, depends_on_workgroup_id, dependency_type")
            .in_("workgroup_id", workgroup_ids)
            .execute()
        ) if workgroup_ids else type("R", (), {"data": []})()
        all_deps = deps_result.data or []

        # ── 6. Get invoices summary per workgroup ─────────────
        invoices_result = (
            self.client.table("invoices")
            .select("workgroup_id, amount, status")
            .in_("workgroup_id", workgroup_ids)
            .execute()
        ) if workgroup_ids else type("R", (), {"data": []})()
        all_invoices = invoices_result.data or []

        # ── ASSEMBLE ──────────────────────────────────────────

        # Index jobs by workgroup_id
        jobs_by_wg = {}
        for job in all_jobs:
            wg_id = job["workgroup_id"]
            if wg_id not in jobs_by_wg:
                jobs_by_wg[wg_id] = []
            jobs_by_wg[wg_id].append(job)

        # Index dependencies by workgroup_id
        deps_by_wg = {}
        for dep in all_deps:
            deps_by_wg[dep["workgroup_id"]] = dep["depends_on_workgroup_id"]

        # Index invoices by workgroup_id
        inv_by_wg = {}
        for inv in all_invoices:
            wg_id = inv["workgroup_id"]
            if wg_id not in inv_by_wg:
                inv_by_wg[wg_id] = []
            inv_by_wg[wg_id].append(inv)

        # Build invoice summary per job
        # Jobs can have invoice_id set — but also track from invoices table
        def job_invoice_info(job):
            """Determine if a job is invoiced/paid based on its status."""
            return {
                "invoiced": job["status"] in ("invoiced", "paid"),
                "paid": job["status"] == "paid",
                "invoice_amount": float(job.get("budget") or 0) if job["status"] in ("invoiced", "paid") else 0,
            }

        # Budget accumulators
        total_spent = 0
        total_invoiced_pending = 0
        total_jobs = 0
        jobs_done = 0
        jobs_active = 0
        wg_active = 0
        wg_pending = 0

        # Assemble workgroups with nested jobs
        wg_assembled = {}
        for wg in all_workgroups:
            wg_id = wg["id"]
            wg_jobs = jobs_by_wg.get(wg_id, [])

            # Contractor name from joined data
            contractor_info = wg.get("contractors")
            contractor_name = (
                contractor_info.get("company_name", "Unassigned")
                if contractor_info and isinstance(contractor_info, dict)
                else "Unassigned"
            )

            # Invoice totals for this workgroup
            wg_invoices = inv_by_wg.get(wg_id, [])
            wg_paid = sum(
                float(i["amount"]) for i in wg_invoices if i["status"] == "paid"
            )
            wg_invoiced = sum(
                float(i["amount"])
                for i in wg_invoices
                if i["status"] not in ("paid", "rejected", "draft")
            )

            # Also check job statuses for invoice tracking (seed data uses job status)
            for job in wg_jobs:
                total_jobs += 1
                if job["status"] in ("complete", "invoiced", "paid"):
                    jobs_done += 1
                elif job["status"] == "in_progress":
                    jobs_active += 1

                if job["status"] == "paid":
                    total_spent += float(job.get("budget") or 0)
                elif job["status"] == "invoiced":
                    total_invoiced_pending += float(job.get("budget") or 0)

            if wg["status"] == "in_progress":
                wg_active += 1
            elif wg["status"] == "pending":
                wg_pending += 1

            # Build enriched jobs
            enriched_jobs = []
            for job in wg_jobs:
                inv_info = job_invoice_info(job)
                enriched_jobs.append({
                    "id": job["id"],
                    "title": job["title"],
                    "description": job.get("description"),
                    "budget": float(job.get("budget") or 0),
                    "est_duration_days": job.get("est_duration_days", 0),
                    "sequence": job.get("sequence", 1),
                    "status": job["status"],
                    "invoiced": inv_info["invoiced"],
                    "paid": inv_info["paid"],
                    "invoice_amount": inv_info["invoice_amount"],
                })

            wg_assembled[wg_id] = {
                "id": wg_id,
                "worksite_id": wg["worksite_id"],
                "title": wg["title"],
                "trade": wg.get("trade"),
                "contractor_id": wg.get("contractor_id"),
                "contractor_name": contractor_name,
                "budget": float(wg.get("budget") or 0),
                "start_date": wg.get("start_date"),
                "end_date": wg.get("end_date"),
                "status": wg["status"],
                "progress_pct": float(wg.get("progress_pct") or 0),
                "depends_on": deps_by_wg.get(wg_id),
                "paid": wg_paid,
                "invoiced": wg_invoiced,
                "jobs": enriched_jobs,
            }

        # Assemble worksites with nested workgroups
        assembled_worksites = []
        for ws in worksites:
            ws_wgs = [
                wg_assembled[wg["id"]]
                for wg in all_workgroups
                if wg["worksite_id"] == ws["id"] and wg["id"] in wg_assembled
            ]
            assembled_worksites.append({
                "id": ws["id"],
                "name": ws["name"],
                "address_line1": ws.get("address_line1", ""),
                "city": ws.get("city", ""),
                "state": ws.get("state", ""),
                "zip_code": ws.get("zip_code", ""),
                "budget": float(ws.get("budget") or 0),
                "start_date": ws.get("start_date"),
                "end_date": ws.get("end_date"),
                "status": ws.get("status", "draft"),
                "progress_pct": float(ws.get("progress_pct") or 0),
                "workgroups": ws_wgs,
            })

        total_budget = float(project.get("total_budget") or 0)

        return {
            "project": {
                "id": project["id"],
                "title": project["title"],
                "description": project.get("description"),
                "total_budget": total_budget,
                "start_date": project.get("start_date"),
                "end_date": project.get("end_date"),
                "status": project["status"],
            },
            "worksites": assembled_worksites,
            "budget_summary": {
                "total_budget": total_budget,
                "total_spent": total_spent,
                "total_invoiced": total_invoiced_pending,
                "remaining": total_budget - total_spent - total_invoiced_pending,
            },
            "stats": {
                "worksite_count": len(worksites),
                "workgroup_count": len(all_workgroups),
                "wg_active": wg_active,
                "wg_pending": wg_pending,
                "job_count": total_jobs,
                "jobs_done": jobs_done,
                "jobs_active": jobs_active,
            },
        }

    async def get_budget_summary(self, org_id: str) -> dict:
        """Org-wide budget from v_project_overview."""
        result = (
            self.client.table("v_project_overview")
            .select("total_budget, total_invoiced, total_paid")
            .eq("org_id", org_id)
            .execute()
        )
        data = result.data or []
        return {
            "total_budget": sum(float(p.get("total_budget") or 0) for p in data),
            "total_invoiced": sum(float(p.get("total_invoiced") or 0) for p in data),
            "total_paid": sum(float(p.get("total_paid") or 0) for p in data),
            "project_count": len(data),
        }

    def _empty_budget(self):
        return {"total_budget": 0, "total_spent": 0, "total_invoiced": 0, "remaining": 0}

    def _empty_stats(self):
        return {"worksite_count": 0, "workgroup_count": 0, "wg_active": 0, "wg_pending": 0, "job_count": 0, "jobs_done": 0, "jobs_active": 0}
