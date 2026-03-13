"""
Portfolio Stats — Shared Computation Utility

Used by both the dashboard router (cache miss path) and the
dashboard_stats_worker (cache refresh path) to ensure identical
stat calculations. Single source of truth for aggregation logic.

Location: app/services/portfolio_stats.py
"""


def compute_portfolio_payload(
    projects: list,
    pending_invoices: list,
    pending_workgroups: list,
    recent_activity: list,
    ai_insights: list | None = None,
) -> dict:
    """
    Build the full portfolio payload from pre-fetched data.

    All inputs come from IDashboardRepository methods.
    This function does pure computation — no I/O, no DB, no cache.

    Args:
        projects: from repo.get_portfolio_projects()
        pending_invoices: from repo.get_pending_invoices()
        pending_workgroups: from repo.get_pending_workgroups()
        recent_activity: from repo.get_recent_activity()
        ai_insights: from get_cached_ai_insights() (optional)

    Returns:
        Complete portfolio dict matching the API response shape.
    """
    active = [
        p for p in projects
        if p.get("status") in ("active", "planning", "review")
    ]
    delayed = [
        p for p in projects
        if p.get("status") == "on_hold"
    ]

    stats = {
        "active_projects": len(active) + len(delayed),
        "on_track": len(active),
        "delayed": len(delayed),
        "total_budget": sum(p.get("total_budget", 0) or 0 for p in projects),
        "total_spent": sum(p.get("total_paid", 0) or 0 for p in projects),
        "total_invoiced": sum(p.get("total_invoiced", 0) or 0 for p in projects),
        "total_jobs": sum(p.get("job_count", 0) or 0 for p in projects),
        "total_jobs_done": sum(p.get("jobs_complete", 0) or 0 for p in projects),
        "pending_workgroups": len(pending_workgroups),
        "pending_invoices": len(pending_invoices),
    }

    return {
        "projects": projects,
        "stats": stats,
        "pending_invoices": pending_invoices,
        "pending_workgroups": pending_workgroups,
        "recent_activity": recent_activity[:10],
        "ai_insights": ai_insights or [],
    }
