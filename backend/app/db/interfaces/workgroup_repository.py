"""
Interface — Workgroup Repository
"""

from abc import ABC, abstractmethod
from typing import Optional


class IWorkgroupRepository(ABC):

    @abstractmethod
    async def list_workgroups(
        self, worksite_id: str, status: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> list[dict]: ...

    @abstractmethod
    async def create_workgroup(self, data: dict) -> dict: ...

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
