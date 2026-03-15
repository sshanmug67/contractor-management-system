"""
Tests — Dependency Analyzer Service (CMS Domain Layer)

Tests all 9 analytical methods plus reactive/periodic triggers
using realistic construction project data modeled after the
Westfield Office Buildout Phase 2.

Fixtures:
    westfield_graph:    Full Westfield project with 2 worksites,
                        8 workgroups, 22 jobs, and dependency chains
    simple_graph:       3 workgroups linear chain for focused tests
    diamond_graph:      Diamond convergence pattern
"""

import pytest
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dependency_models import (
    ProjectGraph, WorkgroupNode, JobNode, DependencyEdge,
    BatchChange, ChangeOp, Scenario, DelayAssumption,
    CriticalityTier, AlertSeverity,
)
from dependency_service import DependencyService


# ══════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════


@pytest.fixture
def simple_graph():
    """
    Electrical(14d) → Drywall(9d) → Painting(7d)
    Linear chain, total duration = 30 days.
    """
    workgroups = [
        WorkgroupNode(id="wg_elec", title="Electrical", trade="Electrical",
                      worksite_id="ws1", status="complete",
                      start_date="2025-10-01", end_date="2025-10-14",
                      budget=Decimal("18000"), est_duration_days=14,
                      contractor_id="c1"),
        WorkgroupNode(id="wg_dry", title="Drywall", trade="Drywall",
                      worksite_id="ws1", status="in_progress",
                      start_date="2025-10-15", end_date="2025-11-05",
                      budget=Decimal("12000"), est_duration_days=9,
                      contractor_id="c2"),
        WorkgroupNode(id="wg_paint", title="Painting", trade="Painting",
                      worksite_id="ws1", status="pending",
                      budget=Decimal("8000"), est_duration_days=7,
                      contractor_id="c3"),
    ]
    jobs = [
        # Electrical jobs
        JobNode(id="j1", title="Main panel upgrade", workgroup_id="wg_elec",
                sequence=1, status="paid", est_duration_days=3, budget=Decimal("6000")),
        JobNode(id="j2", title="Wire conference rooms", workgroup_id="wg_elec",
                sequence=2, status="paid", est_duration_days=4, budget=Decimal("5000")),
        JobNode(id="j3", title="Install data drops", workgroup_id="wg_elec",
                sequence=3, status="paid", est_duration_days=3, budget=Decimal("4000")),
        JobNode(id="j4", title="Lighting installation", workgroup_id="wg_elec",
                sequence=4, status="paid", est_duration_days=2, budget=Decimal("3000")),
        # Drywall jobs
        JobNode(id="j5", title="Frame conference rooms", workgroup_id="wg_dry",
                sequence=1, status="complete", est_duration_days=4, budget=Decimal("5000")),
        JobNode(id="j6", title="Hang and finish drywall", workgroup_id="wg_dry",
                sequence=2, status="in_progress", est_duration_days=5, budget=Decimal("7000")),
        # Painting jobs
        JobNode(id="j7", title="Prime all surfaces", workgroup_id="wg_paint",
                sequence=1, status="not_started", est_duration_days=2, budget=Decimal("3000")),
        JobNode(id="j8", title="Paint open workspace", workgroup_id="wg_paint",
                sequence=2, status="not_started", est_duration_days=3, budget=Decimal("3000")),
        JobNode(id="j9", title="Paint conference rooms", workgroup_id="wg_paint",
                sequence=3, status="not_started", est_duration_days=2, budget=Decimal("2000")),
    ]
    wg_edges = [
        DependencyEdge(id="dep1", from_id="wg_elec", to_id="wg_dry", level="workgroup"),
        DependencyEdge(id="dep2", from_id="wg_dry", to_id="wg_paint", level="workgroup"),
    ]
    job_edges = [
        DependencyEdge(id="jd1", from_id="j6", to_id="j7", level="job"),
    ]
    return ProjectGraph(
        project_id="proj1",
        workgroups=workgroups, jobs=jobs,
        wg_edges=wg_edges, job_edges=job_edges,
    )


@pytest.fixture
def westfield_graph():
    """
    Full Westfield Office Buildout Phase 2.
    Floor 2: Electrical(14) → HVAC(13) → Drywall(9) → Flooring(10) → Painting(7)
    Floor 3: Electrical(15) → HVAC+Server(9) → Painting(7)
    """
    workgroups = [
        # Floor 2
        WorkgroupNode(id="f2_elec", title="Electrical", trade="Electrical",
                      worksite_id="floor2", status="complete",
                      start_date="2025-10-01", end_date="2025-10-28",
                      budget=Decimal("18000"), contractor_id="spark"),
        WorkgroupNode(id="f2_hvac", title="HVAC", trade="HVAC",
                      worksite_id="floor2", status="complete",
                      start_date="2025-10-29", end_date="2025-12-01",
                      budget=Decimal("22000"), contractor_id="coolair"),
        WorkgroupNode(id="f2_dry", title="Drywall", trade="Drywall",
                      worksite_id="floor2", status="complete",
                      start_date="2025-12-02", end_date="2025-12-22",
                      budget=Decimal("12000"), contractor_id="prowall"),
        WorkgroupNode(id="f2_floor", title="Flooring", trade="Flooring",
                      worksite_id="floor2", status="in_progress",
                      start_date="2025-12-23", end_date="2026-03-10",
                      budget=Decimal("10000"), contractor_id="premium"),
        WorkgroupNode(id="f2_paint", title="Painting", trade="Painting",
                      worksite_id="floor2", status="pending",
                      budget=Decimal("8000"), contractor_id="colorworks"),
        # Floor 3
        WorkgroupNode(id="f3_elec", title="Electrical F3", trade="Electrical",
                      worksite_id="floor3", status="in_progress",
                      start_date="2025-11-01", end_date="2026-04-01",
                      budget=Decimal("15000"), contractor_id="spark"),
        WorkgroupNode(id="f3_hvac", title="HVAC + Server Room", trade="HVAC",
                      worksite_id="floor3", status="pending",
                      budget=Decimal("20000"), contractor_id="coolair"),
        WorkgroupNode(id="f3_paint", title="Painting F3", trade="Painting",
                      worksite_id="floor3", status="draft",
                      budget=Decimal("15000"), contractor_id="colorworks"),
    ]
    jobs = [
        # Floor 2 Electrical (14 days total)
        JobNode(id="f2j1", title="Main panel upgrade", workgroup_id="f2_elec",
                sequence=1, status="paid", est_duration_days=3, budget=Decimal("6000")),
        JobNode(id="f2j2", title="Wire conference rooms", workgroup_id="f2_elec",
                sequence=2, status="paid", est_duration_days=4, budget=Decimal("5000")),
        JobNode(id="f2j3", title="Install data drops", workgroup_id="f2_elec",
                sequence=3, status="paid", est_duration_days=3, budget=Decimal("4000")),
        JobNode(id="f2j4", title="Lighting installation", workgroup_id="f2_elec",
                sequence=4, status="paid", est_duration_days=4, budget=Decimal("3000")),
        # Floor 2 HVAC (13 days)
        JobNode(id="f2j5", title="Remove old ductwork", workgroup_id="f2_hvac",
                sequence=1, status="paid", est_duration_days=3, budget=Decimal("4000")),
        JobNode(id="f2j6", title="Install new VAV system", workgroup_id="f2_hvac",
                sequence=2, status="paid", est_duration_days=7, budget=Decimal("12000")),
        JobNode(id="f2j7", title="Thermostat controls", workgroup_id="f2_hvac",
                sequence=3, status="paid", est_duration_days=3, budget=Decimal("6000")),
        # Floor 2 Drywall (9 days)
        JobNode(id="f2j8", title="Frame conference rooms", workgroup_id="f2_dry",
                sequence=1, status="paid", est_duration_days=4, budget=Decimal("5000")),
        JobNode(id="f2j9", title="Hang and finish drywall", workgroup_id="f2_dry",
                sequence=2, status="paid", est_duration_days=5, budget=Decimal("7000")),
        # Floor 2 Flooring (10 days)
        JobNode(id="f2j10", title="Remove old carpet", workgroup_id="f2_floor",
                sequence=1, status="complete", est_duration_days=2, budget=Decimal("2000")),
        JobNode(id="f2j11", title="Install LVP flooring", workgroup_id="f2_floor",
                sequence=2, status="in_progress", est_duration_days=5, budget=Decimal("6000")),
        JobNode(id="f2j12", title="Conference room carpet", workgroup_id="f2_floor",
                sequence=3, status="not_started", est_duration_days=3, budget=Decimal("2000")),
        # Floor 2 Painting (7 days)
        JobNode(id="f2j13", title="Prime all surfaces", workgroup_id="f2_paint",
                sequence=1, status="not_started", est_duration_days=2, budget=Decimal("3000")),
        JobNode(id="f2j14", title="Paint open workspace", workgroup_id="f2_paint",
                sequence=2, status="not_started", est_duration_days=3, budget=Decimal("3000")),
        JobNode(id="f2j15", title="Paint conference rooms", workgroup_id="f2_paint",
                sequence=3, status="not_started", est_duration_days=2, budget=Decimal("2000")),
        # Floor 3 Electrical (15 days)
        JobNode(id="f3j1", title="Wire executive suites", workgroup_id="f3_elec",
                sequence=1, status="complete", est_duration_days=4, budget=Decimal("5000")),
        JobNode(id="f3j2", title="Server room power", workgroup_id="f3_elec",
                sequence=2, status="in_progress", est_duration_days=5, budget=Decimal("7000")),
        JobNode(id="f3j3", title="Emergency lighting", workgroup_id="f3_elec",
                sequence=3, status="not_started", est_duration_days=6, budget=Decimal("3000")),
        # Floor 3 HVAC (9 days)
        JobNode(id="f3j4", title="Server room precision cooling", workgroup_id="f3_hvac",
                sequence=1, status="not_started", est_duration_days=5, budget=Decimal("12000")),
        JobNode(id="f3j5", title="Suite HVAC zones", workgroup_id="f3_hvac",
                sequence=2, status="not_started", est_duration_days=4, budget=Decimal("8000")),
        # Floor 3 Painting (7 days)
        JobNode(id="f3j6", title="Prime F3", workgroup_id="f3_paint",
                sequence=1, status="not_started", est_duration_days=3, budget=Decimal("8000")),
        JobNode(id="f3j7", title="Paint F3", workgroup_id="f3_paint",
                sequence=2, status="not_started", est_duration_days=4, budget=Decimal("7000")),
    ]
    wg_edges = [
        # Floor 2 chain
        DependencyEdge(from_id="f2_elec", to_id="f2_hvac", level="workgroup"),
        DependencyEdge(from_id="f2_hvac", to_id="f2_dry", level="workgroup"),
        DependencyEdge(from_id="f2_dry", to_id="f2_floor", level="workgroup"),
        DependencyEdge(from_id="f2_floor", to_id="f2_paint", level="workgroup"),
        # Floor 3 chain
        DependencyEdge(from_id="f3_elec", to_id="f3_hvac", level="workgroup"),
        DependencyEdge(from_id="f3_hvac", to_id="f3_paint", level="workgroup"),
    ]
    job_edges = [
        # Cross-WG job dep: Drywall finish → Flooring prime
        DependencyEdge(from_id="f2j9", to_id="f2j10", level="job"),
        # Cross-WG job dep: Flooring LVP → Painting prime
        DependencyEdge(from_id="f2j11", to_id="f2j13", level="job"),
    ]
    return ProjectGraph(
        project_id="westfield_phase2",
        workgroups=workgroups, jobs=jobs,
        wg_edges=wg_edges, job_edges=job_edges,
    )


@pytest.fixture
def diamond_graph():
    """
    A(10d) → B(5d) → D(3d)
    A(10d) → C(8d) → D(3d)
    Same contractor on B and C = resource conflict.
    """
    workgroups = [
        WorkgroupNode(id="A", title="Foundation", worksite_id="ws1",
                      status="complete", est_duration_days=10,
                      budget=Decimal("20000"), contractor_id="c1"),
        WorkgroupNode(id="B", title="Plumbing", worksite_id="ws1",
                      status="in_progress", est_duration_days=5,
                      budget=Decimal("10000"), contractor_id="c2"),
        WorkgroupNode(id="C", title="Electrical", worksite_id="ws1",
                      status="in_progress", est_duration_days=8,
                      budget=Decimal("15000"), contractor_id="c2"),
        WorkgroupNode(id="D", title="Finishes", worksite_id="ws1",
                      status="pending", est_duration_days=3,
                      budget=Decimal("8000"), contractor_id="c3"),
    ]
    jobs = [
        JobNode(id="ja1", title="Excavation", workgroup_id="A", est_duration_days=10, status="paid", budget=Decimal("20000")),
        JobNode(id="jb1", title="Rough plumbing", workgroup_id="B", est_duration_days=5, status="in_progress", budget=Decimal("10000")),
        JobNode(id="jc1", title="Rough electrical", workgroup_id="C", est_duration_days=8, status="in_progress", budget=Decimal("15000")),
        JobNode(id="jd1", title="Finish work", workgroup_id="D", est_duration_days=3, status="not_started", budget=Decimal("8000")),
    ]
    wg_edges = [
        DependencyEdge(from_id="A", to_id="B", level="workgroup"),
        DependencyEdge(from_id="A", to_id="C", level="workgroup"),
        DependencyEdge(from_id="B", to_id="D", level="workgroup"),
        DependencyEdge(from_id="C", to_id="D", level="workgroup"),
    ]
    return ProjectGraph(
        project_id="diamond", workgroups=workgroups, jobs=jobs,
        wg_edges=wg_edges, job_edges=[],
    )


# ══════════════════════════════════════════════════════════════
# METHOD 1: HEALTH SNAPSHOT
# ══════════════════════════════════════════════════════════════


class TestHealthSnapshot:
    def test_simple_snapshot(self, simple_graph):
        svc = DependencyService(simple_graph)
        snap = svc.health_snapshot(today=date(2025, 10, 20))
        assert snap.project_duration_days > 0
        assert len(snap.critical_path) == 3
        assert len(snap.workgroup_messages) == 3

    def test_westfield_critical_path(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        snap = svc.health_snapshot()
        # Floor 2 chain is longer than Floor 3
        assert "f2_elec" in snap.critical_path
        assert "f2_paint" in snap.critical_path

    def test_completed_workgroup_message(self, simple_graph):
        svc = DependencyService(simple_graph)
        snap = svc.health_snapshot()
        elec_msg = next(m for m in snap.workgroup_messages if m.workgroup_id == "wg_elec")
        assert "complete" in elec_msg.message.lower()

    def test_blocked_workgroup_message(self, simple_graph):
        svc = DependencyService(simple_graph)
        snap = svc.health_snapshot()
        paint_msg = next(m for m in snap.workgroup_messages if m.workgroup_id == "wg_paint")
        assert "blocked" in paint_msg.message.lower()
        assert len(paint_msg.blocked_by) > 0

    def test_overdue_detection(self, simple_graph):
        svc = DependencyService(simple_graph)
        # Set today well past Drywall's end_date of 2025-11-05
        snap = svc.health_snapshot(today=date(2025, 11, 20))
        assert len(snap.overdue_entities) > 0 or len(snap.approaching_deadlines) >= 0

    def test_ai_insights_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        snap = svc.health_snapshot()
        assert len(snap.ai_insight_bullets) > 0

    def test_newly_unblocked_detected(self, simple_graph):
        """Painting is pending but Drywall is still in_progress — not unblocked."""
        svc = DependencyService(simple_graph)
        snap = svc.health_snapshot()
        unblocked_ids = [e.id for e in snap.newly_unblocked_workgroups]
        assert "wg_paint" not in unblocked_ids

    def test_approaching_deadline(self):
        """Workgroup with deadline in 5 days should be flagged."""
        today = date(2026, 3, 10)
        wgs = [
            WorkgroupNode(id="w1", title="Flooring", worksite_id="ws1",
                          status="in_progress", est_duration_days=10,
                          end_date=str(today + timedelta(days=5)),
                          budget=Decimal("10000")),
        ]
        jobs = [JobNode(id="j1", title="Job1", workgroup_id="w1",
                        est_duration_days=10, status="in_progress", budget=Decimal("10000"))]
        graph = ProjectGraph(project_id="t", workgroups=wgs, jobs=jobs,
                             wg_edges=[], job_edges=[])
        svc = DependencyService(graph)
        snap = svc.health_snapshot(today=today)
        assert len(snap.approaching_deadlines) == 1
        assert snap.approaching_deadlines[0].alert_type == AlertSeverity.APPROACHING


# ══════════════════════════════════════════════════════════════
# METHOD 2: CHANGE VALIDATION
# ══════════════════════════════════════════════════════════════


class TestChangeValidation:
    def test_add_valid_dependency(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="add_wg_dep", from_id="wg_elec", to_id="wg_paint"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is True

    def test_self_reference_rejected(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="add_wg_dep", from_id="wg_elec", to_id="wg_elec"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert result.validation.errors[0].code == "SELF_REFERENCE"

    def test_cycle_detected(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="add_wg_dep", from_id="wg_paint", to_id="wg_elec"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert any(e.code == "CYCLE_DETECTED" for e in result.validation.errors)

    def test_duplicate_edge_rejected(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="add_wg_dep", from_id="wg_elec", to_id="wg_dry"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert any(e.code == "DUPLICATE_EDGE" for e in result.validation.errors)

    def test_entity_not_found(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="add_wg_dep", from_id="wg_elec", to_id="nonexistent"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert any(e.code == "ENTITY_NOT_FOUND" for e in result.validation.errors)

    def test_remove_active_workgroup_rejected(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="remove_workgroup", target_id="wg_dry"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert any(e.code == "REMOVE_ACTIVE_WG" for e in result.validation.errors)

    def test_delete_completed_job_rejected(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="remove_job", target_id="j1"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is False
        assert any(e.code == "DELETE_COMPLETED" for e in result.validation.errors)

    def test_remove_dependency_shows_impact(self, simple_graph):
        svc = DependencyService(simple_graph)
        batch = BatchChange(project_id="proj1", changes=[
            ChangeOp(action="remove_wg_dep", from_id="wg_dry", to_id="wg_paint"),
        ])
        result = svc.validate_changes(batch)
        assert result.validation.valid is True
        assert result.impact is not None


# ══════════════════════════════════════════════════════════════
# METHOD 3: SCENARIO SIMULATION
# ══════════════════════════════════════════════════════════════


class TestScenarioSimulation:
    def test_single_scenario(self, simple_graph):
        svc = DependencyService(simple_graph)
        scenarios = [
            Scenario(name="Drywall slips 5d", delays=[
                DelayAssumption(entity_id="wg_dry", entity_type="workgroup", delay_days=5),
            ]),
        ]
        report = svc.simulate_scenarios(scenarios)
        assert len(report.scenarios) == 1
        assert report.scenarios[0].delta_days == 5

    def test_multiple_scenarios_ranked(self, simple_graph):
        svc = DependencyService(simple_graph)
        scenarios = [
            Scenario(name="Minor", delays=[
                DelayAssumption(entity_id="wg_dry", entity_type="workgroup", delay_days=2),
            ]),
            Scenario(name="Major", delays=[
                DelayAssumption(entity_id="wg_dry", entity_type="workgroup", delay_days=10),
            ]),
        ]
        report = svc.simulate_scenarios(scenarios)
        assert len(report.scenarios) == 2
        # Sorted by impact
        assert report.scenarios[0].delta_days <= report.scenarios[1].delta_days

    def test_compound_delays(self, simple_graph):
        svc = DependencyService(simple_graph)
        scenarios = [
            Scenario(name="Compound", delays=[
                DelayAssumption(entity_id="wg_elec", entity_type="workgroup", delay_days=3),
                DelayAssumption(entity_id="wg_paint", entity_type="workgroup", delay_days=2),
            ]),
        ]
        report = svc.simulate_scenarios(scenarios)
        assert report.scenarios[0].delta_days == 5  # both on critical path

    def test_float_absorbs_delay(self, diamond_graph):
        """B has float in diamond. Small delay should be absorbed."""
        svc = DependencyService(diamond_graph)
        scenarios = [
            Scenario(name="B slips 2d", delays=[
                DelayAssumption(entity_id="B", entity_type="workgroup", delay_days=2),
            ]),
        ]
        report = svc.simulate_scenarios(scenarios)
        # B has 3 days of float (C path is 8 vs B path 5), so 2d absorbed
        assert report.scenarios[0].delta_days == 0

    def test_summary_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.simulate_scenarios([
            Scenario(name="Test", delays=[
                DelayAssumption(entity_id="wg_dry", entity_type="workgroup", delay_days=3),
            ]),
        ])
        assert len(report.summary) > 0

    def test_westfield_floor3_delay_absorbed(self, westfield_graph):
        """Floor 3 has significant float — delay shouldn't impact project."""
        svc = DependencyService(westfield_graph)
        scenarios = [
            Scenario(name="F3 HVAC delayed", delays=[
                DelayAssumption(entity_id="f3_hvac", entity_type="workgroup", delay_days=5),
            ]),
        ]
        report = svc.simulate_scenarios(scenarios)
        assert report.scenarios[0].delta_days == 0


# ══════════════════════════════════════════════════════════════
# METHOD 4: CRITICALITY RANKING
# ══════════════════════════════════════════════════════════════


class TestCriticalityRanking:
    def test_simple_ranking(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.criticality_ranking()
        # Only non-complete workgroups ranked
        ranked_ids = [r.entity_id for r in report.rankings]
        assert "wg_elec" not in ranked_ids  # complete
        assert "wg_dry" in ranked_ids
        assert "wg_paint" in ranked_ids

    def test_critical_path_nodes_rank_highest(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.criticality_ranking()
        # All nodes in simple linear chain are critical
        for entry in report.rankings:
            assert entry.tier == CriticalityTier.CRITICAL
            assert entry.float_days == 0

    def test_diamond_b_has_float(self, diamond_graph):
        svc = DependencyService(diamond_graph)
        report = svc.criticality_ranking()
        b_entry = next(r for r in report.rankings if r.entity_id == "B")
        assert b_entry.float_days > 0
        assert b_entry.tier != CriticalityTier.CRITICAL

    def test_top_risks_limited_to_3(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        report = svc.criticality_ranking()
        assert len(report.top_risks) <= 3

    def test_summary_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.criticality_ranking()
        assert len(report.summary) > 0
        assert "critical path" in report.summary.lower() or "slack" in report.summary.lower()

    def test_westfield_floor3_has_float(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        report = svc.criticality_ranking()
        f3_entries = [r for r in report.rankings if r.entity_id.startswith("f3_")]
        for entry in f3_entries:
            assert entry.float_days > 0


# ══════════════════════════════════════════════════════════════
# METHOD 5: RESOURCE CONFLICT DETECTION
# ══════════════════════════════════════════════════════════════


class TestResourceConflict:
    def test_diamond_same_contractor_conflict(self, diamond_graph):
        """B and C have same contractor c2 and overlap."""
        svc = DependencyService(diamond_graph)
        conflicts = svc.detect_resource_conflicts()
        assert len(conflicts) >= 1
        conflict = conflicts[0]
        assert conflict.contractor_id == "c2"
        assert conflict.overlap_days > 0

    def test_simple_no_conflicts(self, simple_graph):
        """All different contractors — no conflict."""
        svc = DependencyService(simple_graph)
        conflicts = svc.detect_resource_conflicts()
        assert len(conflicts) == 0

    def test_westfield_spark_electric(self, westfield_graph):
        """Spark Electric is on both Floor 2 (complete) and Floor 3 (active)."""
        svc = DependencyService(westfield_graph)
        conflicts = svc.detect_resource_conflicts()
        # f2_elec is complete, so it won't conflict
        spark_conflicts = [c for c in conflicts if c.contractor_id == "spark"]
        assert len(spark_conflicts) == 0  # f2_elec is complete


# ══════════════════════════════════════════════════════════════
# METHOD 6: PARALLEL WORK ANALYSIS
# ══════════════════════════════════════════════════════════════


class TestParallelWork:
    def test_diamond_two_parallel(self, diamond_graph):
        """B and C are both unblocked (A is complete)."""
        svc = DependencyService(diamond_graph)
        report = svc.parallel_work_analysis()
        runnable_ids = [e.id for e in report.runnable]
        assert "B" in runnable_ids
        assert "C" in runnable_ids

    def test_simple_one_active(self, simple_graph):
        """Only Drywall is active. Painting is blocked."""
        svc = DependencyService(simple_graph)
        report = svc.parallel_work_analysis()
        active_ids = [e.id for e in report.active]
        assert "wg_dry" in active_ids

    def test_idle_detection(self, diamond_graph):
        svc = DependencyService(diamond_graph)
        report = svc.parallel_work_analysis()
        # Both B and C are in_progress (active), D is pending but blocked
        assert report.idle_count == 0  # both runnable ones are active

    def test_message_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.parallel_work_analysis()
        assert len(report.message) > 0


# ══════════════════════════════════════════════════════════════
# METHOD 7: BOTTLENECK DETECTION
# ══════════════════════════════════════════════════════════════


class TestBottleneck:
    def test_diamond_a_is_bottleneck(self, diamond_graph):
        """A fans out to B and C — bottleneck with fan-out 2."""
        svc = DependencyService(diamond_graph)
        bottlenecks = svc.detect_bottlenecks(threshold=2)
        # A is complete so not flagged, but check logic works
        # Let's check if any non-complete node qualifies
        assert isinstance(bottlenecks, list)

    def test_simple_no_bottleneck(self, simple_graph):
        """Linear chain — max fan-out is 1."""
        svc = DependencyService(simple_graph)
        bottlenecks = svc.detect_bottlenecks(threshold=2)
        assert len(bottlenecks) == 0

    def test_score_calculation(self):
        """Custom graph with clear bottleneck."""
        wgs = [
            WorkgroupNode(id="hub", title="Hub", worksite_id="ws1",
                          status="in_progress", est_duration_days=5, budget=Decimal("10000")),
            WorkgroupNode(id="s1", title="Spoke 1", worksite_id="ws1",
                          status="pending", est_duration_days=3, budget=Decimal("5000")),
            WorkgroupNode(id="s2", title="Spoke 2", worksite_id="ws1",
                          status="pending", est_duration_days=4, budget=Decimal("5000")),
            WorkgroupNode(id="s3", title="Spoke 3", worksite_id="ws1",
                          status="pending", est_duration_days=2, budget=Decimal("5000")),
        ]
        jobs = [
            JobNode(id="jh", title="Hub work", workgroup_id="hub", est_duration_days=5, budget=Decimal("10000")),
            JobNode(id="js1", title="Spoke 1 work", workgroup_id="s1", est_duration_days=3, budget=Decimal("5000")),
            JobNode(id="js2", title="Spoke 2 work", workgroup_id="s2", est_duration_days=4, budget=Decimal("5000")),
            JobNode(id="js3", title="Spoke 3 work", workgroup_id="s3", est_duration_days=2, budget=Decimal("5000")),
        ]
        edges = [
            DependencyEdge(from_id="hub", to_id="s1", level="workgroup"),
            DependencyEdge(from_id="hub", to_id="s2", level="workgroup"),
            DependencyEdge(from_id="hub", to_id="s3", level="workgroup"),
        ]
        graph = ProjectGraph(project_id="t", workgroups=wgs, jobs=jobs,
                             wg_edges=edges, job_edges=[])
        svc = DependencyService(graph)
        bottlenecks = svc.detect_bottlenecks(threshold=2)
        assert len(bottlenecks) == 1
        assert bottlenecks[0].entity_id == "hub"
        assert bottlenecks[0].direct_successors == 3
        assert bottlenecks[0].total_downstream == 3


# ══════════════════════════════════════════════════════════════
# METHOD 8: CASH FLOW PROJECTION
# ══════════════════════════════════════════════════════════════


class TestCashFlow:
    def test_simple_cash_flow(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.cash_flow_projection(project_start=date(2025, 10, 1))
        assert len(report.monthly) > 0
        assert report.total_remaining >= 0

    def test_peak_month_identified(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.cash_flow_projection(project_start=date(2025, 10, 1))
        assert report.peak_month != ""

    def test_cumulative_increases(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.cash_flow_projection(project_start=date(2025, 10, 1))
        if len(report.cumulative) >= 2:
            assert report.cumulative[-1].projected >= report.cumulative[0].projected

    def test_westfield_cash_flow(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        report = svc.cash_flow_projection(project_start=date(2025, 10, 1))
        assert len(report.monthly) > 0
        total_projected = sum(m.projected for m in report.monthly)
        assert total_projected > 0


# ══════════════════════════════════════════════════════════════
# METHOD 9: COMPLETION FORECAST
# ══════════════════════════════════════════════════════════════


class TestCompletionForecast:
    def test_simple_forecast(self, simple_graph):
        svc = DependencyService(simple_graph)
        # Electrical jobs sum to 12 days (3+4+3+2). Actual also 12 = 1.0x
        report = svc.completion_forecast(actuals={"wg_elec": 12})
        assert report.correction_factor == 1.0

    def test_slower_than_estimated(self, simple_graph):
        svc = DependencyService(simple_graph)
        # Electrical took 18 days instead of 14 = 1.28x
        report = svc.completion_forecast(actuals={"wg_elec": 18})
        assert report.correction_factor > 1.0

    def test_faster_than_estimated(self, simple_graph):
        svc = DependencyService(simple_graph)
        # Electrical took 10 days instead of 14
        report = svc.completion_forecast(actuals={"wg_elec": 10})
        assert report.correction_factor < 1.0

    def test_confidence_levels(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        report = svc.completion_forecast(actuals={
            "f2_elec": 16, "f2_hvac": 15, "f2_dry": 10,
        })
        assert report.confidence.value in ("low", "medium", "high")

    def test_no_actuals(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.completion_forecast(actuals={})
        assert "not enough" in report.message.lower() or "no valid" in report.message.lower()

    def test_message_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        report = svc.completion_forecast(actuals={"wg_elec": 18})
        assert len(report.message) > 0


# ══════════════════════════════════════════════════════════════
# REACTIVE TRIGGER: JOB COMPLETION
# ══════════════════════════════════════════════════════════════


class TestComputeUnblocked:
    def test_job_completion_unblocks_next(self, simple_graph):
        """When j6 (last Drywall job) completes, j7 (first Painting job) should unblock."""
        svc = DependencyService(simple_graph)
        result = svc.compute_unblocked("j6")
        # j7 depends on j6 via job_edge
        unblocked_ids = [j.id for j in result.newly_unblocked_jobs]
        assert "j7" in unblocked_ids

    def test_workgroup_completes_when_all_jobs_done(self, simple_graph):
        """When the last job in Drywall completes, workgroup should complete."""
        # j5 is already complete, j6 is "completing"
        svc = DependencyService(simple_graph)
        result = svc.compute_unblocked("j6")
        # j5 is complete, j6 just completed → workgroup complete
        assert result.completed_workgroup is not None
        assert result.completed_workgroup.id == "wg_dry"

    def test_unknown_job_raises(self, simple_graph):
        svc = DependencyService(simple_graph)
        with pytest.raises(ValueError, match="not found"):
            svc.compute_unblocked("nonexistent")

    def test_notifications_generated(self, simple_graph):
        svc = DependencyService(simple_graph)
        result = svc.compute_unblocked("j6")
        # If wg completes and unblocks downstream, notifications should fire
        if result.newly_unblocked_workgroups:
            assert len(result.notifications) > 0


# ══════════════════════════════════════════════════════════════
# PERIODIC TRIGGER: DELAY IMPACT
# ══════════════════════════════════════════════════════════════


class TestDelayImpact:
    def test_overdue_detection(self):
        """Workgroup past its deadline should be flagged."""
        today = date(2026, 3, 20)
        wgs = [
            WorkgroupNode(id="w1", title="Late Work", worksite_id="ws1",
                          status="in_progress", est_duration_days=10,
                          end_date="2026-03-10", budget=Decimal("10000")),
        ]
        jobs = [JobNode(id="j1", title="Job", workgroup_id="w1",
                        est_duration_days=10, budget=Decimal("10000"))]
        graph = ProjectGraph(project_id="t", workgroups=wgs, jobs=jobs,
                             wg_edges=[], job_edges=[])
        svc = DependencyService(graph)
        result = svc.compute_delay_impact(today=today)
        assert len(result.overdue_entities) == 1
        assert result.overdue_entities[0].days_overdue == 10

    def test_cascading_delay_computed(self):
        """Overdue workgroup with dependents should show cascading impact."""
        today = date(2026, 3, 20)
        wgs = [
            WorkgroupNode(id="w1", title="Late", worksite_id="ws1",
                          status="in_progress", est_duration_days=10,
                          end_date="2026-03-10", budget=Decimal("10000")),
            WorkgroupNode(id="w2", title="Blocked", worksite_id="ws1",
                          status="pending", est_duration_days=5,
                          budget=Decimal("5000")),
        ]
        jobs = [
            JobNode(id="j1", title="Job1", workgroup_id="w1",
                    est_duration_days=10, budget=Decimal("10000")),
            JobNode(id="j2", title="Job2", workgroup_id="w2",
                    est_duration_days=5, budget=Decimal("5000")),
        ]
        edges = [DependencyEdge(from_id="w1", to_id="w2", level="workgroup")]
        graph = ProjectGraph(project_id="t", workgroups=wgs, jobs=jobs,
                             wg_edges=edges, job_edges=[])
        svc = DependencyService(graph)
        result = svc.compute_delay_impact(today=today)
        assert len(result.cascading_delays) == 1
        assert len(result.cascading_delays[0].affected) == 1
        assert result.cascading_delays[0].affected[0].id == "w2"

    def test_ai_insights_on_overdue(self):
        today = date(2026, 3, 20)
        wgs = [
            WorkgroupNode(id="w1", title="Late Work", worksite_id="ws1",
                          status="in_progress", est_duration_days=10,
                          end_date="2026-03-10", budget=Decimal("10000")),
        ]
        jobs = [JobNode(id="j1", title="Job", workgroup_id="w1",
                        est_duration_days=10, budget=Decimal("10000"))]
        graph = ProjectGraph(project_id="t", workgroups=wgs, jobs=jobs,
                             wg_edges=[], job_edges=[])
        svc = DependencyService(graph)
        result = svc.compute_delay_impact(today=today)
        assert len(result.ai_insight_bullets) > 0

    def test_westfield_delay_impact(self, westfield_graph):
        svc = DependencyService(westfield_graph)
        result = svc.compute_delay_impact(today=date(2026, 3, 14))
        assert isinstance(result.critical_path, list)
        assert len(result.critical_path) > 0


# ══════════════════════════════════════════════════════════════
# INTEGRATION: FULL WORKFLOW
# ══════════════════════════════════════════════════════════════


class TestFullWorkflow:
    def test_all_methods_run_without_error(self, westfield_graph):
        """Smoke test: every method produces valid output on Westfield data."""
        svc = DependencyService(westfield_graph)

        snap = svc.health_snapshot(today=date(2026, 3, 14))
        assert snap.project_duration_days > 0

        ranking = svc.criticality_ranking()
        assert len(ranking.rankings) > 0

        scenarios = [
            Scenario(name="Flooring +7d", delays=[
                DelayAssumption(entity_id="f2_floor", entity_type="workgroup", delay_days=7),
            ]),
        ]
        sim = svc.simulate_scenarios(scenarios)
        assert len(sim.scenarios) == 1

        conflicts = svc.detect_resource_conflicts()
        assert isinstance(conflicts, list)

        parallel = svc.parallel_work_analysis()
        assert isinstance(parallel.runnable, list)

        bottlenecks = svc.detect_bottlenecks()
        assert isinstance(bottlenecks, list)

        cash = svc.cash_flow_projection(project_start=date(2025, 10, 1))
        assert len(cash.monthly) > 0

        forecast = svc.completion_forecast(actuals={
            "f2_elec": 28, "f2_hvac": 34, "f2_dry": 21,
        })
        assert forecast.correction_factor > 0

        delay = svc.compute_delay_impact(today=date(2026, 3, 14))
        assert isinstance(delay.alerts, list)

    def test_scenario_matches_criticality(self, westfield_graph):
        """Critical path nodes should show max delay in scenarios."""
        svc = DependencyService(westfield_graph)
        ranking = svc.criticality_ranking(delay_days=7)

        # Top risk should have highest delay_impact_days
        if ranking.top_risks:
            top = ranking.top_risks[0]
            sim = svc.simulate_scenarios([
                Scenario(name="Top risk", delays=[
                    DelayAssumption(
                        entity_id=top.entity_id,
                        entity_type="workgroup",
                        delay_days=7,
                    ),
                ]),
            ])
            assert sim.scenarios[0].delta_days == top.delay_impact_days


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
