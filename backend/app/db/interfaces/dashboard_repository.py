"""
Interface — Dashboard Repository
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
