"""
Interface — Template Repository

Abstract base class defining all template data operations.
Follows the same pattern as IProjectRepository.

Implementations: SupabaseTemplateRepository

File: app/db/interfaces/template_repository.py
"""

from abc import ABC, abstractmethod
from typing import Optional


class ITemplateRepository(ABC):
    """Abstract interface for project template data access."""

    @abstractmethod
    async def list_templates(
        self,
        org_id: str,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        include_system: bool = True,
        include_archived: bool = False,
        sort_by: str = "updated_at",  # usage_count, updated_at, name
        skip: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """
        List templates for an org.
        Includes system templates (is_system=true) unless excluded.
        Returns lightweight records (no scaffold_data).
        """
        ...

    @abstractmethod
    async def get_template(self, template_id: str) -> Optional[dict]:
        """Get full template record including scaffold_data."""
        ...

    @abstractmethod
    async def create_template(self, org_id: str, created_by: Optional[str], data: dict) -> dict:
        """
        Create a new custom template.
        data includes: name, scaffold_data, industry, tags, etc.
        Sets version=1, usage_count=0, source from data.
        """
        ...

    @abstractmethod
    async def update_template(self, template_id: str, data: dict) -> dict:
        """
        Update template fields. Increments version automatically.
        Only allowed for custom templates (is_system=false).
        """
        ...

    @abstractmethod
    async def archive_template(self, template_id: str) -> bool:
        """Soft-delete: set is_archived=true."""
        ...

    @abstractmethod
    async def duplicate_template(self, template_id: str, org_id: str, created_by: Optional[str]) -> dict:
        """
        Copy a template (typically a system template) into the org
        as a new custom template. Sets is_system=false, version=1.
        """
        ...

    @abstractmethod
    async def increment_usage(self, template_id: str) -> None:
        """Increment usage_count by 1 (called when a project is created from this template)."""
        ...

    @abstractmethod
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
        Extract a project's WG/job/dep skeleton and save as a new template.
        Strips project-specific data (dates, budgets, contractors).
        Converts to scaffold_data JSONB shape.
        """
        ...
