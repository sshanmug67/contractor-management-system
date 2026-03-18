"""
Pydantic Models — Dependency Analyzer

Two-tier model design:
    ProjectGraph    — Lean input for DAGAnalyzer (computation only)
    GanttData       — Rich superset for frontend (ProjectGraph + display fields)

Plus output models for all 9 analytical methods.

Usage:
    # Build ProjectGraph from database records
    graph = ProjectGraph(workgroups=[...], jobs=[...], wg_edges=[...], job_edges=[...])

    # Pass to DependencyService
    service = DependencyService(graph)
    snapshot = service.health_snapshot(today=date.today())

    # Build GanttData for frontend (includes graph + display fields + analysis)
    gantt = GanttData(project=..., worksites=[...], graph=graph, analysis=snapshot)
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date
from decimal import Decimal
from enum import Enum


# ══════════════════════════════════════════════════════════════
# ENUMS
# ══════════════════════════════════════════════════════════════


class CriticalityTier(str, Enum):
    CRITICAL = "critical"       # 0 days float
    HIGH = "high"               # 1-3 days float
    MEDIUM = "medium"           # 4-7 days float
    LOW = "low"                 # 8+ days float


class AlertSeverity(str, Enum):
    APPROACHING = "approaching"  # 3-7 days to deadline
    IMMINENT = "imminent"        # 1-2 days to deadline
    MISSED = "missed"            # past deadline


class ConflictSeverity(str, Enum):
    FULL = "full"               # 100% timeline overlap
    PARTIAL = "partial"         # some days overlap
    POTENTIAL = "potential"     # depends on actual progress


class ForecastConfidence(str, Enum):
    LOW = "low"                 # 1-2 completed workgroups
    MEDIUM = "medium"           # 3-5 completed workgroups
    HIGH = "high"               # 6+ completed workgroups


class ForecastTrend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    WORSENING = "worsening"


# ══════════════════════════════════════════════════════════════
# PROJECT GRAPH — Lean Input for DAGAnalyzer
# ══════════════════════════════════════════════════════════════


class WorkgroupNode(BaseModel):
    """Lean workgroup representation for graph computation."""
    id: str
    title: str
    trade: str = ""
    worksite_id: Optional[str] = ""                     # ← v3: clarified Optional (empty when no site)
    project_id: str = ""                                # ← v3: NEW — direct project reference
    status: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Decimal = Decimal("0")
    est_duration_days: int = 0
    contractor_id: Optional[str] = None


class JobNode(BaseModel):
    """Lean job representation for graph computation."""
    id: str
    title: str
    workgroup_id: str
    sequence: int = 1
    status: str = ""
    est_duration_days: int = 0
    budget: Decimal = Decimal("0")


class DependencyEdge(BaseModel):
    """A directed dependency: from_id must finish before to_id can start."""
    id: Optional[str] = None    # None for proposed new edges
    from_id: str                # predecessor (must finish first)
    to_id: str                  # dependent (is blocked)
    level: Literal["workgroup", "job"]


class ProjectGraph(BaseModel):
    """
    Complete dependency graph snapshot for a project.

    This is the INPUT to the DependencyService. It contains only
    what the graph engine needs for computation. Display-only
    fields (contractor_name, progress_pct, etc.) live in GanttData.

    The caller (worker or router) assembles this from the database
    via get_project_graph(). The DependencyService converts it
    into DAGNode/DAGEdge format for the DAGAnalyzer.
    """
    project_id: str
    workgroups: list[WorkgroupNode]
    jobs: list[JobNode]
    wg_edges: list[DependencyEdge]
    job_edges: list[DependencyEdge]

    def get_workgroup(self, wg_id: str) -> Optional[WorkgroupNode]:
        return next((w for w in self.workgroups if w.id == wg_id), None)

    def get_job(self, job_id: str) -> Optional[JobNode]:
        return next((j for j in self.jobs if j.id == job_id), None)

    def jobs_for_workgroup(self, wg_id: str) -> list[JobNode]:
        return [j for j in self.jobs if j.workgroup_id == wg_id]

    def workgroup_duration(self, wg_id: str) -> int:
        """Sum of job durations for a workgroup."""
        return sum(j.est_duration_days for j in self.jobs_for_workgroup(wg_id))


# ══════════════════════════════════════════════════════════════
# GANTT DATA — Rich Superset for Frontend
# Matches the shape of OwnerDashboardData from dashboard.ts
# with added graph analysis fields
# ══════════════════════════════════════════════════════════════


class GanttJob(BaseModel):
    """Job with full display fields + dependency analysis annotations."""
    # Core fields (match DashboardJob in dashboard.ts)
    id: str
    title: str
    description: Optional[str] = None
    budget: Decimal = Decimal("0")
    est_duration_days: int = 0
    sequence: int = 1
    status: str = ""
    invoiced: bool = False
    paid: bool = False
    invoice_amount: Decimal = Decimal("0")
    depends_on_job_ids: list[str] = Field(default_factory=list)

    # Analysis annotations (from DAGAnalyzer)
    earliest_start: Optional[int] = None
    earliest_finish: Optional[int] = None
    float_days: Optional[int] = None
    is_critical: bool = False
    criticality_tier: Optional[CriticalityTier] = None


class GanttWorkgroup(BaseModel):
    """Workgroup with full display fields + dependency analysis annotations."""
    # Core fields (match DashboardWorkgroup in dashboard.ts)
    id: str
    worksite_id: str = ""                               # ← v3: CRITICAL FIX — was required str, null from DB caused validation error
    project_id: str = ""                                # ← v3: NEW — direct project reference
    title: str
    trade: Optional[str] = None
    contractor_id: Optional[str] = None
    contractor_name: str = ""
    budget: Decimal = Decimal("0")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = ""
    progress_pct: float = 0.0
    depends_on_ids: list[str] = Field(default_factory=list)
    paid: Decimal = Decimal("0")
    invoiced: Decimal = Decimal("0")
    jobs: list[GanttJob] = Field(default_factory=list)

    # Analysis annotations (from DAGAnalyzer)
    earliest_start: Optional[int] = None
    earliest_finish: Optional[int] = None
    latest_start: Optional[int] = None
    latest_finish: Optional[int] = None
    float_days: Optional[int] = None
    is_critical: bool = False
    criticality_tier: Optional[CriticalityTier] = None
    is_bottleneck: bool = False
    downstream_count: int = 0
    status_message: Optional[str] = None


class GanttWorksite(BaseModel):
    """Worksite with nested workgroups for the Gantt view."""
    # Core fields (match DashboardWorksite in dashboard.ts)
    id: str
    name: str
    address_line1: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    budget: Decimal = Decimal("0")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = ""
    progress_pct: float = 0.0
    workgroups: list[GanttWorkgroup] = Field(default_factory=list)


class GanttProject(BaseModel):
    """Project header for the Gantt view."""
    # Core fields (match DashboardProject in dashboard.ts)
    id: str
    title: str
    description: Optional[str] = None
    total_budget: Decimal = Decimal("0")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = ""

    # Analysis annotations
    projected_end_date: Optional[str] = None
    adjusted_end_date: Optional[str] = None
    project_duration_days: Optional[int] = None


class GanttData(BaseModel):
    """
    Complete response for the frontend Timeline/Gantt view.

    This is a SUPERSET of OwnerDashboardData — it contains
    everything the dashboard already returns, plus graph analysis
    annotations on every workgroup and job.

    The frontend can use this as a drop-in replacement for the
    existing dashboard data, with the analysis fields as optional
    progressive enhancements.
    """
    project: GanttProject
    worksites: list[GanttWorksite] = Field(default_factory=list)

    # Graph analysis results (embedded for the sidebar/panels)
    critical_path: list[str] = Field(default_factory=list)
    critical_path_details: list[CriticalPathEntry] = Field(default_factory=list)
    ai_insight_bullets: list[str] = Field(default_factory=list)

    # ProjectGraph embedded so frontend can send it back for
    # preview/scenario endpoints without another DB fetch
    graph: Optional[ProjectGraph] = None


# ══════════════════════════════════════════════════════════════
# CHANGE VALIDATION — Input Models
# ══════════════════════════════════════════════════════════════


class ChangeOp(BaseModel):
    """A single proposed change to the dependency graph."""
    action: Literal[
        "add_wg_dep", "remove_wg_dep",
        "add_job_dep", "remove_job_dep",
        "add_workgroup", "remove_workgroup",
        "add_job", "remove_job",
        "update_workgroup", "update_job",
    ]
    target_id: Optional[str] = None
    from_id: Optional[str] = None
    to_id: Optional[str] = None
    data: Optional[dict] = None


class BatchChange(BaseModel):
    """A batch of proposed changes to preview/apply atomically."""
    project_id: str
    changes: list[ChangeOp]


# ══════════════════════════════════════════════════════════════
# CHANGE VALIDATION — Output Models
# ══════════════════════════════════════════════════════════════


class ValidationError(BaseModel):
    code: str
    message: str
    change_index: int
    details: Optional[dict] = None


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationError] = Field(default_factory=list)


class AffectedEntity(BaseModel):
    id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    current_status: str = ""
    impact: str = ""


class TimelineShift(BaseModel):
    entity_id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    old_earliest_start: Optional[int] = None
    new_earliest_start: Optional[int] = None
    shift_days: int = 0


class OrphanedDep(BaseModel):
    edge_id: str
    from_title: str
    to_title: str
    level: Literal["workgroup", "job"]
    reason: str = ""


class ImpactResult(BaseModel):
    affected_workgroups: list[AffectedEntity] = Field(default_factory=list)
    affected_jobs: list[AffectedEntity] = Field(default_factory=list)
    timeline_shifts: list[TimelineShift] = Field(default_factory=list)
    orphaned_deps: list[OrphanedDep] = Field(default_factory=list)
    newly_unblocked: list[AffectedEntity] = Field(default_factory=list)
    newly_blocked: list[AffectedEntity] = Field(default_factory=list)
    critical_path_before: list[str] = Field(default_factory=list)
    critical_path_after: list[str] = Field(default_factory=list)
    summary: list[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    validation: ValidationResult
    impact: Optional[ImpactResult] = None
    graph_after: Optional[ProjectGraph] = None


# ══════════════════════════════════════════════════════════════
# METHOD 1 — HEALTH SNAPSHOT
# ══════════════════════════════════════════════════════════════


class DeadlineAlert(BaseModel):
    entity_id: str
    entity_title: str
    entity_type: Literal["workgroup", "job"]
    alert_type: AlertSeverity
    days_remaining: int             # negative if missed
    downstream_count: int = 0
    message: str = ""


class CriticalPathEntry(BaseModel):
    """One entry in the critical path display for the sidebar."""
    entity_id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    worksite_name: str = ""
    status: str = ""
    float_days: int = 0
    message: str = ""


class WorkgroupStatusMessage(BaseModel):
    """Per-workgroup status text for the Overview cards."""
    workgroup_id: str
    title: str
    message: str
    blocked_by: list[str] = Field(default_factory=list)
    days_until_unblocked: Optional[int] = None


class HealthSnapshot(BaseModel):
    """Output of Method 1: Daily health analysis."""
    # Unblocked
    newly_unblocked_workgroups: list[AffectedEntity] = Field(default_factory=list)
    newly_unblocked_jobs: list[AffectedEntity] = Field(default_factory=list)

    # Deadlines
    overdue_entities: list[DeadlineAlert] = Field(default_factory=list)
    approaching_deadlines: list[DeadlineAlert] = Field(default_factory=list)

    # Critical path
    critical_path: list[str] = Field(default_factory=list)
    critical_path_details: list[CriticalPathEntry] = Field(default_factory=list)

    # Per-workgroup status
    workgroup_messages: list[WorkgroupStatusMessage] = Field(default_factory=list)

    # AI insight bullets
    ai_insight_bullets: list[str] = Field(default_factory=list)

    # Project duration
    project_duration_days: int = 0


# ══════════════════════════════════════════════════════════════
# METHOD 2 — CHANGE VALIDATION
# (Uses AnalysisResponse above)
# ══════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════
# METHOD 3 — SCENARIO SIMULATION
# ══════════════════════════════════════════════════════════════


class DelayAssumption(BaseModel):
    """One delay assumption within a scenario."""
    entity_id: str
    entity_type: Literal["workgroup", "job"]
    delay_days: int = Field(..., ge=1)


class Scenario(BaseModel):
    """A single what-if scenario with one or more delay assumptions."""
    name: str
    delays: list[DelayAssumption]


class ScenarioRequest(BaseModel):
    """Input for the scenario simulation endpoint."""
    project_id: str
    scenarios: list[Scenario]


class ScenarioResult(BaseModel):
    """Result of one scenario simulation."""
    scenario_name: str
    original_end_date: Optional[str] = None
    projected_end_date: Optional[str] = None
    original_duration_days: int = 0
    projected_duration_days: int = 0
    delta_days: int = 0
    critical_path: list[str] = Field(default_factory=list)
    shifts: list[TimelineShift] = Field(default_factory=list)
    absorbed_by: list[str] = Field(default_factory=list)
    propagated_through: list[str] = Field(default_factory=list)
    cost_impact: Optional[Decimal] = None


class ScenarioReport(BaseModel):
    """Output of Method 3: Multi-scenario comparison."""
    scenarios: list[ScenarioResult] = Field(default_factory=list)
    summary: str = ""


# ══════════════════════════════════════════════════════════════
# METHOD 4 — CRITICALITY RANKING
# ══════════════════════════════════════════════════════════════


class CriticalityEntry(BaseModel):
    """One entry in the criticality ranking."""
    entity_id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    float_days: int = 0
    tier: CriticalityTier = CriticalityTier.LOW
    delay_impact_days: int = 0      # project delay if this slips 7d


class CriticalityReport(BaseModel):
    """Output of Method 4: Auto-computed sensitivity ranking."""
    rankings: list[CriticalityEntry] = Field(default_factory=list)
    top_risks: list[CriticalityEntry] = Field(default_factory=list)
    summary: str = ""


# ══════════════════════════════════════════════════════════════
# METHOD 5 — RESOURCE CONFLICT DETECTION
# ══════════════════════════════════════════════════════════════


class ConflictingWorkgroup(BaseModel):
    id: str
    title: str
    projected_start: Optional[str] = None
    projected_end: Optional[str] = None


class ResourceConflict(BaseModel):
    """A scheduling conflict for one contractor."""
    contractor_id: str
    contractor_name: str
    workgroups: list[ConflictingWorkgroup] = Field(default_factory=list)
    overlap_days: int = 0
    severity: ConflictSeverity = ConflictSeverity.POTENTIAL
    message: str = ""


# ══════════════════════════════════════════════════════════════
# METHOD 6 — PARALLEL WORK ANALYSIS
# ══════════════════════════════════════════════════════════════


class ParallelWorkReport(BaseModel):
    """Output of Method 6: What could be running now but isn't."""
    runnable: list[AffectedEntity] = Field(default_factory=list)
    active: list[AffectedEntity] = Field(default_factory=list)
    idle: list[AffectedEntity] = Field(default_factory=list)
    idle_count: int = 0
    message: str = ""


# ══════════════════════════════════════════════════════════════
# METHOD 7 — BOTTLENECK DETECTION
# ══════════════════════════════════════════════════════════════


class Bottleneck(BaseModel):
    """A node where many dependency paths converge."""
    entity_id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    direct_successors: int = 0
    total_downstream: int = 0
    bottleneck_score: float = 0.0
    message: str = ""


# ══════════════════════════════════════════════════════════════
# METHOD 8 — CASH FLOW PROJECTION
# ══════════════════════════════════════════════════════════════


class MonthlyAmount(BaseModel):
    month: str                      # "2026-04" format
    projected: Decimal = Decimal("0")
    actual: Decimal = Decimal("0")


class CashFlowReport(BaseModel):
    """Output of Method 8: Budget-weighted timeline projection."""
    monthly: list[MonthlyAmount] = Field(default_factory=list)
    cumulative: list[MonthlyAmount] = Field(default_factory=list)
    peak_month: str = ""
    total_remaining: Decimal = Decimal("0")


# ══════════════════════════════════════════════════════════════
# METHOD 9 — COMPLETION FORECAST
# ══════════════════════════════════════════════════════════════


class WorkgroupForecast(BaseModel):
    """Per-workgroup adjusted duration."""
    id: str
    title: str
    estimated_days: int = 0
    adjusted_days: int = 0
    adjusted_end_date: Optional[str] = None


class ForecastReport(BaseModel):
    """Output of Method 9: Actual-vs-estimated correction."""
    correction_factor: float = 1.0
    original_end_date: Optional[str] = None
    adjusted_end_date: Optional[str] = None
    confidence: ForecastConfidence = ForecastConfidence.LOW
    per_workgroup: list[WorkgroupForecast] = Field(default_factory=list)
    trend: ForecastTrend = ForecastTrend.STABLE
    message: str = ""


# ══════════════════════════════════════════════════════════════
# REACTIVE TRIGGER — Job Completion (from v1.0)
# ══════════════════════════════════════════════════════════════


class NotificationAction(BaseModel):
    recipient_type: Literal["contractor", "owner", "contact"]
    entity_id: str
    entity_title: str
    message: str


class UnblockedResult(BaseModel):
    """Output when a job completes — what became unblocked."""
    completed_job: JobNode
    completed_workgroup: Optional[WorkgroupNode] = None
    newly_unblocked_jobs: list[JobNode] = Field(default_factory=list)
    newly_unblocked_workgroups: list[WorkgroupNode] = Field(default_factory=list)
    critical_path_changed: bool = False
    critical_path: list[str] = Field(default_factory=list)
    notifications: list[NotificationAction] = Field(default_factory=list)


# ══════════════════════════════════════════════════════════════
# PERIODIC TRIGGER — Delay Impact (from v1.0)
# ══════════════════════════════════════════════════════════════


class DelayedEntity(BaseModel):
    id: str
    title: str
    entity_type: Literal["workgroup", "job"]
    expected_end: Optional[str] = None
    current_status: str = ""
    days_overdue: int = 0
    days_until_deadline: int = 0
    is_on_critical_path: bool = False


class CascadingDelay(BaseModel):
    source: DelayedEntity
    affected: list[AffectedEntity] = Field(default_factory=list)
    estimated_delay_days: int = 0
    project_end_impact_days: int = 0


class DelayImpactResult(BaseModel):
    """Output of the deadline monitor periodic analysis."""
    overdue_entities: list[DelayedEntity] = Field(default_factory=list)
    approaching_deadlines: list[DelayedEntity] = Field(default_factory=list)
    cascading_delays: list[CascadingDelay] = Field(default_factory=list)
    alerts: list[DeadlineAlert] = Field(default_factory=list)
    critical_path: list[str] = Field(default_factory=list)
    project_end_at_risk: bool = False
    estimated_project_delay_days: int = 0
    ai_insight_bullets: list[str] = Field(default_factory=list)


class SensitivityLevel(str, Enum):
    """How sensitive is this workgroup to delay."""
    CRITICAL = "critical"       # coefficient >= 0.9 — near 1:1 delay propagation
    HIGH = "high"               # coefficient >= 0.5 — significant propagation
    MODERATE = "moderate"       # coefficient > 0 — some propagation after float
    RESILIENT = "resilient"     # coefficient == 0 — fully absorbed by float


class SensitivityEntry(BaseModel):
    """Sensitivity result for a single workgroup."""
    workgroup_id: str
    title: str
    trade: str = ""
    contractor_name: str = ""
    worksite_id: str = ""
    worksite_name: str = ""
    status: str = ""

    # Core sensitivity metrics
    test_delay_days: int                    # input delay used for test (e.g. 3)
    project_delay_days: int                 # resulting project delay
    sensitivity_coefficient: float          # project_delay / test_delay (0.0–1.0)
    sensitivity_level: SensitivityLevel

    # Float / buffer info
    float_days: int = 0                     # available slack before project impact
    break_even_days: int = 0                # max delay with zero project impact

    # Downstream impact
    downstream_count: int = 0               # total WGs affected by this delay
    affected_workgroup_ids: list[str] = Field(default_factory=list)
    affected_budget: float = 0              # sum of budget across affected WGs

    # Critical path info
    is_on_critical_path: bool = False
    is_bottleneck: bool = False


class SiteSensitivity(BaseModel):
    """Aggregated sensitivity for a worksite."""
    worksite_id: str
    worksite_name: str
    workgroup_count: int
    critical_count: int                     # WGs with sensitivity_level == CRITICAL
    high_count: int                         # WGs with sensitivity_level == HIGH
    most_sensitive_wg: Optional[SensitivityEntry] = None
    avg_coefficient: float = 0.0
    max_coefficient: float = 0.0
    site_risk_score: float = 0.0            # weighted score for ranking sites


class SensitivityReport(BaseModel):
    """Complete sensitivity analysis result for a project."""
    project_id: str
    test_delay_days: int                    # standard delay used (e.g. 3)
    computed_at: str                        # ISO timestamp

    # Per-workgroup results (sorted by coefficient descending)
    entries: list[SensitivityEntry] = Field(default_factory=list)

    # Per-site aggregation
    site_sensitivities: list[SiteSensitivity] = Field(default_factory=list)

    # Project-level summary
    total_workgroups_tested: int = 0
    critical_count: int = 0
    high_count: int = 0
    moderate_count: int = 0
    resilient_count: int = 0

    # Top risks (top 5 most sensitive)
    top_risks: list[SensitivityEntry] = Field(default_factory=list)

    # Human-readable summary
    summary: str = ""
    ai_bullets: list[str] = Field(default_factory=list)