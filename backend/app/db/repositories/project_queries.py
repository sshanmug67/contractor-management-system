"""
Project Queries

Handles:
- Project CRUD
- Project list with worksite counts
- Project detail with financial rollup (joins: worksites, workgroups, invoices)
- Project progress cascade
"""

from typing import Optional
from app.db.repositories.base_repository import BaseRepository

# ── Cross-table: Project detail with aggregated stats ─────

GET_PROJECT_DETAIL = """
    SELECT * FROM v_project_overview WHERE project_id = :project_id;
"""

# ── Cross-table: All worksites for a project with summaries ─

GET_PROJECT_WORKSITES = """
    SELECT
        ws.*,
        COUNT(DISTINCT wg.id) AS workgroup_count,
        COUNT(DISTINCT wg.id) FILTER (WHERE wg.status = 'complete') AS workgroups_complete,
        COUNT(DISTINCT j.id) AS job_count,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('complete', 'invoiced', 'paid')) AS jobs_complete
    FROM worksites ws
    LEFT JOIN workgroups wg ON ws.id = wg.worksite_id
    LEFT JOIN jobs j ON wg.id = j.workgroup_id
    WHERE ws.project_id = :project_id
    GROUP BY ws.id
    ORDER BY ws.start_date, ws.name;
"""


class ProjectRepository(BaseRepository):
    """Queries for project operations."""

    TABLE = "projects"

    async def list_projects(
        self,
        org_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """List projects for an org with worksite counts."""
        query = (
            self.client.table(self.TABLE)
            .select("*, worksites(count)")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
        )
        if status:
            query = query.eq("status", status)

        result = query.execute()
        return result.data or []

    async def create_project(self, org_id: str, created_by: str, data: dict) -> dict:
        """Create a new project."""
        data["org_id"] = org_id
        data["created_by"] = created_by
        return await self.insert_one(self.TABLE, data)

    async def get_project(self, project_id: str) -> Optional[dict]:
        """Get basic project record."""
        return await self.fetch_one(self.TABLE, project_id)

    async def get_project_detail(self, project_id: str) -> Optional[dict]:
        """Get project with full stats from v_project_overview."""
        result = self.client.rpc(
            "fn_noop",  # TODO: replace with view query or RPC
            {}
        ).execute()
        # TODO: Query v_project_overview view for project_id
        # TODO: Attach worksites via GET_PROJECT_WORKSITES
        return None

    async def get_project_worksites(self, project_id: str) -> list[dict]:
        """Get all worksites for a project with workgroup/job counts."""
        # TODO: Execute GET_PROJECT_WORKSITES
        # For now, use Supabase client:
        result = (
            self.client.table("worksites")
            .select("*, workgroups(count), workgroups(jobs(count))")
            .eq("project_id", project_id)
            .order("start_date")
            .execute()
        )
        return result.data or []

    async def update_project(self, project_id: str, data: dict) -> dict:
        """Update project fields."""
        return await self.update_one(self.TABLE, project_id, data)

    async def delete_project(self, project_id: str) -> bool:
        """Delete project (cascades to worksites → workgroups → jobs)."""
        return await self.delete_one(self.TABLE, project_id)

    async def cascade_progress(self, project_id: str):
        """Recalculate project progress from worksite averages."""
        return await self.rpc("fn_recalculate_project_progress", {"p_project_id": project_id})
