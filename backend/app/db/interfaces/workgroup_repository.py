"""
Interface — Workgroup Repository

v3 MIGRATION CHANGES:
  - Added: list_by_project(project_id) — new primary query pattern
  - Modified: list_workgroups — worksite_id now Optional (for worksite-scoped views)
  - Unchanged: all other methods (keyed on workgroup_id, not worksite)
"""

from abc import ABC, abstractmethod
from typing import Optional


class IWorkgroupRepository(ABC):

    @abstractmethod
    async def list_by_project(
        self, project_id: str, status: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        """
        v3 NEW — Primary query pattern.
        List all workgroups for a project (direct, no worksite join).
        Replaces the old double-join through worksites.
        """
        ...

    @abstractmethod
    async def list_workgroups(
        self, worksite_id: Optional[str] = None, status: Optional[str] = None,    # ← v3: was required str
        skip: int = 0, limit: int = 50
    ) -> list[dict]:
        """
        List workgroups filtered by worksite.
        Retained for worksite-scoped views (WorksiteDetail page).
        v3: worksite_id is now Optional — if None, requires project_id filter
        via list_by_project() instead.
        """
        ...

    @abstractmethod
    async def create_workgroup(self, data: dict) -> dict:
        """
        Create a new workgroup.
        v3: data must include project_id (required).
        data.worksite_id is optional (null = project-level workgroup).
        """
        ...

    @abstractmethod
    async def get_workgroup(self, workgroup_id: str) -> Optional[dict]: ...

    @abstractmethod
    async def get_workgroup_detail(self, workgroup_id: str) -> Optional[dict]:
        """Workgroup with jobs, contractor info, dependencies, invoices."""
        ...

    @abstractmethod
    async def update_workgroup(self, workgroup_id: str, data: dict) -> dict: ...

    @abstractmethod
    async def update_status(self, workgroup_id: str, status: str) -> dict: ...

    @abstractmethod
    async def delete_workgroup(self, workgroup_id: str) -> bool: ...

    @abstractmethod
    async def add_dependency(
        self, workgroup_id: str, depends_on_id: str, dep_type: str = "finish_to_start"
    ) -> dict: ...

    @abstractmethod
    async def get_dependencies(self, workgroup_id: str) -> list[dict]:
        """Get workgroups that THIS workgroup depends on."""
        ...

    @abstractmethod
    async def get_dependents(self, workgroup_id: str) -> list[dict]:
        """Get workgroups that depend on THIS workgroup."""
        ...

    @abstractmethod
    async def update_progress(self, workgroup_id: str, progress_pct: float) -> None: ...

    @abstractmethod
    async def accept_workgroup(self, workgroup_id: str, worker_id: str) -> dict: ...

    @abstractmethod
    async def reject_workgroup(self, workgroup_id: str) -> dict: ...
