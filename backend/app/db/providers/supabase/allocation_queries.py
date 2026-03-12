"""
Allocation Queries

Provides the data needed for the AI contractor scoring algorithm.
Each scoring factor (skill match, performance, availability, proximity, pricing)
needs specific cross-table data.

Scoring weights (configurable per org):
  30% Skill Match
  25% Past Performance
  20% Availability
  15% Geographic Proximity (to WORKSITE)
  10% Pricing History
"""

from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.allocation_repository import IAllocationRepository

# ── Cross-table: Contractor performance from past workgroups ─

GET_CONTRACTOR_PERFORMANCE = """
    SELECT
        c.id AS contractor_id,
        c.company_name,
        c.rating,
        COUNT(DISTINCT wg.id) AS total_workgroups,
        COUNT(DISTINCT wg.id) FILTER (WHERE wg.status = 'complete') AS completed_workgroups,
        COUNT(DISTINCT wg.id) FILTER (WHERE wg.end_date < NOW() AND wg.status = 'complete') AS on_time_completions,
        AVG(wg.budget) AS avg_workgroup_budget
    FROM contractors c
    LEFT JOIN workgroups wg ON c.id = wg.contractor_id
    WHERE c.id = :contractor_id
    GROUP BY c.id;
"""

# ── Cross-table: Current workload (active workgroups) ─────

GET_CONTRACTOR_WORKLOAD = """
    SELECT
        c.id AS contractor_id,
        COUNT(DISTINCT wg.id) FILTER (WHERE wg.status IN ('pending', 'accepted', 'in_progress')) AS active_workgroups,
        COALESCE(SUM(wg.budget) FILTER (WHERE wg.status IN ('pending', 'accepted', 'in_progress')), 0) AS active_budget
    FROM contractors c
    LEFT JOIN workgroups wg ON c.id = wg.contractor_id
    WHERE c.id = :contractor_id
    GROUP BY c.id;
"""


class AllocationRepository(SupabaseBaseRepository, IAllocationRepository):
    """Queries for contractor allocation scoring data."""

    async def get_eligible_contractors(self, org_id: str, trade: str) -> list[dict]:
        """Find active contractors with matching skills for a trade."""
        result = (
            self.client.table("contractors")
            .select("*")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .contains("skills", [trade])
            .execute()
        )
        return result.data or []

    async def get_contractor_performance(self, contractor_id: str) -> dict:
        """Get performance data: completion rate, on-time %, avg budget."""
        # Past workgroups for this contractor
        workgroups = (
            self.client.table("workgroups")
            .select("id, status, budget, start_date, end_date")
            .eq("contractor_id", contractor_id)
            .execute()
        )
        data = workgroups.data or []
        total = len(data)
        completed = len([w for w in data if w["status"] == "complete"])
        on_time = len([
            w for w in data
            if w["status"] == "complete" and w.get("end_date")
            # TODO: compare actual completion date vs end_date
        ])

        return {
            "total_workgroups": total,
            "completed": completed,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "on_time_rate": (on_time / completed * 100) if completed > 0 else 0,
        }

    async def get_contractor_workload(self, contractor_id: str) -> dict:
        """Get current active workgroup count and budget."""
        result = (
            self.client.table("workgroups")
            .select("id, budget")
            .eq("contractor_id", contractor_id)
            .in_("status", ["pending", "accepted", "in_progress"])
            .execute()
        )
        data = result.data or []
        return {
            "active_workgroups": len(data),
            "active_budget": sum(w.get("budget", 0) or 0 for w in data),
        }

    async def get_contractor_location(self, contractor_id: str) -> dict:
        """Get contractor address for proximity scoring."""
        result = (
            self.client.table("contractors")
            .select("city, state, zip_code, address_line1")
            .eq("id", contractor_id)
            .single()
            .execute()
        )
        return result.data or {}

    async def get_worksite_location(self, worksite_id: str) -> dict:
        """Get worksite coordinates for proximity scoring."""
        result = (
            self.client.table("worksites")
            .select("geo_latitude, geo_longitude, city, state")
            .eq("id", worksite_id)
            .single()
            .execute()
        )
        return result.data or {}

    async def get_contractor_pricing_history(self, contractor_id: str, trade: str) -> dict:
        """Get average budget of past workgroups for pricing comparison."""
        result = (
            self.client.table("workgroups")
            .select("budget")
            .eq("contractor_id", contractor_id)
            .eq("trade", trade)
            .execute()
        )
        budgets = [w["budget"] for w in (result.data or []) if w.get("budget")]
        return {
            "avg_budget": sum(budgets) / len(budgets) if budgets else 0,
            "workgroup_count": len(budgets),
        }

    async def get_candidates(self, workgroup_id: str, org_id: str) -> list[dict]:
        """Get contractor candidates for a workgroup with scoring data."""
        # Get the workgroup to know required trade/skills
        wg = await self.fetch_one("workgroups", workgroup_id)
        if not wg:
            return []

        trade = wg.get("trade", "")

        # Get all active contractors in this org with matching skills
        result = (
            self.client.table("contractors")
            .select("*, workgroups(count)")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .contains("skills", [trade])
            .execute()
        )
        return result.data or []

    async def allocate_contractor(self, workgroup_id: str, contractor_id: str) -> dict:
        """Assign a contractor to a workgroup, set status to pending."""
        return await self.update_one("workgroups", workgroup_id, {
            "contractor_id": contractor_id,
            "status": "pending",
        })
