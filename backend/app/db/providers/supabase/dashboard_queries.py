"""
Dashboard Queries — Implemented

Fetches all data needed for the Owner Dashboard in minimal DB round-trips.
Assembles the nested structure: Project → Worksites → Workgroups → Jobs.

Also provides portfolio-level queries for the landing page:
  get_portfolio_projects, get_pending_invoices,
  get_pending_workgroups, get_recent_activity

And the dependency graph query for the Dependency Analyzer:
  get_project_graph
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
                            "depends_on_ids": ["workgroup_id", ...] | []
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

        # ── 4.5. Get job-level dependencies ────────────────────
        job_ids = [j["id"] for j in all_jobs]
        job_deps_result = (
            self.client.table("job_dependencies")
            .select("job_id, depends_on_job_id")
            .in_("job_id", job_ids)
            .execute()
        ) if job_ids else type("R", (), {"data": []})()
        all_job_deps = job_deps_result.data or []

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

        # Index dependencies by workgroup_id (list — a workgroup can have multiple predecessors)
        deps_by_wg: dict[str, list[str]] = {}
        for dep in all_deps:
            wg_id = dep["workgroup_id"]
            if wg_id not in deps_by_wg:
                deps_by_wg[wg_id] = []
            deps_by_wg[wg_id].append(dep["depends_on_workgroup_id"])

        # Index invoices by workgroup_id
        inv_by_wg = {}
        for inv in all_invoices:
            wg_id = inv["workgroup_id"]
            if wg_id not in inv_by_wg:
                inv_by_wg[wg_id] = []
            inv_by_wg[wg_id].append(inv)

        # Index job dependencies: job_id → [depends_on_job_id, ...]
        job_deps_by_job = {}
        for jd in all_job_deps:
            jid = jd["job_id"]
            if jid not in job_deps_by_job:
                job_deps_by_job[jid] = []
            job_deps_by_job[jid].append(jd["depends_on_job_id"])

        # Build invoice summary per job
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
                    "depends_on_job_ids": job_deps_by_job.get(job["id"], []),
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
                "depends_on_ids": deps_by_wg.get(wg_id, []),
                "paid": wg_paid,
                "invoiced": wg_invoiced,
                "jobs": enriched_jobs,
            }

        # Assemble worksites with nested workgroups (topologically sorted)
        assembled_worksites = []
        for ws in worksites:
            ws_wg_ids = [
                wg["id"] for wg in all_workgroups
                if wg["worksite_id"] == ws["id"] and wg["id"] in wg_assembled
            ]
            sorted_ids = self._topo_sort_workgroups(ws_wg_ids, deps_by_wg, wg_assembled)
            ws_wgs = [wg_assembled[wg_id] for wg_id in sorted_ids]
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

    def _topo_sort_workgroups(
        self,
        wg_ids: list[str],
        deps_by_wg: dict[str, list[str]],
        wg_assembled: dict,
    ) -> list[str]:
        """
        Topological sort of workgroups within a worksite.

        Roots (no predecessors) appear first, then their dependents, etc.
        Within the same depth level, workgroups are sorted alphabetically by title.
        This ensures dependency arrows always flow downward in the Gantt chart.

        Uses Kahn's algorithm (BFS) for clarity and cycle safety.
        """
        wg_set = set(wg_ids)

        # Build adjacency: predecessor → [dependents] (only within this worksite)
        successors: dict[str, list[str]] = {wg_id: [] for wg_id in wg_ids}
        in_degree: dict[str, int] = {wg_id: 0 for wg_id in wg_ids}

        for wg_id in wg_ids:
            for pred_id in deps_by_wg.get(wg_id, []):
                if pred_id in wg_set:  # only count deps within same worksite
                    successors[pred_id].append(wg_id)
                    in_degree[wg_id] += 1

        # Seed queue with roots (in_degree == 0), sorted alphabetically
        def title_key(wg_id: str) -> str:
            return (wg_assembled.get(wg_id, {}).get("title") or "").lower()

        queue = sorted(
            [wg_id for wg_id in wg_ids if in_degree[wg_id] == 0],
            key=title_key,
        )

        result = []
        while queue:
            current = queue.pop(0)
            result.append(current)

            # Find newly unblocked dependents, sort alphabetically before adding
            newly_ready = []
            for succ_id in successors[current]:
                in_degree[succ_id] -= 1
                if in_degree[succ_id] == 0:
                    newly_ready.append(succ_id)

            queue.extend(sorted(newly_ready, key=title_key))

        # Safety: if there's a cycle, append any remaining workgroups at the end
        if len(result) < len(wg_ids):
            remaining = [wg_id for wg_id in wg_ids if wg_id not in set(result)]
            result.extend(sorted(remaining, key=title_key))

        return result

    def _empty_budget(self):
        return {"total_budget": 0, "total_spent": 0, "total_invoiced": 0, "remaining": 0}

    def _empty_stats(self):
        return {"worksite_count": 0, "workgroup_count": 0, "wg_active": 0, "wg_pending": 0, "job_count": 0, "jobs_done": 0, "jobs_active": 0}

    # ══════════════════════════════════════════════════════
    # DEPENDENCY GRAPH QUERY
    # ══════════════════════════════════════════════════════

    async def get_project_graph(self, project_id: str) -> dict:
        """
        Return the complete dependency graph for a project.

        Makes 5 queries:
          1. Worksites for this project (to get worksite IDs)
          2. Workgroups across all worksites
          3. Jobs across all workgroups
          4. Workgroup dependencies
          5. Job dependencies

        Returns a dict that maps directly to ProjectGraph(**result).
        """

        # ── 1. Get worksites for this project ────────────────
        worksites_result = (
            self.client.table("worksites")
            .select("id")
            .eq("project_id", project_id)
            .execute()
        )
        worksite_ids = [ws["id"] for ws in (worksites_result.data or [])]

        if not worksite_ids:
            return {
                "project_id": project_id,
                "workgroups": [],
                "jobs": [],
                "wg_edges": [],
                "job_edges": [],
            }

        # ── 2. Get workgroups across all worksites ───────────
        wg_result = (
            self.client.table("workgroups")
            .select(
                "id, title, trade, worksite_id, status, "
                "start_date, end_date, budget, contractor_id"
            )
            .in_("worksite_id", worksite_ids)
            .execute()
        )
        all_workgroups = wg_result.data or []
        workgroup_ids = [wg["id"] for wg in all_workgroups]

        if not workgroup_ids:
            return {
                "project_id": project_id,
                "workgroups": [],
                "jobs": [],
                "wg_edges": [],
                "job_edges": [],
            }

        # ── 3. Get jobs across all workgroups ────────────────
        jobs_result = (
            self.client.table("jobs")
            .select(
                "id, title, workgroup_id, sequence, status, "
                "est_duration_days, budget"
            )
            .in_("workgroup_id", workgroup_ids)
            .order("sequence")
            .execute()
        )
        all_jobs = jobs_result.data or []
        job_ids = [j["id"] for j in all_jobs]

        # ── 4. Get workgroup dependencies ────────────────────
        wg_deps_result = (
            self.client.table("workgroup_dependencies")
            .select("id, workgroup_id, depends_on_workgroup_id")
            .in_("workgroup_id", workgroup_ids)
            .execute()
        ) if workgroup_ids else type("R", (), {"data": []})()
        all_wg_deps = wg_deps_result.data or []

        # ── 5. Get job dependencies ──────────────────────────
        job_deps_result = (
            self.client.table("job_dependencies")
            .select("id, job_id, depends_on_job_id")
            .in_("job_id", job_ids)
            .execute()
        ) if job_ids else type("R", (), {"data": []})()
        all_job_deps = job_deps_result.data or []

        # ── Assemble ProjectGraph dict ───────────────────────

        # Index jobs by workgroup for duration calculation
        jobs_by_wg: dict[str, list[dict]] = {}
        for j in all_jobs:
            wg_id = j["workgroup_id"]
            if wg_id not in jobs_by_wg:
                jobs_by_wg[wg_id] = []
            jobs_by_wg[wg_id].append(j)

        workgroups = []
        for wg in all_workgroups:
            # est_duration_days = sum of job durations for this workgroup
            wg_jobs = jobs_by_wg.get(wg["id"], [])
            est_duration = sum(j.get("est_duration_days", 0) for j in wg_jobs)

            workgroups.append({
                "id": wg["id"],
                "title": wg["title"],
                "trade": wg.get("trade", ""),
                "worksite_id": wg["worksite_id"],
                "status": wg["status"],
                "start_date": wg.get("start_date"),
                "end_date": wg.get("end_date"),
                "budget": float(wg.get("budget") or 0),
                "est_duration_days": est_duration,
                "contractor_id": wg.get("contractor_id"),
            })

        jobs = [
            {
                "id": j["id"],
                "title": j["title"],
                "workgroup_id": j["workgroup_id"],
                "sequence": j.get("sequence", 1),
                "status": j["status"],
                "est_duration_days": j.get("est_duration_days", 0),
                "budget": float(j.get("budget") or 0),
            }
            for j in all_jobs
        ]

        # Edges: from_id = predecessor (must finish first),
        #        to_id = dependent (is blocked)
        # In workgroup_dependencies: depends_on_workgroup_id is the predecessor
        wg_edges = [
            {
                "id": d["id"],
                "from_id": d["depends_on_workgroup_id"],  # predecessor
                "to_id": d["workgroup_id"],                # dependent
                "level": "workgroup",
            }
            for d in all_wg_deps
        ]

        # In job_dependencies: depends_on_job_id is the predecessor
        job_edges = [
            {
                "id": d["id"],
                "from_id": d["depends_on_job_id"],  # predecessor
                "to_id": d["job_id"],                # dependent
                "level": "job",
            }
            for d in all_job_deps
        ]

        return {
            "project_id": project_id,
            "workgroups": workgroups,
            "jobs": jobs,
            "wg_edges": wg_edges,
            "job_edges": job_edges,
        }

    # ══════════════════════════════════════════════════════
    # PORTFOLIO QUERIES (for Owner Dashboard landing page)
    # ══════════════════════════════════════════════════════

    async def get_portfolio_projects(self, org_id: str) -> list:
        """
        Get all projects for an org with aggregated stats.
        Uses the v_project_overview view (already in schema).
        """
        response = (
            self.client.table("v_project_overview")
            .select("*")
            .eq("org_id", org_id)
            .order("start_date", desc=False)
            .execute()
        )

        return [
            {
                "id": row["project_id"],
                "title": row["title"],
                "status": row["status"],
                "total_budget": float(row.get("total_budget") or 0),
                "total_paid": float(row.get("total_paid") or 0),
                "total_invoiced": float(row.get("total_invoiced") or 0),
                "progress_pct": float(row.get("progress_pct") or 0),
                "start_date": row.get("start_date"),
                "end_date": row.get("end_date"),
                "worksite_count": int(row.get("worksite_count") or 0),
                "workgroup_count": int(row.get("workgroup_count") or 0),
                "job_count": int(row.get("job_count") or 0),
                "jobs_complete": int(row.get("jobs_complete") or 0),
            }
            for row in (response.data or [])
        ]

    async def get_pending_invoices(self, org_id: str) -> list:
        """
        Get invoices awaiting review across all projects for the org.

        Joins through: invoices → contractors, invoices → workgroups → worksites → projects
        Filters: status in (submitted, ai_validated, ai_flagged, pending_approval)
        Scoping: RLS on projects table + explicit org_id check below.

        FIX: Uses regular join on contractors (not !inner) so invoices
        aren't excluded if the contractor FK is somehow null in edge cases.
        The !inner remains on workgroups/worksites/projects because those
        are required for org scoping.
        """
        response = (
            self.client.table("invoices")
            .select(
                "id, invoice_number, amount, status, submitted_at, "
                "contractor:contractors(company_name), "
                "workgroup:workgroups!inner("
                "  title, trade, "
                "  worksite:worksites!inner("
                "    name, "
                "    project:projects!inner(title, org_id)"
                "  )"
                ")"
            )
            .in_("status", [
                "submitted", "ai_validated", "ai_flagged", "pending_approval"
            ])
            .order("submitted_at", desc=True)
            .limit(10)
            .execute()
        )

        results = []
        for row in (response.data or []):
            contractor = row.get("contractor") or {}
            workgroup = row.get("workgroup") or {}
            worksite = workgroup.get("worksite") or {}
            project = worksite.get("project") or {}

            # RLS handles org scoping on the projects table,
            # but double-check in case RLS isn't applied to the view join
            if project.get("org_id") != org_id:
                continue

            results.append({
                "id": row["id"],
                "invoice_number": row["invoice_number"],
                "amount": float(row["amount"]),
                "status": row["status"],
                "submitted_at": row.get("submitted_at"),
                "contractor_name": contractor.get("company_name", ""),
                "workgroup_title": workgroup.get("title", ""),
                "worksite_name": worksite.get("name", ""),
                "project_title": project.get("title", ""),
                "job_title": None,  # TODO: resolve from invoice.line_items
            })

        return results

    async def get_pending_workgroups(self, org_id: str) -> list:
        """
        Get workgroups with status='pending' (awaiting contractor response).

        Joins through: workgroups → contractors, workgroups → worksites → projects
        Scoping: RLS + explicit org_id check.
        """
        response = (
            self.client.table("workgroups")
            .select(
                "id, title, trade, status, "
                "contractor:contractors(company_name), "
                "worksite:worksites!inner("
                "  name, "
                "  project:projects!inner(org_id)"
                ")"
            )
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )

        results = []
        for row in (response.data or []):
            contractor = row.get("contractor") or {}
            worksite = row.get("worksite") or {}
            project = worksite.get("project") or {}

            if project.get("org_id") != org_id:
                continue

            results.append({
                "id": row["id"],
                "title": row["title"],
                "trade": row.get("trade", ""),
                "status": row["status"],
                "contractor_name": contractor.get("company_name", "Unassigned"),
                "worksite_name": worksite.get("name", ""),
            })

        return results

    async def get_recent_activity(self, org_id: str, limit: int = 10) -> list:
        """
        Get recent audit log entries.

        KNOWN LIMITATION: audit_logs table has no org_id column.
        This query returns the last N entries globally. In single-org
        MVP this is fine. For multi-org production, add org_id column:

            ALTER TABLE audit_logs ADD COLUMN org_id UUID REFERENCES organizations(id);
            CREATE INDEX idx_audit_org ON audit_logs(org_id, created_at DESC);

        Then add .eq("org_id", org_id) to this query.
        Tracked for: multi-org milestone.
        """
        response = (
            self.client.table("audit_logs")
            .select("id, entity_type, action, changes, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return [
            {
                "id": row["id"],
                "entity_type": row["entity_type"],
                "action": row["action"],
                "changes": row.get("changes"),
                "created_at": row["created_at"],
            }
            for row in (response.data or [])
        ]
