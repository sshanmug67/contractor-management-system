"""
Provider — Supabase Template Queries

Implements ITemplateRepository for Supabase/PostgreSQL.
Follows the same pattern as project_queries.py — receives
the Supabase client from ProviderRegistry via __init__.

File: app/db/providers/supabase/template_queries.py
"""

from typing import Optional
import json

from app.db.interfaces.template_repository import ITemplateRepository


class SupabaseTemplateRepository(ITemplateRepository):
    """Supabase implementation of template data access."""

    def __init__(self, client):
        """
        Args:
            client: Supabase client instance from ProviderRegistry.
                    Same client shared with all other repos.
        """
        self.client = client
        self.table = "project_templates"

    # ── List (lightweight — no scaffold_data) ──────────────

    async def list_templates(
        self,
        org_id: str,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        include_system: bool = True,
        include_archived: bool = False,
        sort_by: str = "updated_at",
        skip: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        # Select lightweight columns (exclude scaffold_data for list view)
        query = self.client.table(self.table).select(
            "id, name, description, industry, project_subtype, "
            "project_type_default, is_system, version, usage_count, "
            "source, tags, is_archived, created_at, updated_at, "
            "scaffold_data"  # Need this to compute WG/job counts
        )

        # Scope: org's templates + optionally system templates
        if include_system:
            query = query.or_(f"org_id.eq.{org_id},is_system.eq.true")
        else:
            query = query.eq("org_id", org_id)

        if not include_archived:
            query = query.eq("is_archived", False)

        if industry:
            query = query.eq("industry", industry)

        if search:
            query = query.ilike("name", f"%{search}%")

        # Sort
        desc = sort_by in ("usage_count", "updated_at")
        query = query.order(sort_by, desc=desc)

        query = query.range(skip, skip + limit - 1)

        result = query.execute()
        rows = result.data or []

        # Compute WG/job counts from scaffold_data, then strip it
        for row in rows:
            sd = row.get("scaffold_data") or {}
            if isinstance(sd, str):
                try:
                    sd = json.loads(sd)
                except (json.JSONDecodeError, TypeError):
                    sd = {}
            row["workgroup_count"] = len(sd.get("workgroups", []))
            row["job_count"] = len(sd.get("jobs", []))
            del row["scaffold_data"]  # Don't send full data in list view

        return rows

    # ── Get (full record with scaffold_data) ───────────────

    async def get_template(self, template_id: str) -> Optional[dict]:
        try:
            result = (
                self.client.table(self.table)
                .select("*")
                .eq("id", template_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    # ── Create ─────────────────────────────────────────────

    async def create_template(self, org_id: str, created_by: Optional[str], data: dict) -> dict:
        record = {
            "org_id": org_id,
            "name": data["name"],
            "description": data.get("description"),
            "industry": data.get("industry"),
            "project_subtype": data.get("project_subtype"),
            "project_type_default": data.get("project_type_default", "direct"),
            "scaffold_data": data["scaffold_data"],
            "default_settings": data.get("default_settings"),
            "is_system": False,
            "version": 1,
            "usage_count": 0,
            "created_by": created_by,
            "source": data.get("source", "manual"),
            "source_project_id": data.get("source_project_id"),
            "tags": data.get("tags", []),
            "is_archived": False,
        }

        result = (
            self.client.table(self.table)
            .insert(record)
            .execute()
        )
        return result.data[0] if result.data else record

    # ── Update (increments version) ────────────────────────

    async def update_template(self, template_id: str, data: dict) -> dict:
        # Get current version
        current = await self.get_template(template_id)
        if not current:
            raise ValueError(f"Template {template_id} not found")
        if current.get("is_system"):
            raise ValueError("Cannot edit system templates. Duplicate first.")

        update_data = {k: v for k, v in data.items() if v is not None}
        update_data["version"] = current["version"] + 1
        update_data["updated_at"] = "now()"

        result = (
            self.client.table(self.table)
            .update(update_data)
            .eq("id", template_id)
            .execute()
        )
        return result.data[0] if result.data else update_data

    # ── Archive (soft delete) ──────────────────────────────

    async def archive_template(self, template_id: str) -> bool:
        result = (
            self.client.table(self.table)
            .update({"is_archived": True, "updated_at": "now()"})
            .eq("id", template_id)
            .eq("is_system", False)
            .execute()
        )
        return bool(result.data)

    # ── Duplicate ──────────────────────────────────────────

    async def duplicate_template(self, template_id: str, org_id: str, created_by: Optional[str]) -> dict:
        original = await self.get_template(template_id)
        if not original:
            raise ValueError(f"Template {template_id} not found")

        new_name = f"{original['name']} (Copy)"
        data = {
            "name": new_name,
            "description": original.get("description"),
            "industry": original.get("industry"),
            "project_subtype": original.get("project_subtype"),
            "project_type_default": original.get("project_type_default", "direct"),
            "scaffold_data": original["scaffold_data"],
            "default_settings": original.get("default_settings"),
            "source": "manual",
            "tags": original.get("tags", []),
        }

        return await self.create_template(org_id, created_by, data)

    # ── Increment usage ────────────────────────────────────

    async def increment_usage(self, template_id: str) -> None:
        current = await self.get_template(template_id)
        if current:
            new_count = (current.get("usage_count") or 0) + 1
            self.client.table(self.table).update(
                {"usage_count": new_count}
            ).eq("id", template_id).execute()

    # ── Create from project ────────────────────────────────

    async def create_from_project(
        self,
        project_id: str,
        org_id: str,
        created_by: Optional[str],
        name: str,
        description: Optional[str] = None,
        tags: list[str] = [],
    ) -> dict:
        """
        Extract a project's skeleton and save as a template.
        Queries worksites → workgroups → jobs, strips specific data,
        builds scaffold_data JSONB.
        """
        # Fetch project
        proj = (
            self.client.table("projects")
            .select("*")
            .eq("id", project_id)
            .single()
            .execute()
        ).data
        if not proj:
            raise ValueError(f"Project {project_id} not found")

        # Fetch worksites
        worksites_raw = (
            self.client.table("worksites")
            .select("id, name, address_line1, city, state")
            .eq("project_id", project_id)
            .execute()
        ).data or []

        # Build worksite index: ws_id → index
        ws_index = {}
        scaffold_worksites = []
        for i, ws in enumerate(worksites_raw):
            ws_index[ws["id"]] = i
            addr = f"{ws.get('address_line1', '')}, {ws.get('city', '')} {ws.get('state', '')}".strip(", ")
            scaffold_worksites.append({"name": ws["name"], "address": addr})

        # Fetch all workgroups for project's worksites
        wgs_raw = []
        for ws_id in ws_index.keys():
            r = self.client.table("workgroups").select(
                "id, worksite_id, title, trade, budget"
            ).eq("worksite_id", ws_id).execute()
            wgs_raw.extend(r.data or [])

        # Fetch dependencies
        wg_ids = [wg["id"] for wg in wgs_raw]
        deps_raw = []
        for wg_id in wg_ids:
            r = self.client.table("workgroup_dependencies").select(
                "workgroup_id, depends_on_workgroup_id"
            ).eq("workgroup_id", wg_id).execute()
            deps_raw.extend(r.data or [])

        # Build WG index
        wg_index = {}
        total_budget = float(proj.get("total_budget") or 1)
        scaffold_workgroups = []
        for i, wg in enumerate(wgs_raw):
            wg_index[wg["id"]] = i
            wg_budget = float(wg.get("budget") or 0)
            budget_pct = round(wg_budget / total_budget, 4) if total_budget > 0 else 0
            scaffold_workgroups.append({
                "title": wg["title"],
                "trade": wg.get("trade") or "",
                "contractor_type": "",
                "worksite_index": ws_index.get(wg["worksite_id"], 0),
                "depends_on_indices": [],  # filled below
                "notes": "",
                "budget_pct": budget_pct,
            })

        # Fill dependency indices
        for dep in deps_raw:
            wg_idx = wg_index.get(dep["workgroup_id"])
            dep_idx = wg_index.get(dep["depends_on_workgroup_id"])
            if wg_idx is not None and dep_idx is not None:
                scaffold_workgroups[wg_idx]["depends_on_indices"].append(dep_idx)

        # Fetch jobs
        scaffold_jobs = []
        for wg_id in wg_ids:
            jobs_raw = (
                self.client.table("jobs")
                .select("title, budget, est_duration_days, sequence")
                .eq("workgroup_id", wg_id)
                .order("sequence")
                .execute()
            ).data or []

            wg_idx = wg_index[wg_id]
            for job in jobs_raw:
                job_budget = float(job.get("budget") or 0)
                budget_pct = round(job_budget / total_budget, 4) if total_budget > 0 else 0
                scaffold_jobs.append({
                    "title": job["title"],
                    "workgroup_index": wg_idx,
                    "sequence": job.get("sequence") or 1,
                    "est_duration_days": job.get("est_duration_days") or 1,
                    "budget_pct": budget_pct,
                    "notes": "",
                })

        est_duration = sum(j.get("est_duration_days", 0) for j in scaffold_jobs)

        scaffold_data = {
            "worksites": scaffold_worksites,
            "workgroups": scaffold_workgroups,
            "jobs": scaffold_jobs,
            "summary": f"Template extracted from project: {proj.get('title', '')}",
            "estimated_duration_days": est_duration,
            "trade_count": len(set(wg.get("trade", "") for wg in scaffold_workgroups if wg.get("trade"))),
        }

        template_data = {
            "name": name,
            "description": description,
            "industry": proj.get("industry"),
            "project_subtype": proj.get("project_subtype"),
            "project_type_default": proj.get("project_type", "direct"),
            "scaffold_data": scaffold_data,
            "source": "from_project",
            "source_project_id": project_id,
            "tags": tags,
        }

        return await self.create_template(org_id, created_by, template_data)
