"""
DAG Engine — General-Purpose Directed Acyclic Graph Analyzer

Pure graph computation engine. Operates on abstract nodes (with IDs,
durations, and completion status) and directed edges.

This module has ZERO domain-specific imports. It knows nothing about
workgroups, jobs, contractors, or construction. It can be extracted
into a standalone Python package.

Usage:
    from app.services.dag_engine import DAGAnalyzer, DAGNode, DAGEdge

    nodes = [
        DAGNode(id="A", duration=5, is_complete=True),
        DAGNode(id="B", duration=3, is_complete=False),
        DAGNode(id="C", duration=7, is_complete=False),
    ]
    edges = [
        DAGEdge(from_id="A", to_id="B"),
        DAGEdge(from_id="B", to_id="C"),
    ]

    dag = DAGAnalyzer(nodes, edges)
    path = dag.critical_path()
    floats = dag.float_map()
"""

from __future__ import annotations

from dataclasses import dataclass
from collections import defaultdict, deque
from typing import Optional


# ── Data Structures ───────────────────────────────────────────


@dataclass(frozen=True)
class DAGNode:
    """A node in the DAG with a duration (weight) and completion flag."""
    id: str
    duration: int = 0           # weight in days (or any unit)
    is_complete: bool = False


@dataclass(frozen=True)
class DAGEdge:
    """A directed edge: from_id must finish before to_id can start."""
    from_id: str
    to_id: str


@dataclass
class ForwardResult:
    """Result of the forward pass for a single node."""
    earliest_start: int = 0
    earliest_finish: int = 0


@dataclass
class BackwardResult:
    """Result of the backward pass for a single node."""
    latest_start: int = 0
    latest_finish: int = 0


@dataclass
class ScheduleResult:
    """Combined forward + backward pass result for a single node."""
    node_id: str = ""
    duration: int = 0
    earliest_start: int = 0
    earliest_finish: int = 0
    latest_start: int = 0
    latest_finish: int = 0
    total_float: int = 0        # latest_start - earliest_start
    is_critical: bool = False   # total_float == 0


# ── DAGAnalyzer ───────────────────────────────────────────────


class DAGAnalyzer:
    """
    General-purpose DAG computation engine.

    All methods are pure — they read from the graph provided at
    construction time and return results without side effects.
    The graph is immutable after construction.
    """

    def __init__(self, nodes: list[DAGNode], edges: list[DAGEdge]):
        # Index nodes by ID
        self._nodes: dict[str, DAGNode] = {n.id: n for n in nodes}
        self._edges: list[DAGEdge] = list(edges)

        # Validate: every edge must reference existing nodes
        node_ids = set(self._nodes.keys())
        for e in self._edges:
            if e.from_id not in node_ids:
                raise ValueError(
                    f"Edge references unknown from_id: '{e.from_id}'"
                )
            if e.to_id not in node_ids:
                raise ValueError(
                    f"Edge references unknown to_id: '{e.to_id}'"
                )

        # Build adjacency lists (computed once, reused by all methods)
        self._successors: dict[str, list[str]] = defaultdict(list)
        self._predecessors: dict[str, list[str]] = defaultdict(list)
        self._in_degree: dict[str, int] = {n_id: 0 for n_id in self._nodes}

        for e in self._edges:
            self._successors[e.from_id].append(e.to_id)
            self._predecessors[e.to_id].append(e.from_id)
            self._in_degree[e.to_id] = self._in_degree.get(e.to_id, 0) + 1

    # ── Properties ────────────────────────────────────────────

    @property
    def node_ids(self) -> set[str]:
        """All node IDs in the graph."""
        return set(self._nodes.keys())

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return len(self._edges)

    def get_node(self, node_id: str) -> Optional[DAGNode]:
        return self._nodes.get(node_id)

    def get_roots(self) -> list[str]:
        """Nodes with no predecessors (in-degree 0)."""
        return sorted([
            n_id for n_id, deg in self._in_degree.items() if deg == 0
        ])

    def get_terminals(self) -> list[str]:
        """Nodes with no successors (out-degree 0)."""
        return sorted([
            n_id for n_id in self._nodes
            if not self._successors.get(n_id)
        ])

    # ── 1. Topological Sort (Kahn's BFS) ─────────────────────

    def topological_sort(self) -> list[str]:
        """
        Return nodes in topological order using Kahn's algorithm.

        Nodes at the same depth are sorted alphabetically for
        deterministic output.

        Raises ValueError if the graph contains a cycle (result
        length < node count).
        """
        in_deg = dict(self._in_degree)
        queue = deque(sorted([
            n_id for n_id, deg in in_deg.items() if deg == 0
        ]))
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)
            freed = []
            for succ in self._successors.get(node, []):
                in_deg[succ] -= 1
                if in_deg[succ] == 0:
                    freed.append(succ)
            for f in sorted(freed):
                queue.append(f)

        if len(result) != len(self._nodes):
            raise ValueError(
                f"Graph contains a cycle. "
                f"Topological sort produced {len(result)} of "
                f"{len(self._nodes)} nodes."
            )

        return result

    # ── 2. Cycle Detection ────────────────────────────────────

    def detect_cycle(self, from_id: str, to_id: str) -> Optional[list[str]]:
        """
        Check if adding edge from_id -> to_id would create a cycle.

        Uses DFS from to_id: if we can reach from_id by following
        existing forward edges, the new edge would create a cycle.

        Returns the cycle path if found, None if safe.
        The returned path starts and ends with from_id:
            [from_id, ..., from_id]
        """
        if from_id == to_id:
            return [from_id, to_id]

        visited: set[str] = set()
        path: list[str] = []

        def dfs(node: str) -> bool:
            if node == from_id:
                return True
            if node in visited:
                return False
            visited.add(node)
            path.append(node)
            for succ in self._successors.get(node, []):
                if dfs(succ):
                    return True
            path.pop()
            return False

        if dfs(to_id):
            return [from_id] + path + [from_id]
        return None

    def has_cycle(self) -> bool:
        """Check if the current graph has any cycle."""
        try:
            self.topological_sort()
            return False
        except ValueError:
            return True

    # ── 3. Forward Pass (Earliest Start / Finish) ─────────────

    def forward_pass(self) -> dict[str, ForwardResult]:
        """
        Compute earliest start (ES) and earliest finish (EF) for
        every node using topological-order dynamic programming.

        ES[node] = max(EF[pred] for pred in predecessors), or 0 if root
        EF[node] = ES[node] + duration[node]
        """
        topo = self.topological_sort()
        results: dict[str, ForwardResult] = {}

        for node_id in topo:
            node = self._nodes[node_id]
            es = 0
            for pred_id in self._predecessors.get(node_id, []):
                pred_ef = results[pred_id].earliest_finish
                if pred_ef > es:
                    es = pred_ef
            ef = es + node.duration
            results[node_id] = ForwardResult(
                earliest_start=es,
                earliest_finish=ef,
            )

        return results

    # ── 4. Backward Pass (Latest Start / Finish) ─────────────

    def backward_pass(self) -> dict[str, BackwardResult]:
        """
        Compute latest start (LS) and latest finish (LF) for every
        node using reverse topological-order dynamic programming.

        LF[node] = min(LS[succ] for succ in successors),
                   or project_end if terminal
        LS[node] = LF[node] - duration[node]
        """
        fwd = self.forward_pass()
        topo = self.topological_sort()

        project_end = max(
            (r.earliest_finish for r in fwd.values()),
            default=0,
        )

        results: dict[str, BackwardResult] = {}

        for node_id in reversed(topo):
            node = self._nodes[node_id]
            successors = self._successors.get(node_id, [])

            if not successors:
                lf = project_end
            else:
                lf = min(results[s].latest_start for s in successors)

            ls = lf - node.duration
            results[node_id] = BackwardResult(
                latest_start=ls,
                latest_finish=lf,
            )

        return results

    # ── 5. Full Schedule (Forward + Backward + Float) ─────────

    def compute_schedule(self) -> dict[str, ScheduleResult]:
        """
        Compute the full CPM schedule: ES, EF, LS, LF, total float,
        and critical flag for every node.

        Total Float = LS - ES (or equivalently LF - EF).
        A node is critical if total_float == 0.
        """
        fwd = self.forward_pass()
        bwd = self.backward_pass()

        results: dict[str, ScheduleResult] = {}
        for node_id, node in self._nodes.items():
            f = fwd[node_id]
            b = bwd[node_id]
            total_float = b.latest_start - f.earliest_start
            results[node_id] = ScheduleResult(
                node_id=node_id,
                duration=node.duration,
                earliest_start=f.earliest_start,
                earliest_finish=f.earliest_finish,
                latest_start=b.latest_start,
                latest_finish=b.latest_finish,
                total_float=total_float,
                is_critical=(total_float == 0),
            )

        return results

    # ── 6. Critical Path ──────────────────────────────────────

    def critical_path(self) -> list[str]:
        """
        Return the critical path as an ordered list of node IDs.

        The critical path is the longest path through the graph.
        Nodes on it have zero total float. Path returned in
        topological order (start to end).
        """
        schedule = self.compute_schedule()
        topo = self.topological_sort()

        critical_set = set(
            n_id for n_id in topo if schedule[n_id].is_critical
        )

        if not critical_set:
            return []

        # Walk the connected critical path from first critical root
        path: list[str] = []
        current = next(n for n in topo if n in critical_set)
        path.append(current)

        while True:
            next_node = None
            for succ in sorted(self._successors.get(current, [])):
                if succ in critical_set:
                    next_node = succ
                    break
            if next_node is None:
                break
            path.append(next_node)
            current = next_node

        return path

    # ── 7. Float Map ──────────────────────────────────────────

    def float_map(self) -> dict[str, int]:
        """
        Return total float (slack) for every node.

        Zero float = critical path node.
        Positive float = days this node can slip without
        delaying the project.
        """
        schedule = self.compute_schedule()
        return {
            node_id: sched.total_float
            for node_id, sched in schedule.items()
        }

    # ── 8. Project Duration ───────────────────────────────────

    def project_duration(self) -> int:
        """
        The minimum project duration (length of the critical path).
        Equal to the maximum earliest_finish across all nodes.
        """
        fwd = self.forward_pass()
        if not fwd:
            return 0
        return max(r.earliest_finish for r in fwd.values())

    # ── 9. Downstream (Reachability) ──────────────────────────

    def downstream(self, node_id: str) -> set[str]:
        """
        All nodes reachable from node_id by following forward edges.
        Does NOT include node_id itself.
        """
        if node_id not in self._nodes:
            raise ValueError(f"Unknown node: '{node_id}'")

        visited: set[str] = set()
        queue = deque(self._successors.get(node_id, []))

        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            queue.extend(self._successors.get(current, []))

        return visited

    # ── 10. Upstream (Reverse Reachability) ───────────────────

    def upstream(self, node_id: str) -> set[str]:
        """
        All nodes that can reach node_id by following forward edges.
        (All ancestors.) Does NOT include node_id itself.
        """
        if node_id not in self._nodes:
            raise ValueError(f"Unknown node: '{node_id}'")

        visited: set[str] = set()
        queue = deque(self._predecessors.get(node_id, []))

        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            queue.extend(self._predecessors.get(current, []))

        return visited

    # ── 11. Predecessors Satisfied ────────────────────────────

    def predecessors_satisfied(
        self,
        node_id: str,
        complete_ids: set[str],
    ) -> bool:
        """
        Check if all predecessors of node_id are in the complete set.
        Used to determine if a node is "unblocked".

        Args:
            node_id: the node to check
            complete_ids: set of node IDs that are complete
        """
        if node_id not in self._nodes:
            raise ValueError(f"Unknown node: '{node_id}'")

        preds = self._predecessors.get(node_id, [])
        if not preds:
            return True

        return all(p in complete_ids for p in preds)

    # ── 12. Direct Successors / Predecessors ──────────────────

    def direct_successors(self, node_id: str) -> list[str]:
        """Immediate successor node IDs."""
        if node_id not in self._nodes:
            raise ValueError(f"Unknown node: '{node_id}'")
        return list(self._successors.get(node_id, []))

    def direct_predecessors(self, node_id: str) -> list[str]:
        """Immediate predecessor node IDs."""
        if node_id not in self._nodes:
            raise ValueError(f"Unknown node: '{node_id}'")
        return list(self._predecessors.get(node_id, []))

    # ── 13. Simulate Delay ────────────────────────────────────

    def simulate_delay(
        self,
        delays: dict[str, int],
    ) -> dict[str, ForwardResult]:
        """
        Simulate what happens if specific nodes are delayed.

        Creates a temporary analyzer with modified durations and
        runs forward_pass. Does NOT modify the original graph.

        Args:
            delays: {node_id: additional_days}

        Returns:
            Forward pass results with modified durations.
        """
        modified_nodes = []
        for node_id, node in self._nodes.items():
            extra = delays.get(node_id, 0)
            modified_nodes.append(DAGNode(
                id=node.id,
                duration=node.duration + extra,
                is_complete=node.is_complete,
            ))

        temp = DAGAnalyzer(modified_nodes, self._edges)
        return temp.forward_pass()

    def simulate_delay_impact(
        self,
        delays: dict[str, int],
    ) -> tuple[int, dict[str, int]]:
        """
        Simulate delay and return project delay + per-node shifts.

        Args:
            delays: {node_id: additional_days}

        Returns:
            (project_delay_days, {node_id: shift_days})
        """
        original_fwd = self.forward_pass()
        delayed_fwd = self.simulate_delay(delays)

        original_duration = max(
            (r.earliest_finish for r in original_fwd.values()),
            default=0,
        )
        delayed_duration = max(
            (r.earliest_finish for r in delayed_fwd.values()),
            default=0,
        )
        project_delay = delayed_duration - original_duration

        shifts = {}
        for node_id in self._nodes:
            orig_es = original_fwd[node_id].earliest_start
            delayed_es = delayed_fwd[node_id].earliest_start
            shift = delayed_es - orig_es
            if shift != 0:
                shifts[node_id] = shift

        return project_delay, shifts

    # ── 14. Fan-Out (for Bottleneck Detection) ────────────────

    def fan_out(self, node_id: str) -> int:
        """Direct successor count."""
        return len(self._successors.get(node_id, []))

    def total_downstream_count(self, node_id: str) -> int:
        """Total transitive downstream node count."""
        return len(self.downstream(node_id))

    # ── 15. Depth Map ─────────────────────────────────────────

    def depth_map(self) -> dict[str, int]:
        """
        Compute the depth (longest path from any root) for each node.
        Roots have depth 0.
        """
        topo = self.topological_sort()
        depths: dict[str, int] = {}

        for node_id in topo:
            preds = self._predecessors.get(node_id, [])
            if not preds:
                depths[node_id] = 0
            else:
                depths[node_id] = max(depths[p] + 1 for p in preds)

        return depths

    # ── String Representation ─────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"DAGAnalyzer(nodes={self.node_count}, "
            f"edges={self.edge_count}, "
            f"duration={self.project_duration()})"
        )
