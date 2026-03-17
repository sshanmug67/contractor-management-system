"""
Pydantic Models — Project Settings, Scaffolding & Template Library

Three model groups:
  1. ProjectSettings — Direct/Contract type, payment terms, retainage
  2. Scaffold* — LLM-generated project skeletons
  3. Template* — Saved project templates (Template Library)

All scaffold_data uses the same ScaffoldResponse shape whether generated
by the LLM or stored in a template. This means the same frontend editor
component works for both paths.

File: app/models/project_settings.py
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Literal

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════
# 1. PROJECT SETTINGS
# ═══════════════════════════════════════════════════════════


class ProjectType(str, Enum):
    """Financial type of a project."""
    DIRECT = "direct"       # CapEx / in-house — money flows OUT only
    CONTRACT = "contract"   # Client project — money flows IN and OUT


class RetainageRelease(str, Enum):
    """When retainage is released."""
    SUBSTANTIAL_COMPLETION = "substantial_completion"
    FINAL_COMPLETION = "final_completion"
    TIME_BASED = "time_based"


class DrawFrequency(str, Enum):
    """How often client draws are submitted."""
    MONTHLY = "monthly"
    MILESTONE = "milestone"
    MANUAL = "manual"


class ProjectSettings(BaseModel):
    """
    Project-level settings that affect cash flow, invoicing, and reporting.
    Stored as fields on the projects table.
    """
    project_type: ProjectType = ProjectType.DIRECT
    industry: Optional[str] = None
    project_subtype: Optional[str] = None

    # Contractor payment terms (business → contractor)
    contractor_payment_terms: int = Field(15, description="Net days: 15, 30, or 45")

    # Client payment terms (client → business) — Contract projects only
    client_payment_terms: Optional[int] = Field(None, description="Net days: 30, 45, or 60")
    client_name: Optional[str] = None
    contract_value: Optional[Decimal] = Field(None, ge=0, decimal_places=2)

    # Retainage
    retainage_pct: Decimal = Field(
        Decimal("0"), ge=0, le=Decimal("0.20"),
        description="Client retainage percentage (0.05 = 5%)",
    )
    retainage_release: RetainageRelease = RetainageRelease.SUBSTANTIAL_COMPLETION
    sub_retainage_pct: Decimal = Field(
        Decimal("0"), ge=0, le=Decimal("0.20"),
        description="Retainage held from subcontractors",
    )

    # Draw frequency — Contract projects only
    draw_frequency: DrawFrequency = DrawFrequency.MONTHLY


class ProjectSettingsUpdate(BaseModel):
    """Partial update for project settings fields."""
    project_type: Optional[ProjectType] = None
    industry: Optional[str] = None
    project_subtype: Optional[str] = None
    contractor_payment_terms: Optional[int] = None
    client_payment_terms: Optional[int] = None
    client_name: Optional[str] = None
    contract_value: Optional[Decimal] = None
    retainage_pct: Optional[Decimal] = None
    retainage_release: Optional[RetainageRelease] = None
    sub_retainage_pct: Optional[Decimal] = None
    draw_frequency: Optional[DrawFrequency] = None


# ═══════════════════════════════════════════════════════════
# 2. SCAFFOLDING (LLM-generated project skeletons)
# ═══════════════════════════════════════════════════════════


class ScaffoldWorksite(BaseModel):
    """A worksite in a scaffold — just name and address."""
    name: str
    address: str = ""


class ScaffoldWorkgroup(BaseModel):
    """
    A workgroup in a scaffold.
    Dependencies reference other workgroups by array index (not ID).
    """
    title: str
    trade: str
    contractor_type: str = ""
    worksite_index: int = 0
    depends_on_indices: list[int] = Field(default_factory=list)
    notes: str = ""
    budget_pct: float = Field(0, ge=0, le=1, description="Fraction of total budget (0.15 = 15%)")


class ScaffoldJob(BaseModel):
    """A job within a scaffold workgroup."""
    title: str
    workgroup_index: int
    sequence: int = 1
    est_duration_days: int = Field(1, ge=1)
    budget_pct: float = Field(0, ge=0, le=1, description="Fraction of total budget")
    notes: str = ""


class ScaffoldResponse(BaseModel):
    """
    Complete project skeleton — output of LLM scaffolding,
    and the shape stored in project_templates.scaffold_data.

    This is THE canonical shape for project skeletons everywhere.
    """
    worksites: list[ScaffoldWorksite] = Field(default_factory=list)
    workgroups: list[ScaffoldWorkgroup] = Field(default_factory=list)
    jobs: list[ScaffoldJob] = Field(default_factory=list)
    summary: str = ""
    estimated_duration_days: int = 0
    trade_count: int = 0


class ScaffoldRequest(BaseModel):
    """Request body for POST /api/projects/scaffold."""
    description: str = Field(..., min_length=10, max_length=2000)
    project_type: ProjectType = ProjectType.DIRECT
    industry: Optional[str] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    timeline_months: Optional[int] = Field(None, ge=1, le=60)
    num_worksites: int = Field(1, ge=1, le=20)
    address: Optional[str] = None


class RefineRequest(BaseModel):
    """Request body for POST /api/projects/scaffold/refine."""
    current_scaffold: ScaffoldResponse
    feedback: str = Field(..., min_length=5, max_length=1000)


class CreateFromScaffoldRequest(BaseModel):
    """Request body for POST /api/projects/create-from-scaffold."""
    scaffold: ScaffoldResponse
    project_settings: ProjectSettings
    project_name: str = Field(..., min_length=1, max_length=200)
    project_description: str = ""
    total_budget: Optional[Decimal] = Field(None, ge=0)
    start_date: Optional[str] = None  # ISO date string
    save_as_template: bool = False
    template_name: Optional[str] = None


class CreateFromTemplateRequest(BaseModel):
    """Request body for POST /api/projects/create-from-template/{template_id}."""
    project_name: str = Field(..., min_length=1, max_length=200)
    project_description: str = ""
    project_settings: ProjectSettings
    total_budget: Optional[Decimal] = Field(None, ge=0)
    start_date: Optional[str] = None
    # Overrides: user can remove WGs or jobs from the template
    remove_workgroup_indices: list[int] = Field(default_factory=list)
    remove_job_indices: list[int] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════
# 3. TEMPLATE LIBRARY
# ═══════════════════════════════════════════════════════════


class TemplateSource(str, Enum):
    """How a template was created."""
    LLM_SCAFFOLD = "llm_scaffold"
    FROM_PROJECT = "from_project"
    MANUAL = "manual"
    SYSTEM = "system"


class ProjectTemplate(BaseModel):
    """Full template record from the database."""
    id: str
    org_id: str
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    project_subtype: Optional[str] = None
    project_type_default: str = "direct"
    scaffold_data: ScaffoldResponse
    default_settings: Optional[ProjectSettings] = None
    is_system: bool = False
    version: int = 1
    usage_count: int = 0
    created_by: Optional[str] = None
    source: TemplateSource = TemplateSource.MANUAL
    source_project_id: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    is_archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TemplateListItem(BaseModel):
    """Lightweight template for list views (no scaffold_data)."""
    id: str
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    project_subtype: Optional[str] = None
    project_type_default: str = "direct"
    is_system: bool = False
    version: int = 1
    usage_count: int = 0
    source: str = "manual"
    tags: list[str] = Field(default_factory=list)
    workgroup_count: int = 0
    job_count: int = 0
    updated_at: Optional[datetime] = None


class CreateTemplateRequest(BaseModel):
    """Request body for POST /api/templates."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    industry: Optional[str] = None
    project_subtype: Optional[str] = None
    project_type_default: str = "direct"
    scaffold_data: ScaffoldResponse
    default_settings: Optional[ProjectSettings] = None
    tags: list[str] = Field(default_factory=list)


class UpdateTemplateRequest(BaseModel):
    """Request body for PUT /api/templates/{id}."""
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    project_subtype: Optional[str] = None
    project_type_default: Optional[str] = None
    scaffold_data: Optional[ScaffoldResponse] = None
    default_settings: Optional[ProjectSettings] = None
    tags: Optional[list[str]] = None


class CreateFromProjectRequest(BaseModel):
    """Request body for POST /api/templates/from-project/{project_id}."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class QuickStartTemplate(BaseModel):
    """A pre-filled prompt for the quick-start buttons."""
    id: str
    name: str
    industry: str
    project_type_default: str = "direct"
    description: str
    prompt: str
