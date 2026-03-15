"""
Tests — DAG Engine

Exhaustive unit tests for the general-purpose DAGAnalyzer.
Uses abstract graph shapes inspired by real construction scenarios
but with no CMS domain imports.

Graph fixtures:
    linear_chain:     A(5) → B(3) → C(7) → D(2)
    diamond:          A(5) → B(3), A(5) → C(7), B(3) → D(2), C(7) → D(2)
    parallel:         A(5) → B(3) → D(2),  A(5) → C(10) → D(2)
    complex_site:     Mirrors Westfield Floor 2:
                      Elec(14) → HVAC(13) → Drywall(9) → Flooring(10) → Painting(7)
    multi_root:       Two independent chains sharing a terminal
    single_node:      Just one node, no edges
    disconnected:     Two independent chains with no connection
"""

import pytest
import sys
import os

# Add parent to path so we can import dag_engine directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dag_engine import DAGAnalyzer, DAGNode, DAGEdge, ForwardResult


# ══════════════════════════════════════════════════════════════
# FIXTURES
# ══════════════════════════════════════════════════════════════


@pytest.fixture
def linear_chain():
    """A(5) → B(3) → C(7) → D(2) — total duration 17"""
    nodes = [
        DAGNode(id="A", duration=5),
        DAGNode(id="B", duration=3),
        DAGNode(id="C", duration=7),
        DAGNode(id="D", duration=2),
    ]
    edges = [
        DAGEdge(from_id="A", to_id="B"),
        DAGEdge(from_id="B", to_id="C"),
        DAGEdge(from_id="C", to_id="D"),
    ]
    return DAGAnalyzer(nodes, edges)


@pytest.fixture
def diamond():
    """
    A(5) → B(3) → D(2)
    A(5) → C(7) → D(2)
    Critical path: A → C → D (duration 14)
    B has float: 14 - (5+3+2) = 4
    """
    nodes = [
        DAGNode(id="A", duration=5),
        DAGNode(id="B", duration=3),
        DAGNode(id="C", duration=7),
        DAGNode(id="D", duration=2),
    ]
    edges = [
        DAGEdge(from_id="A", to_id="B"),
        DAGEdge(from_id="A", to_id="C"),
        DAGEdge(from_id="B", to_id="D"),
        DAGEdge(from_id="C", to_id="D"),
    ]
    return DAGAnalyzer(nodes, edges)


@pytest.fixture
def parallel():
    """
    A(5) → B(3) → D(2)
    A(5) → C(10) → D(2)
    Critical path: A → C → D (duration 17)
    B path: 5+3+2 = 10, float = 7
    """
    nodes = [
        DAGNode(id="A", duration=5),
        DAGNode(id="B", duration=3),
        DAGNode(id="C", duration=10),
        DAGNode(id="D", duration=2),
    ]
    edges = [
        DAGEdge(from_id="A", to_id="B"),
        DAGEdge(from_id="A", to_id="C"),
        DAGEdge(from_id="B", to_id="D"),
        DAGEdge(from_id="C", to_id="D"),
    ]
    return DAGAnalyzer(nodes, edges)


@pytest.fixture
def westfield_floor2():
    """
    Mirrors the Westfield Office Floor 2 dependency chain:
    Electrical(14) → HVAC(13) → Drywall(9) → Flooring(10) → Painting(7)
    Linear chain, total duration = 53 days
    All nodes on critical path (zero float).
    """
    nodes = [
        DAGNode(id="elec", duration=14),
        DAGNode(id="hvac", duration=13),
        DAGNode(id="drywall", duration=9),
        DAGNode(id="flooring", duration=10),
        DAGNode(id="painting", duration=7),
    ]
    edges = [
        DAGEdge(from_id="elec", to_id="hvac"),
        DAGEdge(from_id="hvac", to_id="drywall"),
        DAGEdge(from_id="drywall", to_id="flooring"),
        DAGEdge(from_id="flooring", to_id="painting"),
    ]
    return DAGAnalyzer(nodes, edges)


@pytest.fixture
def westfield_full():
    """
    Both floors of Westfield with independent chains:
    Floor 2: Elec(14) → HVAC(13) → Drywall(9) → Flooring(10) → Painting(7)
    Floor 3: Elec3(15) → HVAC3(9) → Painting3(7)
    No cross-floor dependencies.
    Floor 2 duration: 53, Floor 3 duration: 31
    Critical path is Floor 2.
    """
    nodes = [
        # Floor 2
        DAGNode(id="f2_elec", duration=14),
        DAGNode(id="f2_hvac", duration=13),
        DAGNode(id="f2_drywall", duration=9),
        DAGNode(id="f2_flooring", duration=10),
        DAGNode(id="f2_painting", duration=7),
        # Floor 3
        DAGNode(id="f3_elec", duration=15),
        DAGNode(id="f3_hvac", duration=9),
        DAGNode(id="f3_painting", duration=7),
    ]
    edges = [
        # Floor 2 chain
        DAGEdge(from_id="f2_elec", to_id="f2_hvac"),
        DAGEdge(from_id="f2_hvac", to_id="f2_drywall"),
        DAGEdge(from_id="f2_drywall", to_id="f2_flooring"),
        DAGEdge(from_id="f2_flooring", to_id="f2_painting"),
        # Floor 3 chain
        DAGEdge(from_id="f3_elec", to_id="f3_hvac"),
        DAGEdge(from_id="f3_hvac", to_id="f3_painting"),
    ]
    return DAGAnalyzer(nodes, edges)


@pytest.fixture
def single_node():
    """Just one node, no edges."""
    return DAGAnalyzer([DAGNode(id="X", duration=5)], [])


@pytest.fixture
def no_edges():
    """Three independent nodes, no dependencies."""
    nodes = [
        DAGNode(id="A", duration=5),
        DAGNode(id="B", duration=3),
        DAGNode(id="C", duration=7),
    ]
    return DAGAnalyzer(nodes, [])


@pytest.fixture
def with_completions():
    """
    A(5,done) → B(3,done) → C(7) → D(2)
    A and B are complete.
    """
    nodes = [
        DAGNode(id="A", duration=5, is_complete=True),
        DAGNode(id="B", duration=3, is_complete=True),
        DAGNode(id="C", duration=7, is_complete=False),
        DAGNode(id="D", duration=2, is_complete=False),
    ]
    edges = [
        DAGEdge(from_id="A", to_id="B"),
        DAGEdge(from_id="B", to_id="C"),
        DAGEdge(from_id="C", to_id="D"),
    ]
    return DAGAnalyzer(nodes, edges)


# ══════════════════════════════════════════════════════════════
# CONSTRUCTION & VALIDATION
# ══════════════════════════════════════════════════════════════


class TestConstruction:
    def test_basic_construction(self, linear_chain):
        assert linear_chain.node_count == 4
        assert linear_chain.edge_count == 3

    def test_unknown_from_id_raises(self):
        nodes = [DAGNode(id="A")]
        edges = [DAGEdge(from_id="Z", to_id="A")]
        with pytest.raises(ValueError, match="unknown from_id"):
            DAGAnalyzer(nodes, edges)

    def test_unknown_to_id_raises(self):
        nodes = [DAGNode(id="A")]
        edges = [DAGEdge(from_id="A", to_id="Z")]
        with pytest.raises(ValueError, match="unknown to_id"):
            DAGAnalyzer(nodes, edges)

    def test_empty_graph(self):
        dag = DAGAnalyzer([], [])
        assert dag.node_count == 0
        assert dag.edge_count == 0

    def test_single_node(self, single_node):
        assert single_node.node_count == 1
        assert single_node.edge_count == 0

    def test_repr(self, linear_chain):
        r = repr(linear_chain)
        assert "nodes=4" in r
        assert "edges=3" in r


# ══════════════════════════════════════════════════════════════
# ROOTS AND TERMINALS
# ══════════════════════════════════════════════════════════════


class TestRootsAndTerminals:
    def test_linear_roots(self, linear_chain):
        assert linear_chain.get_roots() == ["A"]

    def test_linear_terminals(self, linear_chain):
        assert linear_chain.get_terminals() == ["D"]

    def test_diamond_roots(self, diamond):
        assert diamond.get_roots() == ["A"]

    def test_diamond_terminals(self, diamond):
        assert diamond.get_terminals() == ["D"]

    def test_westfield_full_roots(self, westfield_full):
        roots = westfield_full.get_roots()
        assert "f2_elec" in roots
        assert "f3_elec" in roots
        assert len(roots) == 2

    def test_westfield_full_terminals(self, westfield_full):
        terminals = westfield_full.get_terminals()
        assert "f2_painting" in terminals
        assert "f3_painting" in terminals
        assert len(terminals) == 2

    def test_no_edges_all_roots(self, no_edges):
        assert len(no_edges.get_roots()) == 3

    def test_no_edges_all_terminals(self, no_edges):
        assert len(no_edges.get_terminals()) == 3

    def test_single_node_is_both(self, single_node):
        assert single_node.get_roots() == ["X"]
        assert single_node.get_terminals() == ["X"]


# ══════════════════════════════════════════════════════════════
# TOPOLOGICAL SORT
# ══════════════════════════════════════════════════════════════


class TestTopologicalSort:
    def test_linear_order(self, linear_chain):
        topo = linear_chain.topological_sort()
        assert topo == ["A", "B", "C", "D"]

    def test_diamond_order(self, diamond):
        topo = diamond.topological_sort()
        assert topo[0] == "A"     # root first
        assert topo[-1] == "D"    # terminal last
        # B and C can be in either order but both before D
        assert topo.index("B") < topo.index("D")
        assert topo.index("C") < topo.index("D")

    def test_westfield_floor2_order(self, westfield_floor2):
        topo = westfield_floor2.topological_sort()
        assert topo == ["elec", "hvac", "drywall", "flooring", "painting"]

    def test_single_node(self, single_node):
        assert single_node.topological_sort() == ["X"]

    def test_no_edges_alphabetical(self, no_edges):
        topo = no_edges.topological_sort()
        assert topo == ["A", "B", "C"]

    def test_deterministic_output(self, diamond):
        """Multiple calls produce same result."""
        t1 = diamond.topological_sort()
        t2 = diamond.topological_sort()
        assert t1 == t2


# ══════════════════════════════════════════════════════════════
# CYCLE DETECTION
# ══════════════════════════════════════════════════════════════


class TestCycleDetection:
    def test_self_reference(self, linear_chain):
        cycle = linear_chain.detect_cycle("A", "A")
        assert cycle is not None
        assert cycle == ["A", "A"]

    def test_direct_back_edge(self, linear_chain):
        # Adding D → A would create A → B → C → D → A
        cycle = linear_chain.detect_cycle("D", "A")
        assert cycle is not None
        assert cycle[0] == "D"
        assert cycle[-1] == "D"

    def test_indirect_back_edge(self, linear_chain):
        # Adding C → A would create A → B → C → A
        cycle = linear_chain.detect_cycle("C", "A")
        assert cycle is not None

    def test_safe_edge_no_cycle(self, diamond):
        # Adding A → D doesn't create a cycle (already reachable)
        # but the edge direction matters: A → D is safe
        cycle = diamond.detect_cycle("A", "D")
        assert cycle is None

    def test_safe_forward_edge(self, linear_chain):
        # Adding A → D (skip edge) is safe
        cycle = linear_chain.detect_cycle("A", "D")
        assert cycle is None

    def test_has_cycle_on_valid_graph(self, linear_chain):
        assert linear_chain.has_cycle() is False

    def test_has_cycle_on_diamond(self, diamond):
        assert diamond.has_cycle() is False


# ══════════════════════════════════════════════════════════════
# FORWARD PASS
# ══════════════════════════════════════════════════════════════


class TestForwardPass:
    def test_linear_chain(self, linear_chain):
        fwd = linear_chain.forward_pass()
        assert fwd["A"].earliest_start == 0
        assert fwd["A"].earliest_finish == 5
        assert fwd["B"].earliest_start == 5
        assert fwd["B"].earliest_finish == 8
        assert fwd["C"].earliest_start == 8
        assert fwd["C"].earliest_finish == 15
        assert fwd["D"].earliest_start == 15
        assert fwd["D"].earliest_finish == 17

    def test_diamond_convergence(self, diamond):
        fwd = diamond.forward_pass()
        # D must wait for the longer path: A(5) + C(7) = 12
        assert fwd["D"].earliest_start == 12
        assert fwd["D"].earliest_finish == 14

    def test_parallel_longest_wins(self, parallel):
        fwd = parallel.forward_pass()
        # D waits for A(5) + C(10) = 15 (not A(5) + B(3) = 8)
        assert fwd["D"].earliest_start == 15
        assert fwd["D"].earliest_finish == 17

    def test_westfield_floor2(self, westfield_floor2):
        fwd = westfield_floor2.forward_pass()
        assert fwd["elec"].earliest_start == 0
        assert fwd["elec"].earliest_finish == 14
        assert fwd["hvac"].earliest_start == 14
        assert fwd["painting"].earliest_start == 46
        assert fwd["painting"].earliest_finish == 53

    def test_single_node(self, single_node):
        fwd = single_node.forward_pass()
        assert fwd["X"].earliest_start == 0
        assert fwd["X"].earliest_finish == 5

    def test_no_edges_all_start_at_zero(self, no_edges):
        fwd = no_edges.forward_pass()
        for node_id in ["A", "B", "C"]:
            assert fwd[node_id].earliest_start == 0


# ══════════════════════════════════════════════════════════════
# BACKWARD PASS
# ══════════════════════════════════════════════════════════════


class TestBackwardPass:
    def test_linear_chain_no_float(self, linear_chain):
        bwd = linear_chain.backward_pass()
        # In a linear chain, LS == ES for all nodes (zero float)
        assert bwd["A"].latest_start == 0
        assert bwd["B"].latest_start == 5
        assert bwd["C"].latest_start == 8
        assert bwd["D"].latest_start == 15

    def test_diamond_non_critical_has_float(self, diamond):
        bwd = diamond.backward_pass()
        fwd = diamond.forward_pass()
        # B is not on critical path: LS > ES
        b_float = bwd["B"].latest_start - fwd["B"].earliest_start
        assert b_float > 0
        # A, C, D are on critical path: LS == ES
        assert bwd["A"].latest_start == fwd["A"].earliest_start
        assert bwd["C"].latest_start == fwd["C"].earliest_start
        assert bwd["D"].latest_start == fwd["D"].earliest_start

    def test_terminal_latest_finish_equals_project_end(self, linear_chain):
        bwd = linear_chain.backward_pass()
        assert bwd["D"].latest_finish == 17


# ══════════════════════════════════════════════════════════════
# FULL SCHEDULE
# ══════════════════════════════════════════════════════════════


class TestSchedule:
    def test_linear_all_critical(self, linear_chain):
        sched = linear_chain.compute_schedule()
        for node_id in ["A", "B", "C", "D"]:
            assert sched[node_id].is_critical is True
            assert sched[node_id].total_float == 0

    def test_diamond_float_values(self, diamond):
        sched = diamond.compute_schedule()
        assert sched["A"].total_float == 0
        assert sched["B"].total_float == 4   # 14 - (5+3+2) = 4
        assert sched["C"].total_float == 0
        assert sched["D"].total_float == 0

    def test_parallel_float_values(self, parallel):
        sched = parallel.compute_schedule()
        assert sched["A"].total_float == 0
        assert sched["B"].total_float == 7   # 17 - (5+3+2) = 7
        assert sched["C"].total_float == 0
        assert sched["D"].total_float == 0

    def test_westfield_all_critical(self, westfield_floor2):
        sched = westfield_floor2.compute_schedule()
        for nid in ["elec", "hvac", "drywall", "flooring", "painting"]:
            assert sched[nid].is_critical is True

    def test_westfield_full_floor3_has_float(self, westfield_full):
        sched = westfield_full.compute_schedule()
        # Floor 2 duration: 53, Floor 3 duration: 31
        # Floor 3 has float = 53 - 31 = 22
        assert sched["f3_elec"].total_float == 22
        assert sched["f3_hvac"].total_float == 22
        assert sched["f3_painting"].total_float == 22
        # Floor 2 is all critical
        assert sched["f2_elec"].is_critical is True
        assert sched["f2_painting"].is_critical is True

    def test_no_edges_all_critical(self, no_edges):
        """With no edges, all nodes are independent — each is its own critical path."""
        sched = no_edges.compute_schedule()
        # Project duration = max(5, 3, 7) = 7
        # A(5): ES=0, EF=5, LF=7, LS=2, float=2
        # B(3): ES=0, EF=3, LF=7, LS=4, float=4
        # C(7): ES=0, EF=7, LF=7, LS=0, float=0 ← critical
        assert sched["C"].is_critical is True
        assert sched["A"].total_float == 2
        assert sched["B"].total_float == 4


# ══════════════════════════════════════════════════════════════
# CRITICAL PATH
# ══════════════════════════════════════════════════════════════


class TestCriticalPath:
    def test_linear_chain(self, linear_chain):
        assert linear_chain.critical_path() == ["A", "B", "C", "D"]

    def test_diamond(self, diamond):
        # Critical: A → C → D (not through B)
        assert diamond.critical_path() == ["A", "C", "D"]

    def test_parallel(self, parallel):
        assert parallel.critical_path() == ["A", "C", "D"]

    def test_westfield_floor2(self, westfield_floor2):
        assert westfield_floor2.critical_path() == [
            "elec", "hvac", "drywall", "flooring", "painting"
        ]

    def test_westfield_full_critical_is_floor2(self, westfield_full):
        cp = westfield_full.critical_path()
        assert cp == ["f2_elec", "f2_hvac", "f2_drywall",
                       "f2_flooring", "f2_painting"]

    def test_single_node(self, single_node):
        assert single_node.critical_path() == ["X"]


# ══════════════════════════════════════════════════════════════
# FLOAT MAP
# ══════════════════════════════════════════════════════════════


class TestFloatMap:
    def test_linear_all_zero(self, linear_chain):
        floats = linear_chain.float_map()
        assert all(v == 0 for v in floats.values())

    def test_diamond_b_has_float(self, diamond):
        floats = diamond.float_map()
        assert floats["B"] == 4
        assert floats["A"] == 0
        assert floats["C"] == 0
        assert floats["D"] == 0

    def test_parallel_b_has_float(self, parallel):
        floats = parallel.float_map()
        assert floats["B"] == 7


# ══════════════════════════════════════════════════════════════
# PROJECT DURATION
# ══════════════════════════════════════════════════════════════


class TestProjectDuration:
    def test_linear_chain(self, linear_chain):
        assert linear_chain.project_duration() == 17

    def test_diamond(self, diamond):
        assert diamond.project_duration() == 14

    def test_parallel(self, parallel):
        assert parallel.project_duration() == 17

    def test_westfield_floor2(self, westfield_floor2):
        assert westfield_floor2.project_duration() == 53

    def test_westfield_full(self, westfield_full):
        assert westfield_full.project_duration() == 53

    def test_single_node(self, single_node):
        assert single_node.project_duration() == 5

    def test_no_edges(self, no_edges):
        # Independent nodes: project duration = longest single node
        assert no_edges.project_duration() == 7

    def test_empty_graph(self):
        dag = DAGAnalyzer([], [])
        assert dag.project_duration() == 0


# ══════════════════════════════════════════════════════════════
# DOWNSTREAM / UPSTREAM
# ══════════════════════════════════════════════════════════════


class TestReachability:
    def test_downstream_root(self, linear_chain):
        assert linear_chain.downstream("A") == {"B", "C", "D"}

    def test_downstream_middle(self, linear_chain):
        assert linear_chain.downstream("B") == {"C", "D"}

    def test_downstream_terminal(self, linear_chain):
        assert linear_chain.downstream("D") == set()

    def test_upstream_terminal(self, linear_chain):
        assert linear_chain.upstream("D") == {"A", "B", "C"}

    def test_upstream_root(self, linear_chain):
        assert linear_chain.upstream("A") == set()

    def test_downstream_diamond(self, diamond):
        assert diamond.downstream("A") == {"B", "C", "D"}
        assert diamond.downstream("B") == {"D"}
        assert diamond.downstream("C") == {"D"}

    def test_upstream_diamond(self, diamond):
        assert diamond.upstream("D") == {"A", "B", "C"}

    def test_unknown_node_raises(self, linear_chain):
        with pytest.raises(ValueError, match="Unknown node"):
            linear_chain.downstream("Z")
        with pytest.raises(ValueError, match="Unknown node"):
            linear_chain.upstream("Z")

    def test_westfield_full_no_cross_floor(self, westfield_full):
        # Floor 2 nodes should not reach Floor 3 nodes
        f2_down = westfield_full.downstream("f2_elec")
        assert "f3_elec" not in f2_down
        assert "f3_hvac" not in f2_down


# ══════════════════════════════════════════════════════════════
# PREDECESSORS SATISFIED
# ══════════════════════════════════════════════════════════════


class TestPredecessorsSatisfied:
    def test_root_always_satisfied(self, linear_chain):
        assert linear_chain.predecessors_satisfied("A", set()) is True

    def test_not_satisfied_when_pred_incomplete(self, linear_chain):
        assert linear_chain.predecessors_satisfied("B", set()) is False

    def test_satisfied_when_pred_complete(self, linear_chain):
        assert linear_chain.predecessors_satisfied("B", {"A"}) is True

    def test_diamond_needs_both_preds(self, diamond):
        # D needs both B and C
        assert diamond.predecessors_satisfied("D", {"B"}) is False
        assert diamond.predecessors_satisfied("D", {"C"}) is False
        assert diamond.predecessors_satisfied("D", {"B", "C"}) is True

    def test_with_completions_fixture(self, with_completions):
        done = {"A", "B"}
        assert with_completions.predecessors_satisfied("C", done) is True
        assert with_completions.predecessors_satisfied("D", done) is False

    def test_unknown_node_raises(self, linear_chain):
        with pytest.raises(ValueError):
            linear_chain.predecessors_satisfied("Z", set())


# ══════════════════════════════════════════════════════════════
# DIRECT SUCCESSORS / PREDECESSORS
# ══════════════════════════════════════════════════════════════


class TestDirectRelations:
    def test_successors(self, diamond):
        assert set(diamond.direct_successors("A")) == {"B", "C"}
        assert diamond.direct_successors("D") == []

    def test_predecessors(self, diamond):
        assert set(diamond.direct_predecessors("D")) == {"B", "C"}
        assert diamond.direct_predecessors("A") == []

    def test_unknown_raises(self, diamond):
        with pytest.raises(ValueError):
            diamond.direct_successors("Z")
        with pytest.raises(ValueError):
            diamond.direct_predecessors("Z")


# ══════════════════════════════════════════════════════════════
# SIMULATE DELAY
# ══════════════════════════════════════════════════════════════


class TestSimulateDelay:
    def test_delay_on_critical_path_extends_project(self, linear_chain):
        project_delay, shifts = linear_chain.simulate_delay_impact(
            {"B": 5}
        )
        assert project_delay == 5
        # C and D should shift by 5
        assert shifts.get("C") == 5
        assert shifts.get("D") == 5

    def test_delay_absorbed_by_float(self, diamond):
        # B has 4 days of float. Delay B by 3 → no project delay
        project_delay, shifts = diamond.simulate_delay_impact({"B": 3})
        assert project_delay == 0
        # D should not shift (B's delay absorbed by float)

    def test_delay_exceeds_float(self, diamond):
        # B has 4 days of float. Delay B by 6 → 2 days project delay
        project_delay, shifts = diamond.simulate_delay_impact({"B": 6})
        assert project_delay == 2

    def test_delay_on_root(self, linear_chain):
        project_delay, shifts = linear_chain.simulate_delay_impact(
            {"A": 3}
        )
        assert project_delay == 3
        assert shifts.get("B") == 3
        assert shifts.get("C") == 3
        assert shifts.get("D") == 3

    def test_compound_delays(self, linear_chain):
        # Delay A by 2 and C by 3 → project delay = 2 + 3 = 5
        project_delay, shifts = linear_chain.simulate_delay_impact(
            {"A": 2, "C": 3}
        )
        assert project_delay == 5

    def test_no_delay_no_impact(self, linear_chain):
        project_delay, shifts = linear_chain.simulate_delay_impact({})
        assert project_delay == 0
        assert shifts == {}

    def test_westfield_delay_flooring(self, westfield_floor2):
        # Delay flooring by 7 days → project delays by 7
        project_delay, shifts = westfield_floor2.simulate_delay_impact(
            {"flooring": 7}
        )
        assert project_delay == 7
        assert shifts.get("painting") == 7

    def test_westfield_full_delay_floor3_absorbed(self, westfield_full):
        # Floor 3 has 22 days of float. Delay f3_elec by 10 → no project delay
        project_delay, _ = westfield_full.simulate_delay_impact(
            {"f3_elec": 10}
        )
        assert project_delay == 0

    def test_westfield_full_delay_floor3_exceeds_float(self, westfield_full):
        # Floor 3 has 22 days of float. Delay f3_elec by 25 → 3 days project delay
        project_delay, _ = westfield_full.simulate_delay_impact(
            {"f3_elec": 25}
        )
        assert project_delay == 3


# ══════════════════════════════════════════════════════════════
# FAN-OUT / BOTTLENECK PRIMITIVES
# ══════════════════════════════════════════════════════════════


class TestFanOut:
    def test_root_fan_out(self, diamond):
        assert diamond.fan_out("A") == 2

    def test_terminal_fan_out(self, diamond):
        assert diamond.fan_out("D") == 0

    def test_total_downstream(self, diamond):
        assert diamond.total_downstream_count("A") == 3  # B, C, D
        assert diamond.total_downstream_count("B") == 1  # D
        assert diamond.total_downstream_count("D") == 0

    def test_westfield_elec_downstream(self, westfield_floor2):
        assert westfield_floor2.total_downstream_count("elec") == 4


# ══════════════════════════════════════════════════════════════
# DEPTH MAP
# ══════════════════════════════════════════════════════════════


class TestDepthMap:
    def test_linear_chain(self, linear_chain):
        depths = linear_chain.depth_map()
        assert depths == {"A": 0, "B": 1, "C": 2, "D": 3}

    def test_diamond(self, diamond):
        depths = diamond.depth_map()
        assert depths["A"] == 0
        assert depths["B"] == 1
        assert depths["C"] == 1
        assert depths["D"] == 2

    def test_single_node(self, single_node):
        assert single_node.depth_map() == {"X": 0}

    def test_no_edges(self, no_edges):
        depths = no_edges.depth_map()
        assert all(d == 0 for d in depths.values())


# ══════════════════════════════════════════════════════════════
# EDGE CASES
# ══════════════════════════════════════════════════════════════


class TestEdgeCases:
    def test_zero_duration_nodes(self):
        """Milestones have zero duration."""
        nodes = [
            DAGNode(id="start", duration=0),
            DAGNode(id="work", duration=10),
            DAGNode(id="end", duration=0),
        ]
        edges = [
            DAGEdge(from_id="start", to_id="work"),
            DAGEdge(from_id="work", to_id="end"),
        ]
        dag = DAGAnalyzer(nodes, edges)
        assert dag.project_duration() == 10
        assert dag.critical_path() == ["start", "work", "end"]

    def test_all_complete_nodes(self):
        """Graph where everything is done."""
        nodes = [
            DAGNode(id="A", duration=5, is_complete=True),
            DAGNode(id="B", duration=3, is_complete=True),
        ]
        edges = [DAGEdge(from_id="A", to_id="B")]
        dag = DAGAnalyzer(nodes, edges)
        complete = {"A", "B"}
        assert dag.predecessors_satisfied("B", complete) is True

    def test_large_graph_performance(self):
        """Ensure no performance issues with 100+ nodes."""
        n = 100
        nodes = [DAGNode(id=f"N{i}", duration=1) for i in range(n)]
        edges = [DAGEdge(from_id=f"N{i}", to_id=f"N{i+1}")
                 for i in range(n - 1)]
        dag = DAGAnalyzer(nodes, edges)
        assert dag.project_duration() == 100
        assert len(dag.critical_path()) == 100
        assert dag.total_downstream_count("N0") == 99

    def test_wide_graph_many_parallels(self):
        """Root fans out to 20 parallel nodes, all converge to terminal."""
        root = DAGNode(id="root", duration=1)
        terminal = DAGNode(id="terminal", duration=1)
        middles = [DAGNode(id=f"M{i}", duration=i + 1) for i in range(20)]

        edges = []
        for m in middles:
            edges.append(DAGEdge(from_id="root", to_id=m.id))
            edges.append(DAGEdge(from_id=m.id, to_id="terminal"))

        dag = DAGAnalyzer([root, terminal] + middles, edges)
        # Critical path goes through the longest middle node (M19, duration=20)
        assert dag.project_duration() == 1 + 20 + 1  # root + M19 + terminal
        assert dag.fan_out("root") == 20


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
