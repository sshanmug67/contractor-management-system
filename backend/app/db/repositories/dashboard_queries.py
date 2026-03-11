"""
Dashboard Queries

Cross-cutting aggregations for the business owner dashboard.
These queries span multiple tables and don't belong to any single entity.

Handles:
- Top-level org dashboard (all projects summary)
- Overdue/at-risk workgroups
- Recent activity feed
- AI alert data
"""

from app.db.repositories.base_repository import BaseRepository


class DashboardRepository(BaseRepository):
    """Queries for dashboard and cross-cutting analytics."""

    async def get_org_summary(self, org_id: str) -> dict:
        """
        Top-level dashboard: project counts, active workgroups,
        overdue items, budget summary.
        """
        # Active projects
        projects = (
            self.client.table("v_project_overview")
            .select("*")
            .eq("org_id", org_id)
            .execute()
        )

        # Workgroups needing attention (pending, in_progress, disputed)
        active_workgroups = (
            self.client.table("workgroups")
            .select("*, worksites(name, project_id, projects(title))")
            .in_("status", ["pending", "in_progress", "disputed"])
            .execute()
        )
        # TODO: filter by org — need to join through worksites → projects → org_id

        # Invoices pending approval
        pending_invoices = (
            self.client.table("invoices")
            .select("*, workgroups(title, worksites(name))")
            .in_("status", ["ai_validated", "pending_approval"])
            .execute()
        )

        return {
            "projects": projects.data or [],
            "active_workgroups": active_workgroups.data or [],
            "pending_invoices": pending_invoices.data or [],
        }

    async def get_overdue_workgroups(self, org_id: str) -> list[dict]:
        """Workgroups past their end_date that aren't complete."""
        result = (
            self.client.table("workgroups")
            .select("*, worksites(name), contractors(company_name)")
            .lt("end_date", "now()")
            .not_.in_("status", ["complete", "cancelled", "rejected"])
            .execute()
        )
        # TODO: filter by org
        return result.data or []

    async def get_stalled_workgroups(self, org_id: str, days_inactive: int = 7) -> list[dict]:
        """Workgroups with no check-ins or messages in N days."""
        # TODO: Cross-reference site_checkins and messages for last activity
        # This is a good candidate for a DB function
        return []

    async def get_recent_activity(self, org_id: str, limit: int = 20) -> list[dict]:
        """Recent activity feed: messages, uploads, check-ins, invoice events."""
        # TODO: UNION across messages, uploads, site_checkins, invoices
        # ordered by created_at DESC, limited
        return []

    async def get_budget_summary(self, org_id: str) -> dict:
        """Org-wide budget: total budget, invoiced, paid, remaining."""
        projects = (
            self.client.table("v_project_overview")
            .select("total_budget, total_invoiced, total_paid")
            .eq("org_id", org_id)
            .execute()
        )
        data = projects.data or []
        return {
            "total_budget": sum(p.get("total_budget", 0) or 0 for p in data),
            "total_invoiced": sum(p.get("total_invoiced", 0) or 0 for p in data),
            "total_paid": sum(p.get("total_paid", 0) or 0 for p in data),
            "project_count": len(data),
        }
