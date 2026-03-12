"""
Interface — Worksite Repository

Abstract base class defining all worksite data operations.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IWorksiteRepository(ABC):
    """Abstract interface for worksite data access."""

    @abstractmethod
    async def list_worksites(
        self, project_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        """List worksites for a project."""
        ...

    @abstractmethod
    async def create_worksite(self, data: dict) -> dict:
        """Create a new worksite."""
        ...

    @abstractmethod
    async def get_worksite(self, worksite_id: str) -> Optional[dict]:
        """Get worksite by ID."""
        ...

    @abstractmethod
    async def get_worksite_detail(self, worksite_id: str) -> Optional[dict]:
        """Get worksite with contacts, workgroup summaries."""
        ...

    @abstractmethod
    async def update_worksite(self, worksite_id: str, data: dict) -> dict:
        """Update worksite fields."""
        ...

    @abstractmethod
    async def delete_worksite(self, worksite_id: str) -> bool:
        """Delete worksite (cascades to workgroups → jobs)."""
        ...

    @abstractmethod
    async def assign_contact(
        self, worksite_id: str, employee_id: str, contact_role: str
    ) -> dict:
        """Assign a business employee as contact for this worksite."""
        ...

    @abstractmethod
    async def remove_contact(self, worksite_id: str, employee_id: str) -> bool:
        """Remove a contact assignment."""
        ...

    @abstractmethod
    async def get_contacts(self, worksite_id: str) -> list[dict]:
        """Get all contacts for a worksite with employee details."""
        ...

    @abstractmethod
    async def update_progress(self, worksite_id: str, progress_pct: float) -> None:
        """Update worksite progress percentage."""
        ...
