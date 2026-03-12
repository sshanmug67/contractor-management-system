"""
Interface — Project Repository

Abstract base class defining all project data operations.
Implementations: SupabaseProjectRepository, SQLAlchemyProjectRepository.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IProjectRepository(ABC):
    """Abstract interface for project data access."""

    @abstractmethod
    async def list_projects(
        self,
        org_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """List projects for an org with worksite counts."""
        ...

    @abstractmethod
    async def create_project(self, org_id: str, created_by: str, data: dict) -> dict:
        """Create a new project."""
        ...

    @abstractmethod
    async def get_project(self, project_id: str) -> Optional[dict]:
        """Get basic project record."""
        ...

    @abstractmethod
    async def get_project_detail(self, project_id: str) -> Optional[dict]:
        """Get project with full stats (worksites, financials)."""
        ...

    @abstractmethod
    async def get_project_worksites(self, project_id: str) -> list[dict]:
        """Get all worksites for a project with workgroup/job counts."""
        ...

    @abstractmethod
    async def update_project(self, project_id: str, data: dict) -> dict:
        """Update project fields."""
        ...

    @abstractmethod
    async def delete_project(self, project_id: str) -> bool:
        """Delete project (cascades to worksites → workgroups → jobs)."""
        ...

    @abstractmethod
    async def cascade_progress(self, project_id: str):
        """Recalculate project progress from worksite averages."""
        ...
