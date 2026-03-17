"""
Service — Template Service

Business logic for the Template Library. Thin wrapper over the
template repository with validation and enrichment.

GOLDEN RULE: This service does not import from any specific provider.
It receives the repository interface via the router's DI.

File: app/services/template_service.py
"""

from __future__ import annotations

import logging
from typing import Optional

from app.db.interfaces.template_repository import ITemplateRepository
from app.models.project_settings import (
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateListItem,
    ProjectTemplate,
)

logger = logging.getLogger(__name__)


class TemplateService:
    """
    Template Library business logic.

    Usage (from router):
        service = TemplateService(template_repo)
        templates = await service.list_templates(org_id)
        template = await service.create_template(org_id, user_id, request)
    """

    def __init__(self, repo: ITemplateRepository):
        self._repo = repo

    # ── List ──────────────────────────────────────────────

    async def list_templates(
        self,
        org_id: str,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        include_system: bool = True,
        sort_by: str = "updated_at",
        skip: int = 0,
        limit: int = 50,
    ) -> list[TemplateListItem]:
        """List templates as lightweight items (no scaffold_data)."""
        rows = await self._repo.list_templates(
            org_id=org_id,
            industry=industry,
            search=search,
            include_system=include_system,
            sort_by=sort_by,
            skip=skip,
            limit=limit,
        )
        return [TemplateListItem(**row) for row in rows]

    # ── Get ───────────────────────────────────────────────

    async def get_template(self, template_id: str) -> Optional[ProjectTemplate]:
        """Get full template including scaffold_data."""
        row = await self._repo.get_template(template_id)
        if not row:
            return None
        return ProjectTemplate(**row)

    # ── Create ────────────────────────────────────────────

    async def create_template(
        self,
        org_id: str,
        created_by: Optional[str],
        request: CreateTemplateRequest,
    ) -> ProjectTemplate:
        """Create a new custom template."""
        data = {
            "name": request.name,
            "description": request.description,
            "industry": request.industry,
            "project_subtype": request.project_subtype,
            "project_type_default": request.project_type_default,
            "scaffold_data": request.scaffold_data.model_dump(),
            "default_settings": request.default_settings.model_dump() if request.default_settings else None,
            "tags": request.tags,
            "source": "manual",
        }

        row = await self._repo.create_template(org_id, created_by, data)
        return ProjectTemplate(**row)

    # ── Create from LLM scaffold ──────────────────────────

    async def create_from_scaffold(
        self,
        org_id: str,
        created_by: Optional[str],
        name: str,
        scaffold_data: dict,
        industry: Optional[str] = None,
        tags: list[str] = [],
    ) -> ProjectTemplate:
        """Save an LLM-generated scaffold as a template."""
        data = {
            "name": name,
            "industry": industry,
            "scaffold_data": scaffold_data,
            "source": "llm_scaffold",
            "tags": tags,
        }
        row = await self._repo.create_template(org_id, created_by, data)
        return ProjectTemplate(**row)

    # ── Update ────────────────────────────────────────────

    async def update_template(
        self,
        template_id: str,
        request: UpdateTemplateRequest,
    ) -> ProjectTemplate:
        """Update template fields. Increments version."""
        data = {}
        if request.name is not None:
            data["name"] = request.name
        if request.description is not None:
            data["description"] = request.description
        if request.industry is not None:
            data["industry"] = request.industry
        if request.project_subtype is not None:
            data["project_subtype"] = request.project_subtype
        if request.project_type_default is not None:
            data["project_type_default"] = request.project_type_default
        if request.scaffold_data is not None:
            data["scaffold_data"] = request.scaffold_data.model_dump()
        if request.default_settings is not None:
            data["default_settings"] = request.default_settings.model_dump()
        if request.tags is not None:
            data["tags"] = request.tags

        row = await self._repo.update_template(template_id, data)
        return ProjectTemplate(**row)

    # ── Archive ───────────────────────────────────────────

    async def archive_template(self, template_id: str) -> bool:
        """Soft-delete a template."""
        return await self._repo.archive_template(template_id)

    # ── Duplicate ─────────────────────────────────────────

    async def duplicate_template(
        self,
        template_id: str,
        org_id: str,
        created_by: Optional[str],
    ) -> ProjectTemplate:
        """Copy a template (e.g., system → custom for editing)."""
        row = await self._repo.duplicate_template(template_id, org_id, created_by)
        return ProjectTemplate(**row)

    # ── Create from project ───────────────────────────────

    async def create_from_project(
        self,
        project_id: str,
        org_id: str,
        created_by: Optional[str],
        name: str,
        description: Optional[str] = None,
        tags: list[str] = [],
    ) -> ProjectTemplate:
        """Extract a project's skeleton and save as template."""
        row = await self._repo.create_from_project(
            project_id=project_id,
            org_id=org_id,
            created_by=created_by,
            name=name,
            description=description,
            tags=tags,
        )
        return ProjectTemplate(**row)

    # ── Increment usage ───────────────────────────────────

    async def increment_usage(self, template_id: str) -> None:
        """Increment usage_count (called when project created from template)."""
        await self._repo.increment_usage(template_id)
