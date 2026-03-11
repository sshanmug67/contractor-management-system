"""
Service — AI Contractor Allocation (Scoring Model)

Scores and ranks contractors for a workgroup based on:
  30% Skill Match
  25% Past Performance
  20% Availability
  15% Geographic Proximity (to WORKSITE, not project)
  10% Pricing History

Weights are configurable per organization.
AI learns and adjusts weights over time based on outcomes.
"""

from decimal import Decimal


async def score_contractors(
    workgroup_id: str,
    db,
    limit: int = 5,
) -> list[dict]:
    """
    Score all eligible contractors for a workgroup.
    
    Steps:
    1. Get workgroup details (trade, budget, worksite location)
    2. Find contractors with matching skills
    3. Score each contractor across 5 factors
    4. Return ranked list
    """
    # TODO: Fetch workgroup + worksite details
    # TODO: Query contractors with skill overlap
    # TODO: For each contractor, calculate:
    #   - skill_match_score()
    #   - past_performance_score()
    #   - availability_score()
    #   - proximity_score()
    #   - pricing_score()
    # TODO: Weighted sum → total score
    # TODO: Sort descending, return top N
    return []


async def skill_match_score(contractor_skills: list[str], required_trade: str) -> Decimal:
    """Score: how well do contractor skills match the required trade? (0-100)"""
    # TODO: Exact match, partial match, related skills
    return Decimal("0")


async def past_performance_score(contractor_id: str, db) -> Decimal:
    """Score: avg rating + completion rate + on-time %. (0-100)"""
    # TODO: Query past workgroups for this contractor
    return Decimal("0")


async def availability_score(contractor_id: str, db) -> Decimal:
    """Score: current workgroup count vs capacity. (0-100)"""
    # TODO: Count active workgroups
    return Decimal("0")


async def proximity_score(
    contractor_lat: Decimal, contractor_lng: Decimal,
    worksite_lat: Decimal, worksite_lng: Decimal,
) -> Decimal:
    """Score: distance from contractor to worksite. (0-100)"""
    # TODO: Use geopy to calculate distance
    # TODO: Closer = higher score
    return Decimal("0")


async def pricing_score(contractor_id: str, workgroup_budget: Decimal, db) -> Decimal:
    """Score: historical pricing vs this workgroup's budget. (0-100)"""
    # TODO: Compare typical rates to budget
    return Decimal("0")
