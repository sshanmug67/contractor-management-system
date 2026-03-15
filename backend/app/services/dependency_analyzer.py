"""
Dependency Analyzer — CMS Domain Service (Layer 2)

Wraps the general-purpose DAGAnalyzer with CMS-specific domain logic.
Converts ProjectGraph into DAGNode/DAGEdge format, calls the engine,
and translates results back into domain-specific output models with
human-readable messages.

GOLDEN RULE: This service is pure. It receives data structures,
computes results, returns impact. It never touches the database,
never calls ProviderRegistry, never fires Celery tasks, and never
makes LLM calls.

Usage:
    from app.services.dependency_analyzer import DependencyService
    from app.models.dependency import ProjectGraph

    graph = ProjectGraph(...)  # assembled by caller from DB
    service = DependencyService(graph)

    # Method 1: Daily health snapshot
    snapshot = service.health_snapshot(today=date.today())

    # Method 3: What-if scenario simulation
    report = service.simulate_scenarios(scenarios=[...])

    # Method 4: Auto-computed criticality ranking
    ranking = service.criticality_ranking()
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from app.services.dag_engine import DAGAnalyzer, DAGNode, DAGEdge

from app.models.dependency import (
    # Input models
    ProjectGraph, WorkgroupNode, JobNode, DependencyEdge,
    BatchChange, ChangeOp, Scenario, ScenarioRequest,
    # Output models — Method 1: Health Snapshot
    HealthSnapshot, DeadlineAlert, CriticalPathEntry,
    WorkgroupStatusMessage, AlertSeverity,
    # Output models — Method 2: Change Validation
    AnalysisResponse, ValidationResult, ValidationError,
    ImpactResult, AffectedEntity, TimelineShift, OrphanedDep,
    # Output models — Method 3: Scenario Simulation
    ScenarioReport, ScenarioResult,
    # Output models — Method 4: Criticality Ranking
    CriticalityReport, CriticalityEntry, CriticalityTier,
    # Output models — Method 5: Resource Conflicts
    ResourceConflict, ConflictingWorkgroup, ConflictSeverity,
    # Output models — Method 6: Parallel Work
    ParallelWorkReport,
    # Output models — Method 7: Bottleneck Detection
    Bottleneck,
    # Output models — Method 8: Cash Flow
    CashFlowReport, MonthlyAmount,
    # Output models — Method 9: Completion Forecast
    ForecastReport, WorkgroupForecast, ForecastConfidence, ForecastTrend,
    # Reactive trigger
    UnblockedResult, NotificationAction,
    # Periodic trigger
    DelayImpactResult, DelayedEntity, CascadingDelay,
)


# ── Status Constants ──────────────────────────────────────────

COMPLETE_STATUSES = {"complete", "paid", "approved"}
ACTIVE_STATUSES = {"in_progress", "accepted"}
BLOCKED_STATUSES = {"pending", "draft"}
NOT_STARTED_STATUSES = {"not_started", "draft", "pending"}


def _is_complete(status: str) -> bool:
    return status.lower() in COMPLETE_STATUSES


def _is_active(status: str) -> bool:
    return status.lower() in ACTIVE_STATUSES


def _parse_date(d: Optional[str]) -> Optional[date]:
    """Parse date string to date object, return None if invalid."""
    if not d:
        return None
    try:
        return date.fromisoformat(str(d))
    except (ValueError, TypeError):
        return None


def _float_to_tier(float_days: int) -> CriticalityTier:
    """Convert float days to criticality tier."""
    if float_days <= 0:
        return CriticalityTier.CRITICAL
    elif float_days <= 3:
        return CriticalityTier.HIGH
    elif float_days <= 7:
        return CriticalityTier.MEDIUM
    else:
        return CriticalityTier.LOW


# ══════════════════════════════════════════════════════════════
# DEPENDENCY SERVICE
# ══════════════════════════════════════════════════════════════


class DependencyService:
    """
    CMS-specific dependency analysis service.

    Wraps DAGAnalyzer with domain logic. Takes a ProjectGraph,
    builds internal DAG representations at both workgroup and job
    level, and exposes 9 analytical methods.
    """

    def __init__(self, graph: ProjectGraph):
        self._graph = graph

        # Index lookups
        self._wg_map: dict[str, WorkgroupNode] = {
            w.id: w for w in graph.workgroups
        }
        self._job_map: dict[str, JobNode] = {
            j.id: j for j in graph.jobs
        }
        self._wg_for_job: dict[str, str] = {
            j.id: j.workgroup_id for j in graph.jobs
        }

        # Build workgroup-level DAG
        wg_nodes = self._build_wg_nodes()
        wg_edges = self._build_wg_edges()
        self._wg_dag = DAGAnalyzer(wg_nodes, wg_edges)

        # Build job-level DAG
        job_nodes = self._build_job_nodes()
        job_edges = self._build_job_edges()
        self._job_dag = DAGAnalyzer(job_nodes, job_edges)

        # Complete ID sets (for predecessors_satisfied checks)
        self._complete_wg_ids: set[str] = {
            w.id for w in graph.workgroups if _is_complete(w.status)
        }
        self._complete_job_ids: set[str] = {
            j.id for j in graph.jobs if _is_complete(j.status)
        }

    # ── DAG Construction Helpers ──────────────────────────────

    def _build_wg_nodes(self) -> list[DAGNode]:
        """Convert workgroups to DAGNodes. Duration = sum of job durations."""
        nodes = []
        for wg in self._graph.workgroups:
            duration = self._graph.workgroup_duration(wg.id)
            # If no jobs, use est_duration_days from the workgroup itself
            if duration == 0:
                duration = wg.est_duration_days
            nodes.append(DAGNode(
                id=wg.id,
                duration=duration,
                is_complete=_is_complete(wg.status),
            ))
        return nodes

    def _build_wg_edges(self) -> list[DAGEdge]:
        return [
            DAGEdge(from_id=e.from_id, to_id=e.to_id)
            for e in self._graph.wg_edges
        ]

    def _build_job_nodes(self) -> list[DAGNode]:
        return [
            DAGNode(
                id=j.id,
                duration=j.est_duration_days,
                is_complete=_is_complete(j.status),
            )
            for j in self._graph.jobs
        ]

    def _build_job_edges(self) -> list[DAGEdge]:
        return [
            DAGEdge(from_id=e.from_id, to_id=e.to_id)
            for e in self._graph.job_edges
        ]

    # ── Shared Helpers ────────────────────────────────────────

    def _wg_title(self, wg_id: str) -> str:
        wg = self._wg_map.get(wg_id)
        return wg.title if wg else wg_id

    def _job_title(self, job_id: str) -> str:
        job = self._job_map.get(job_id)
        return job.title if job else job_id

    def _entity_title(self, entity_id: str) -> str:
        """Look up title for either a workgroup or job ID."""
        if entity_id in self._wg_map:
            return self._wg_map[entity_id].title
        if entity_id in self._job_map:
            return self._job_map[entity_id].title
        return entity_id

    def _entity_type(self, entity_id: str) -> str:
        if entity_id in self._wg_map:
            return "workgroup"
        return "job"

    def _affected_entity(self, entity_id: str, impact: str = "") -> AffectedEntity:
        if entity_id in self._wg_map:
            wg = self._wg_map[entity_id]
            return AffectedEntity(
                id=entity_id, title=wg.title,
                entity_type="workgroup", current_status=wg.status,
                impact=impact,
            )
        elif entity_id in self._job_map:
            job = self._job_map[entity_id]
            return AffectedEntity(
                id=entity_id, title=job.title,
                entity_type="job", current_status=job.status,
                impact=impact,
            )
        return AffectedEntity(id=entity_id, title=entity_id, entity_type="workgroup")

    # ══════════════════════════════════════════════════════════
    # METHOD 1: HEALTH SNAPSHOT
    # ══════════════════════════════════════════════════════════

    def health_snapshot(self, today: Optional[date] = None) -> HealthSnapshot:
        """
        Current state of the project dependency graph.
        The "morning briefing" for the business owner.

        Args:
            today: current date for deadline calculations
        """
        if today is None:
            today = date.today()

        schedule = self._wg_dag.compute_schedule()
        critical = self._wg_dag.critical_path()
        project_duration = self._wg_dag.project_duration()

        # ── Newly unblocked workgroups ──
        newly_unblocked_wgs = []
        for wg in self._graph.workgroups:
            if _is_complete(wg.status) or _is_active(wg.status):
                continue
            if self._wg_dag.predecessors_satisfied(wg.id, self._complete_wg_ids):
                newly_unblocked_wgs.append(self._affected_entity(
                    wg.id,
                    impact=f"{wg.title} can now begin \u2014 all predecessors complete.",
                ))

        # ── Newly unblocked jobs ──
        newly_unblocked_jobs = []
        for job in self._graph.jobs:
            if _is_complete(job.status) or _is_active(job.status):
                continue
            if job.id in self._job_dag.node_ids:
                if self._job_dag.predecessors_satisfied(job.id, self._complete_job_ids):
                    newly_unblocked_jobs.append(self._affected_entity(
                        job.id,
                        impact=f"{job.title} can now begin.",
                    ))

        # ── Deadline analysis ──
        overdue = []
        approaching = []
        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue
            end = _parse_date(wg.end_date)
            if not end:
                continue
            days_remaining = (end - today).days
            downstream_count = self._wg_dag.total_downstream_count(wg.id)

            if days_remaining < 0:
                overdue.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup", alert_type=AlertSeverity.MISSED,
                    days_remaining=days_remaining,
                    downstream_count=downstream_count,
                    message=f"{wg.title} is {abs(days_remaining)} days overdue. "
                            f"{downstream_count} downstream workgroup(s) affected.",
                ))
            elif days_remaining <= 2:
                approaching.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup", alert_type=AlertSeverity.IMMINENT,
                    days_remaining=days_remaining,
                    downstream_count=downstream_count,
                    message=f"{wg.title} deadline in {days_remaining} day(s). "
                            f"{downstream_count} downstream workgroup(s) depend on it.",
                ))
            elif days_remaining <= 7:
                approaching.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup", alert_type=AlertSeverity.APPROACHING,
                    days_remaining=days_remaining,
                    downstream_count=downstream_count,
                    message=f"{wg.title} deadline in {days_remaining} days.",
                ))

        # ── Critical path details ──
        cp_details = []
        for wg_id in critical:
            wg = self._wg_map.get(wg_id)
            if wg:
                sched = schedule.get(wg_id)
                cp_details.append(CriticalPathEntry(
                    entity_id=wg_id, title=wg.title,
                    entity_type="workgroup", status=wg.status,
                    float_days=sched.total_float if sched else 0,
                    message=f"{wg.title}: {wg.status}",
                ))

        # ── Per-workgroup status messages ──
        wg_messages = []
        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                wg_messages.append(WorkgroupStatusMessage(
                    workgroup_id=wg.id, title=wg.title,
                    message=f"{wg.title} is complete.",
                ))
                continue

            preds = self._wg_dag.direct_predecessors(wg.id)
            blocking = [p for p in preds if p not in self._complete_wg_ids]

            if not preds:
                wg_messages.append(WorkgroupStatusMessage(
                    workgroup_id=wg.id, title=wg.title,
                    message=f"{wg.title} has no dependencies \u2014 can start anytime.",
                ))
            elif not blocking:
                wg_messages.append(WorkgroupStatusMessage(
                    workgroup_id=wg.id, title=wg.title,
                    message=f"{wg.title} is unblocked \u2014 all predecessors complete.",
                ))
            else:
                blocking_names = [self._wg_title(b) for b in blocking]
                wg_messages.append(WorkgroupStatusMessage(
                    workgroup_id=wg.id, title=wg.title,
                    message=f"{wg.title} is blocked by: {', '.join(blocking_names)}.",
                    blocked_by=blocking,
                ))

        # ── AI insight bullets ──
        insights = []
        done_count = len(self._complete_wg_ids)
        total_count = len(self._graph.workgroups)
        active_count = sum(1 for w in self._graph.workgroups if _is_active(w.status))
        insights.append(
            f"{done_count} of {total_count} workgroups complete. "
            f"{active_count} in progress."
        )
        if overdue:
            insights.append(
                f"{len(overdue)} workgroup(s) overdue. "
                f"Most critical: {overdue[0].entity_title}."
            )
        if newly_unblocked_wgs:
            names = [e.title for e in newly_unblocked_wgs[:3]]
            insights.append(f"Ready to start: {', '.join(names)}.")

        return HealthSnapshot(
            newly_unblocked_workgroups=newly_unblocked_wgs,
            newly_unblocked_jobs=newly_unblocked_jobs,
            overdue_entities=overdue,
            approaching_deadlines=approaching,
            critical_path=critical,
            critical_path_details=cp_details,
            workgroup_messages=wg_messages,
            ai_insight_bullets=insights,
            project_duration_days=project_duration,
        )

    # ══════════════════════════════════════════════════════════
    # METHOD 2: CHANGE VALIDATION
    # ══════════════════════════════════════════════════════════

    def validate_changes(self, batch: BatchChange) -> AnalysisResponse:
        """
        Validate proposed graph edits and preview impact.

        Processes changes in priority order:
        1. Entity additions
        2. Entity updates
        3. Dependency additions
        4. Dependency removals
        5. Entity removals
        """
        errors: list[ValidationError] = []
        working = self._graph.model_copy(deep=True)

        # Sort changes by priority
        priority = {
            "add_workgroup": 0, "add_job": 0,
            "update_workgroup": 1, "update_job": 1,
            "add_wg_dep": 2, "add_job_dep": 2,
            "remove_wg_dep": 3, "remove_job_dep": 3,
            "remove_job": 4, "remove_workgroup": 4,
        }
        ordered = sorted(
            enumerate(batch.changes),
            key=lambda x: priority.get(x[1].action, 99),
        )

        for orig_idx, change in ordered:
            change_errors = self._validate_single(working, change, orig_idx)
            if change_errors:
                errors.extend(change_errors)
                continue
            self._apply_to_working_copy(working, change)

        if errors:
            has_blocking = any(
                e.code not in ("COMPLETED_PRED_INFO", "ORPHANED_JOB_DEPS", "CHAIN_BROKEN")
                for e in errors
            )
            if has_blocking:
                return AnalysisResponse(
                    validation=ValidationResult(valid=False, errors=errors),
                    impact=None,
                    graph_after=None,
                )

        # Compute impact: compare original vs working
        impact = self._compute_impact(self._graph, working)

        return AnalysisResponse(
            validation=ValidationResult(valid=True, errors=errors),
            impact=impact,
            graph_after=working,
        )

    def _validate_single(
        self, working: ProjectGraph, change: ChangeOp, index: int
    ) -> list[ValidationError]:
        """Validate a single change operation."""
        errors = []

        if change.action in ("add_wg_dep", "add_job_dep"):
            from_id = change.from_id or ""
            to_id = change.to_id or ""

            # Self-reference
            if from_id == to_id:
                errors.append(ValidationError(
                    code="SELF_REFERENCE", change_index=index,
                    message="Cannot depend on itself.",
                ))
                return errors

            # Entity not found
            if change.action == "add_wg_dep":
                wg_ids = {w.id for w in working.workgroups}
                if from_id not in wg_ids:
                    errors.append(ValidationError(
                        code="ENTITY_NOT_FOUND", change_index=index,
                        message=f"Workgroup '{from_id}' not found.",
                    ))
                if to_id not in wg_ids:
                    errors.append(ValidationError(
                        code="ENTITY_NOT_FOUND", change_index=index,
                        message=f"Workgroup '{to_id}' not found.",
                    ))
                if errors:
                    return errors

                # Duplicate edge
                for e in working.wg_edges:
                    if e.from_id == from_id and e.to_id == to_id:
                        errors.append(ValidationError(
                            code="DUPLICATE_EDGE", change_index=index,
                            message="This dependency already exists.",
                        ))
                        return errors

                # Cross-site check
                from_wg = working.get_workgroup(from_id)
                to_wg = working.get_workgroup(to_id)
                if from_wg and to_wg and from_wg.worksite_id != to_wg.worksite_id:
                    errors.append(ValidationError(
                        code="CROSS_SITE", change_index=index,
                        message="Workgroups on different worksites cannot depend on each other.",
                    ))
                    return errors

                # Cycle detection
                try:
                    wg_nodes = self._build_wg_nodes_from(working)
                    wg_edges = [DAGEdge(from_id=e.from_id, to_id=e.to_id) for e in working.wg_edges]
                    temp_dag = DAGAnalyzer(wg_nodes, wg_edges)
                    cycle = temp_dag.detect_cycle(from_id, to_id)
                    if cycle:
                        path_names = [self._entity_title(n) for n in cycle]
                        errors.append(ValidationError(
                            code="CYCLE_DETECTED", change_index=index,
                            message=f"Would create circular dependency: {' \u2192 '.join(path_names)}",
                            details={"cycle_path": cycle},
                        ))
                except ValueError:
                    pass

            elif change.action == "add_job_dep":
                job_ids = {j.id for j in working.jobs}
                if from_id not in job_ids:
                    errors.append(ValidationError(
                        code="ENTITY_NOT_FOUND", change_index=index,
                        message=f"Job '{from_id}' not found.",
                    ))
                if to_id not in job_ids:
                    errors.append(ValidationError(
                        code="ENTITY_NOT_FOUND", change_index=index,
                        message=f"Job '{to_id}' not found.",
                    ))
                if errors:
                    return errors

                # Duplicate
                for e in working.job_edges:
                    if e.from_id == from_id and e.to_id == to_id:
                        errors.append(ValidationError(
                            code="DUPLICATE_EDGE", change_index=index,
                            message="This job dependency already exists.",
                        ))
                        return errors

                # Cycle detection
                try:
                    job_nodes = [DAGNode(id=j.id, duration=j.est_duration_days) for j in working.jobs]
                    job_edges = [DAGEdge(from_id=e.from_id, to_id=e.to_id) for e in working.job_edges]
                    temp_dag = DAGAnalyzer(job_nodes, job_edges)
                    cycle = temp_dag.detect_cycle(from_id, to_id)
                    if cycle:
                        path_names = [self._entity_title(n) for n in cycle]
                        errors.append(ValidationError(
                            code="CYCLE_DETECTED", change_index=index,
                            message=f"Would create circular job dependency: {' \u2192 '.join(path_names)}",
                            details={"cycle_path": cycle},
                        ))
                except ValueError:
                    pass

        elif change.action == "remove_workgroup":
            target = change.target_id or ""
            wg = working.get_workgroup(target)
            if not wg:
                errors.append(ValidationError(
                    code="ENTITY_NOT_FOUND", change_index=index,
                    message=f"Workgroup '{target}' not found.",
                ))
            elif wg.status in ("in_progress",):
                errors.append(ValidationError(
                    code="REMOVE_ACTIVE_WG", change_index=index,
                    message="Cannot remove an in-progress workgroup.",
                ))

        elif change.action == "remove_job":
            target = change.target_id or ""
            job = working.get_job(target)
            if not job:
                errors.append(ValidationError(
                    code="ENTITY_NOT_FOUND", change_index=index,
                    message=f"Job '{target}' not found.",
                ))
            elif job.status in ("complete", "paid"):
                errors.append(ValidationError(
                    code="DELETE_COMPLETED", change_index=index,
                    message="Cannot delete a completed or paid job.",
                ))
            elif job.status == "invoiced":
                errors.append(ValidationError(
                    code="DELETE_INVOICED", change_index=index,
                    message="Cannot delete a job with pending invoices.",
                ))

        return errors

    def _apply_to_working_copy(self, working: ProjectGraph, change: ChangeOp):
        """Apply a validated change to the working copy."""
        if change.action == "add_wg_dep":
            working.wg_edges.append(DependencyEdge(
                from_id=change.from_id or "",
                to_id=change.to_id or "",
                level="workgroup",
            ))
        elif change.action == "remove_wg_dep":
            working.wg_edges = [
                e for e in working.wg_edges
                if not (e.from_id == change.from_id and e.to_id == change.to_id)
            ]
        elif change.action == "add_job_dep":
            working.job_edges.append(DependencyEdge(
                from_id=change.from_id or "",
                to_id=change.to_id or "",
                level="job",
            ))
        elif change.action == "remove_job_dep":
            working.job_edges = [
                e for e in working.job_edges
                if not (e.from_id == change.from_id and e.to_id == change.to_id)
            ]
        elif change.action == "remove_workgroup":
            target = change.target_id or ""
            working.workgroups = [w for w in working.workgroups if w.id != target]
            working.jobs = [j for j in working.jobs if j.workgroup_id != target]
            working.wg_edges = [
                e for e in working.wg_edges
                if e.from_id != target and e.to_id != target
            ]
            working.job_edges = [
                e for e in working.job_edges
                if self._wg_for_job.get(e.from_id) != target
                and self._wg_for_job.get(e.to_id) != target
            ]
        elif change.action == "remove_job":
            target = change.target_id or ""
            working.jobs = [j for j in working.jobs if j.id != target]
            working.job_edges = [
                e for e in working.job_edges
                if e.from_id != target and e.to_id != target
            ]
        elif change.action == "add_workgroup" and change.data:
            working.workgroups.append(WorkgroupNode(**(change.data)))
        elif change.action == "add_job" and change.data:
            working.jobs.append(JobNode(**(change.data)))

    def _build_wg_nodes_from(self, graph: ProjectGraph) -> list[DAGNode]:
        """Build DAGNodes from a (possibly modified) ProjectGraph."""
        nodes = []
        for wg in graph.workgroups:
            duration = graph.workgroup_duration(wg.id)
            if duration == 0:
                duration = wg.est_duration_days
            nodes.append(DAGNode(
                id=wg.id, duration=duration,
                is_complete=_is_complete(wg.status),
            ))
        return nodes

    def _compute_impact(
        self, before: ProjectGraph, after: ProjectGraph
    ) -> ImpactResult:
        """Compare two graph states and produce impact summary."""
        # Build DAGs for before and after
        before_nodes = self._build_wg_nodes_from(before)
        before_edges = [DAGEdge(from_id=e.from_id, to_id=e.to_id) for e in before.wg_edges]
        after_nodes = self._build_wg_nodes_from(after)
        after_edges = [DAGEdge(from_id=e.from_id, to_id=e.to_id) for e in after.wg_edges]

        try:
            before_dag = DAGAnalyzer(before_nodes, before_edges)
            before_fwd = before_dag.forward_pass()
            before_cp = before_dag.critical_path()
        except ValueError:
            before_fwd = {}
            before_cp = []

        try:
            after_dag = DAGAnalyzer(after_nodes, after_edges)
            after_fwd = after_dag.forward_pass()
            after_cp = after_dag.critical_path()
        except ValueError:
            after_fwd = {}
            after_cp = []

        # Timeline shifts
        shifts = []
        after_wg_ids = {w.id for w in after.workgroups}
        for wg_id in after_wg_ids:
            if wg_id in before_fwd and wg_id in after_fwd:
                old_es = before_fwd[wg_id].earliest_start
                new_es = after_fwd[wg_id].earliest_start
                if old_es != new_es:
                    shifts.append(TimelineShift(
                        entity_id=wg_id,
                        title=self._entity_title(wg_id),
                        entity_type="workgroup",
                        old_earliest_start=old_es,
                        new_earliest_start=new_es,
                        shift_days=new_es - old_es,
                    ))

        # Summary
        summary_lines = []
        if shifts:
            delayed = [s for s in shifts if s.shift_days > 0]
            earlier = [s for s in shifts if s.shift_days < 0]
            if delayed:
                summary_lines.append(
                    f"{len(delayed)} workgroup(s) delayed."
                )
            if earlier:
                summary_lines.append(
                    f"{len(earlier)} workgroup(s) can start earlier."
                )
        if before_cp != after_cp:
            summary_lines.append("Critical path changed.")

        return ImpactResult(
            timeline_shifts=shifts,
            critical_path_before=before_cp,
            critical_path_after=after_cp,
            summary=summary_lines,
        )

    # ══════════════════════════════════════════════════════════
    # METHOD 3: SCENARIO SIMULATION
    # ══════════════════════════════════════════════════════════

    def simulate_scenarios(
        self, scenarios: list[Scenario]
    ) -> ScenarioReport:
        """
        Run multiple what-if delay scenarios and compare results.

        Each scenario specifies one or more delay assumptions.
        The engine simulates the delay, computes the ripple effect,
        and returns per-scenario results plus a comparison summary.
        """
        original_duration = self._wg_dag.project_duration()
        original_floats = self._wg_dag.float_map()
        results: list[ScenarioResult] = []

        for scenario in scenarios:
            # Build delay dict for the DAG engine
            delays: dict[str, int] = {}
            for assumption in scenario.delays:
                if assumption.entity_type == "workgroup":
                    delays[assumption.entity_id] = assumption.delay_days
                elif assumption.entity_type == "job":
                    # Job delay → add to its parent workgroup
                    wg_id = self._wg_for_job.get(assumption.entity_id)
                    if wg_id:
                        delays[wg_id] = delays.get(wg_id, 0) + assumption.delay_days

            project_delay, node_shifts = self._wg_dag.simulate_delay_impact(delays)

            # Classify: absorbed vs propagated
            absorbed = []
            propagated = []
            for node_id, shift in node_shifts.items():
                node_float = original_floats.get(node_id, 0)
                if node_id in delays:
                    continue  # skip the delayed node itself
                if shift <= 0:
                    absorbed.append(node_id)
                else:
                    propagated.append(node_id)

            # Compute shifted critical path
            delayed_fwd = self._wg_dag.simulate_delay(delays)
            delayed_duration = max(
                (r.earliest_finish for r in delayed_fwd.values()), default=0
            )

            # Build timeline shifts
            original_fwd = self._wg_dag.forward_pass()
            shifts = []
            for node_id, shift_days in node_shifts.items():
                shifts.append(TimelineShift(
                    entity_id=node_id,
                    title=self._entity_title(node_id),
                    entity_type=self._entity_type(node_id),
                    old_earliest_start=original_fwd[node_id].earliest_start,
                    new_earliest_start=delayed_fwd[node_id].earliest_start,
                    shift_days=shift_days,
                ))

            results.append(ScenarioResult(
                scenario_name=scenario.name,
                original_duration_days=original_duration,
                projected_duration_days=original_duration + project_delay,
                delta_days=project_delay,
                shifts=shifts,
                absorbed_by=absorbed,
                propagated_through=propagated,
            ))

        # Comparison summary
        results.sort(key=lambda r: r.delta_days)
        if results:
            least = results[0]
            most = results[-1]
            summary = (
                f"Least impact: {least.scenario_name} (+{least.delta_days}d). "
                f"Most impact: {most.scenario_name} (+{most.delta_days}d)."
            )
        else:
            summary = "No scenarios analyzed."

        return ScenarioReport(scenarios=results, summary=summary)

    # ══════════════════════════════════════════════════════════
    # METHOD 4: CRITICALITY RANKING
    # ══════════════════════════════════════════════════════════

    def criticality_ranking(self, delay_days: int = 7) -> CriticalityReport:
        """
        Rank every active workgroup by schedule sensitivity.

        For each non-complete workgroup, simulates a delay of
        `delay_days` and measures the project-level impact.
        Nodes on the critical path push day-for-day. Nodes with
        float absorb some or all of the delay.

        Args:
            delay_days: standard delay to simulate (default 7)
        """
        floats = self._wg_dag.float_map()
        rankings: list[CriticalityEntry] = []

        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue

            node_float = floats.get(wg.id, 0)
            tier = _float_to_tier(node_float)

            # Simulate delay impact
            project_delay, _ = self._wg_dag.simulate_delay_impact(
                {wg.id: delay_days}
            )

            rankings.append(CriticalityEntry(
                entity_id=wg.id,
                title=wg.title,
                entity_type="workgroup",
                float_days=node_float,
                tier=tier,
                delay_impact_days=project_delay,
            ))

        # Sort by impact (most critical first), then by float
        rankings.sort(key=lambda r: (-r.delay_impact_days, r.float_days))
        top_risks = rankings[:3]

        # Summary
        critical_count = sum(1 for r in rankings if r.tier == CriticalityTier.CRITICAL)
        if top_risks:
            top_name = top_risks[0].title
            top_float = top_risks[0].float_days
            summary = (
                f"{critical_count} workgroup(s) on the critical path. "
                f"{top_name} has {top_float} day(s) of slack \u2014 "
                f"{'any delay directly delays the project' if top_float == 0 else f'can absorb up to {top_float} days of delay'}."
            )
        else:
            summary = "No active workgroups to rank."

        return CriticalityReport(
            rankings=rankings, top_risks=top_risks, summary=summary,
        )

    # ══════════════════════════════════════════════════════════
    # METHOD 5: RESOURCE CONFLICT DETECTION
    # ══════════════════════════════════════════════════════════

    def detect_resource_conflicts(self) -> list[ResourceConflict]:
        """
        Detect contractors assigned to overlapping workgroups.

        Uses the forward pass to compute projected time windows,
        then checks for same-contractor overlaps.
        """
        fwd = self._wg_dag.forward_pass()

        # Group workgroups by contractor
        by_contractor: dict[str, list[WorkgroupNode]] = defaultdict(list)
        for wg in self._graph.workgroups:
            if wg.contractor_id and not _is_complete(wg.status):
                by_contractor[wg.contractor_id].append(wg)

        conflicts = []
        for contractor_id, workgroups in by_contractor.items():
            if len(workgroups) < 2:
                continue

            # Compute time windows using forward pass
            windows = []
            for wg in workgroups:
                f = fwd.get(wg.id)
                if f:
                    es = f.earliest_start
                    ef = f.earliest_finish
                    windows.append((wg, es, ef))

            # Check all pairs for overlap
            for i in range(len(windows)):
                for j in range(i + 1, len(windows)):
                    wg_a, start_a, end_a = windows[i]
                    wg_b, start_b, end_b = windows[j]

                    overlap_start = max(start_a, start_b)
                    overlap_end = min(end_a, end_b)
                    overlap_days = max(0, overlap_end - overlap_start)

                    if overlap_days > 0:
                        # Determine severity
                        len_a = end_a - start_a
                        len_b = end_b - start_b
                        min_len = min(len_a, len_b) if min(len_a, len_b) > 0 else 1
                        ratio = overlap_days / min_len

                        if ratio >= 0.8:
                            severity = ConflictSeverity.FULL
                        elif ratio >= 0.3:
                            severity = ConflictSeverity.PARTIAL
                        else:
                            severity = ConflictSeverity.POTENTIAL

                        contractor_name = wg_a.contractor_id or "Unknown"
                        conflicts.append(ResourceConflict(
                            contractor_id=contractor_id,
                            contractor_name=contractor_name,
                            workgroups=[
                                ConflictingWorkgroup(
                                    id=wg_a.id, title=wg_a.title,
                                    projected_start=str(start_a),
                                    projected_end=str(end_a),
                                ),
                                ConflictingWorkgroup(
                                    id=wg_b.id, title=wg_b.title,
                                    projected_start=str(start_b),
                                    projected_end=str(end_b),
                                ),
                            ],
                            overlap_days=overlap_days,
                            severity=severity,
                            message=(
                                f"Contractor {contractor_name} is assigned to "
                                f"{wg_a.title} and {wg_b.title}. "
                                f"{overlap_days} days of overlap detected."
                            ),
                        ))

        return conflicts

    # ══════════════════════════════════════════════════════════
    # METHOD 6: PARALLEL WORK ANALYSIS
    # ══════════════════════════════════════════════════════════

    def parallel_work_analysis(self) -> ParallelWorkReport:
        """
        Identify workgroups that could be running but aren't.

        A workgroup is "runnable" if all predecessors are complete.
        Compare runnable set vs actually active set.
        """
        runnable = []
        active = []
        idle = []

        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue

            is_unblocked = self._wg_dag.predecessors_satisfied(
                wg.id, self._complete_wg_ids
            )

            if is_unblocked:
                entity = self._affected_entity(wg.id)
                runnable.append(entity)
                if _is_active(wg.status):
                    active.append(entity)
                else:
                    idle.append(entity)

        idle_count = len(idle)
        if idle_count > 0:
            idle_names = [e.title for e in idle[:3]]
            message = (
                f"{len(runnable)} workgroups unblocked, "
                f"only {len(active)} active. "
                f"Idle: {', '.join(idle_names)}."
            )
        else:
            message = (
                f"{len(runnable)} workgroups unblocked, "
                f"all {len(active)} are active."
            )

        return ParallelWorkReport(
            runnable=runnable, active=active, idle=idle,
            idle_count=idle_count, message=message,
        )

    # ══════════════════════════════════════════════════════════
    # METHOD 7: BOTTLENECK DETECTION
    # ══════════════════════════════════════════════════════════

    def detect_bottlenecks(self, threshold: int = 2) -> list[Bottleneck]:
        """
        Identify nodes where many dependency paths converge.

        A node is a bottleneck if its direct successor count
        exceeds the threshold. Score = fan_out × avg downstream
        chain length.

        Args:
            threshold: minimum direct successors to qualify
        """
        bottlenecks = []
        depths = self._wg_dag.depth_map()

        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue

            fan = self._wg_dag.fan_out(wg.id)
            if fan < threshold:
                continue

            total_down = self._wg_dag.total_downstream_count(wg.id)
            avg_depth = total_down / fan if fan > 0 else 0
            score = fan * avg_depth

            bottlenecks.append(Bottleneck(
                entity_id=wg.id,
                title=wg.title,
                entity_type="workgroup",
                direct_successors=fan,
                total_downstream=total_down,
                bottleneck_score=round(score, 2),
                message=(
                    f"{wg.title} is a bottleneck \u2014 "
                    f"{fan} workgroups and {total_down} total "
                    f"downstream entities depend on it."
                ),
            ))

        bottlenecks.sort(key=lambda b: -b.bottleneck_score)
        return bottlenecks

    # ══════════════════════════════════════════════════════════
    # METHOD 8: CASH FLOW PROJECTION
    # ══════════════════════════════════════════════════════════

    def cash_flow_projection(
        self, project_start: Optional[date] = None
    ) -> CashFlowReport:
        """
        Project when invoices will arrive based on graph-derived
        timeline and job budgets.

        Args:
            project_start: the project's start date for calendar mapping
        """
        if project_start is None:
            # Try to derive from the graph's earliest workgroup start
            starts = [
                _parse_date(w.start_date)
                for w in self._graph.workgroups
                if w.start_date
            ]
            project_start = min(starts) if starts else date.today()

        fwd = self._wg_dag.forward_pass()
        monthly: dict[str, Decimal] = defaultdict(Decimal)

        for wg in self._graph.workgroups:
            f = fwd.get(wg.id)
            if not f:
                continue

            # Each job's invoice arrives at workgroup earliest_finish
            finish_day = f.earliest_finish
            finish_date = project_start + timedelta(days=finish_day)
            month_key = finish_date.strftime("%Y-%m")

            wg_budget = sum(
                j.budget for j in self._graph.jobs_for_workgroup(wg.id)
            )
            if wg_budget == 0:
                wg_budget = wg.budget
            monthly[month_key] += wg_budget

        # Sort by month and build cumulative
        sorted_months = sorted(monthly.keys())
        monthly_list = []
        cumulative_list = []
        running_total = Decimal("0")

        for m in sorted_months:
            amount = monthly[m]
            running_total += amount
            monthly_list.append(MonthlyAmount(month=m, projected=amount))
            cumulative_list.append(MonthlyAmount(month=m, projected=running_total))

        peak_month = max(sorted_months, key=lambda m: monthly[m]) if sorted_months else ""
        total_remaining = sum(
            j.budget for j in self._graph.jobs if not _is_complete(j.status)
        )

        return CashFlowReport(
            monthly=monthly_list,
            cumulative=cumulative_list,
            peak_month=peak_month,
            total_remaining=total_remaining,
        )

    # ══════════════════════════════════════════════════════════
    # METHOD 9: COMPLETION FORECAST
    # ══════════════════════════════════════════════════════════

    def completion_forecast(
        self,
        actuals: Optional[dict[str, int]] = None,
    ) -> ForecastReport:
        """
        Adjust remaining estimates using actual performance data.

        Args:
            actuals: {workgroup_id: actual_duration_days} for
                     completed workgroups. If None, computes from
                     start/end dates on complete workgroups.
        """
        # Compute actuals from dates if not provided
        if actuals is None:
            actuals = {}
            for wg in self._graph.workgroups:
                if not _is_complete(wg.status):
                    continue
                start = _parse_date(wg.start_date)
                end = _parse_date(wg.end_date)
                if start and end:
                    actual_days = (end - start).days
                    if actual_days > 0:
                        actuals[wg.id] = actual_days

        if not actuals:
            return ForecastReport(
                message="Not enough completed workgroups for forecasting.",
            )

        # Compute correction factor
        ratios = []
        for wg_id, actual_days in actuals.items():
            wg = self._wg_map.get(wg_id)
            if not wg:
                continue
            estimated = self._graph.workgroup_duration(wg_id)
            if estimated <= 0:
                estimated = wg.est_duration_days
            if estimated > 0:
                ratios.append(actual_days / estimated)

        if not ratios:
            return ForecastReport(
                message="No valid actual-vs-estimated comparisons available.",
            )

        correction_factor = sum(ratios) / len(ratios)

        # Confidence based on sample size
        sample_count = len(ratios)
        if sample_count >= 6:
            confidence = ForecastConfidence.HIGH
        elif sample_count >= 3:
            confidence = ForecastConfidence.MEDIUM
        else:
            confidence = ForecastConfidence.LOW

        # Trend: compare first half vs second half of ratios
        if len(ratios) >= 4:
            mid = len(ratios) // 2
            first_half_avg = sum(ratios[:mid]) / mid
            second_half_avg = sum(ratios[mid:]) / (len(ratios) - mid)
            if second_half_avg < first_half_avg - 0.05:
                trend = ForecastTrend.IMPROVING
            elif second_half_avg > first_half_avg + 0.05:
                trend = ForecastTrend.WORSENING
            else:
                trend = ForecastTrend.STABLE
        else:
            trend = ForecastTrend.STABLE

        # Re-run forward pass with adjusted durations
        adjusted_delays: dict[str, int] = {}
        per_workgroup: list[WorkgroupForecast] = []

        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue
            est = self._graph.workgroup_duration(wg.id)
            if est <= 0:
                est = wg.est_duration_days
            adjusted = int(est * correction_factor)
            extra = adjusted - est
            if extra > 0:
                adjusted_delays[wg.id] = extra

            per_workgroup.append(WorkgroupForecast(
                id=wg.id,
                title=wg.title,
                estimated_days=est,
                adjusted_days=adjusted,
            ))

        original_duration = self._wg_dag.project_duration()
        if adjusted_delays:
            project_delay, _ = self._wg_dag.simulate_delay_impact(adjusted_delays)
            adjusted_duration = original_duration + project_delay
        else:
            adjusted_duration = original_duration

        message = (
            f"Based on {sample_count} completed workgroup(s), "
            f"work is tracking {correction_factor:.1f}x vs estimates. "
            f"{'Project on track.' if correction_factor <= 1.05 else f'Adjusted duration: {adjusted_duration} days (was {original_duration}).'}"
        )

        return ForecastReport(
            correction_factor=round(correction_factor, 2),
            confidence=confidence,
            per_workgroup=per_workgroup,
            trend=trend,
            message=message,
        )

    # ══════════════════════════════════════════════════════════
    # REACTIVE TRIGGER: JOB COMPLETION
    # ══════════════════════════════════════════════════════════

    def compute_unblocked(self, completed_job_id: str) -> UnblockedResult:
        """
        Determine what became unblocked after a job completed.

        Pure function — caller handles persisting status changes
        and dispatching notifications.
        """
        job = self._job_map.get(completed_job_id)
        if not job:
            raise ValueError(f"Job '{completed_job_id}' not found in graph.")

        # Add to complete sets
        complete_jobs = self._complete_job_ids | {completed_job_id}

        # Check newly unblocked jobs
        unblocked_jobs = []
        for j in self._graph.jobs:
            if j.id == completed_job_id or _is_complete(j.status):
                continue
            if j.id not in self._job_dag.node_ids:
                continue
            preds = self._job_dag.direct_predecessors(j.id)
            if not preds:
                continue
            if all(p in complete_jobs for p in preds):
                # Was it previously blocked?
                if not all(p in self._complete_job_ids for p in preds):
                    unblocked_jobs.append(j)

        # Check if workgroup is now complete
        wg_id = job.workgroup_id
        wg_jobs = self._graph.jobs_for_workgroup(wg_id)
        all_wg_jobs_done = all(
            _is_complete(j.status) or j.id == completed_job_id
            for j in wg_jobs
        )
        completed_workgroup = self._wg_map.get(wg_id) if all_wg_jobs_done else None

        # Check newly unblocked workgroups
        unblocked_wgs = []
        if completed_workgroup:
            complete_wgs = self._complete_wg_ids | {wg_id}
            for wg in self._graph.workgroups:
                if wg.id == wg_id or _is_complete(wg.status):
                    continue
                preds = self._wg_dag.direct_predecessors(wg.id)
                if not preds:
                    continue
                if all(p in complete_wgs for p in preds):
                    if not all(p in self._complete_wg_ids for p in preds):
                        unblocked_wgs.append(wg)

        # Check if critical path changed
        original_cp = self._wg_dag.critical_path()

        # Build notifications
        notifications = []
        for wg in unblocked_wgs:
            notifications.append(NotificationAction(
                recipient_type="contractor",
                entity_id=wg.id,
                entity_title=wg.title,
                message=(
                    f"{wg.title} can now begin. "
                    f"{completed_workgroup.title if completed_workgroup else 'Predecessor'} "
                    f"is complete."
                ),
            ))

        return UnblockedResult(
            completed_job=job,
            completed_workgroup=completed_workgroup,
            newly_unblocked_jobs=unblocked_jobs,
            newly_unblocked_workgroups=unblocked_wgs,
            critical_path_changed=False,  # would compare with recomputed
            critical_path=original_cp,
            notifications=notifications,
        )

    # ══════════════════════════════════════════════════════════
    # PERIODIC TRIGGER: DELAY IMPACT
    # ══════════════════════════════════════════════════════════

    def compute_delay_impact(self, today: Optional[date] = None) -> DelayImpactResult:
        """
        Analyze all deadline-related impacts across the project.

        Called by deadline_monitor_worker every 6 hours.
        """
        if today is None:
            today = date.today()

        schedule = self._wg_dag.compute_schedule()
        critical = self._wg_dag.critical_path()
        critical_set = set(critical)

        overdue = []
        approaching = []
        cascading = []
        alerts = []

        for wg in self._graph.workgroups:
            if _is_complete(wg.status):
                continue

            end = _parse_date(wg.end_date)
            if not end:
                continue

            days_remaining = (end - today).days
            sched = schedule.get(wg.id)
            on_critical = wg.id in critical_set

            entity = DelayedEntity(
                id=wg.id, title=wg.title, entity_type="workgroup",
                expected_end=str(end), current_status=wg.status,
                days_overdue=abs(days_remaining) if days_remaining < 0 else 0,
                days_until_deadline=days_remaining,
                is_on_critical_path=on_critical,
            )

            if days_remaining < 0:
                overdue.append(entity)
                # Compute cascading delay
                downstream = self._wg_dag.downstream(wg.id)
                affected = [
                    self._affected_entity(d, "Delayed by predecessor")
                    for d in downstream
                ]
                days_over = abs(days_remaining)
                project_impact = days_over if on_critical else 0
                cascading.append(CascadingDelay(
                    source=entity, affected=affected,
                    estimated_delay_days=days_over,
                    project_end_impact_days=project_impact,
                ))
                alerts.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup",
                    alert_type=AlertSeverity.MISSED,
                    days_remaining=days_remaining,
                    downstream_count=len(downstream),
                    message=(
                        f"{wg.title} is {days_over} days overdue. "
                        f"{len(downstream)} downstream workgroup(s) affected."
                    ),
                ))
            elif days_remaining <= 2:
                approaching.append(entity)
                downstream = self._wg_dag.downstream(wg.id)
                alerts.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup",
                    alert_type=AlertSeverity.IMMINENT,
                    days_remaining=days_remaining,
                    downstream_count=len(downstream),
                    message=f"{wg.title} deadline in {days_remaining} day(s).",
                ))
            elif days_remaining <= 7:
                approaching.append(entity)
                alerts.append(DeadlineAlert(
                    entity_id=wg.id, entity_title=wg.title,
                    entity_type="workgroup",
                    alert_type=AlertSeverity.APPROACHING,
                    days_remaining=days_remaining,
                    downstream_count=self._wg_dag.total_downstream_count(wg.id),
                    message=f"{wg.title} deadline in {days_remaining} days.",
                ))

        # Project end at risk?
        project_end_at_risk = any(
            c.project_end_impact_days > 0 for c in cascading
        )
        total_delay = max(
            (c.project_end_impact_days for c in cascading), default=0
        )

        # AI insights
        insights = []
        if overdue:
            insights.append(
                f"{len(overdue)} workgroup(s) overdue. "
                f"Most critical: {overdue[0].title}."
            )
        if cascading:
            worst = max(cascading, key=lambda c: c.project_end_impact_days)
            if worst.project_end_impact_days > 0:
                insights.append(
                    f"{worst.source.title} is {worst.source.days_overdue} days behind. "
                    f"This delays the project by an estimated "
                    f"{worst.project_end_impact_days} days."
                )

        return DelayImpactResult(
            overdue_entities=overdue,
            approaching_deadlines=approaching,
            cascading_delays=cascading,
            alerts=alerts,
            critical_path=critical,
            project_end_at_risk=project_end_at_risk,
            estimated_project_delay_days=total_delay,
            ai_insight_bullets=insights,
        )
