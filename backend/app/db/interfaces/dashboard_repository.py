"""
Interface — Dashboard Repository

All dashboard data access goes through this interface.
Concrete implementations: SupabaseDashboardRepo, (future) SQLAlchemyDashboardRepo.

The router and worker call these methods via ProviderRegistry.
They never know which provider is behind the interface.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IDashboardRepository(ABC):

    @abstractmethod
    async def get_owner_dashboard(
        self, org_id: str, project_id: str = None
    ) -> dict:
        """
        Full dashboard payload: project → worksites → workgroups → jobs,
        budget summary, and stats.
        """
        ...

    @abstractmethod
    async def get_budget_summary(self, org_id: str) -> dict:
        """Org-wide budget totals from project overview."""
        ...

    @abstractmethod
    async def get_portfolio_projects(self, org_id: str) -> list:
        """
        Get all projects for an org with aggregated stats.
        Queries v_project_overview view.

        Returns list of dicts with keys:
            id, title, status, total_budget, total_paid, total_invoiced,
            progress_pct, start_date, end_date, worksite_count,
            workgroup_count, job_count, jobs_complete
        """
        ...

    @abstractmethod
    async def get_pending_invoices(self, org_id: str) -> list:
        """
        Get invoices awaiting review across all projects for the org.
        Statuses: submitted, ai_validated, ai_flagged, pending_approval.

        Returns list of dicts with keys:
            id, invoice_number, amount, status, submitted_at,
            contractor_name, workgroup_title, worksite_name,
            project_title, job_title
        """
        ...

    @abstractmethod
    async def get_pending_workgroups(self, org_id: str) -> list:
        """
        Get workgroups with status='pending' (awaiting contractor response).

        Returns list of dicts with keys:
            id, title, trade, status, contractor_name, worksite_name
        """
        ...

    @abstractmethod
    async def get_recent_activity(self, org_id: str, limit: int = 10) -> list:
        """
        Get recent audit log entries for the org.

        Returns list of dicts with keys:
            id, entity_type, action, changes, created_at

        Note: audit_logs currently has no org_id column.
        Single-org MVP returns global entries. Multi-org milestone
        will add org_id scoping.
        """
        ...

    @abstractmethod
    async def get_project_graph(self, project_id: str) -> dict:
        """
        Return the complete dependency graph for a project.

        Fetches workgroups, jobs, workgroup dependencies, and job
        dependencies in minimal queries. Returns a dict that maps
        directly to the ProjectGraph Pydantic model.

        Used by:
          - DependencyService (all 9 analytical methods)
          - GanttData assembly (frontend timeline view)
          - dependency_changes router (preview/apply endpoints)
          - scenario_analysis router
          - progress_worker (on job completion)
          - deadline_monitor_worker (periodic analysis)

        Returns:
        {
            "project_id": str,
            "workgroups": [ { id, title, trade, worksite_id, status,
                              start_date, end_date, budget,
                              est_duration_days, contractor_id } ],
            "jobs": [ { id, title, workgroup_id, sequence, status,
                        est_duration_days, budget } ],
            "wg_edges": [ { id, from_id, to_id, level } ],
            "job_edges": [ { id, from_id, to_id, level } ],
        }
        """
        ...
