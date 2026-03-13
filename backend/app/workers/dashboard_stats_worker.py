"""
Dashboard Stats Worker — Periodic L2 Cache Refresh

Runs every 5 minutes via Celery Beat.
Queries the database for per-org dashboard aggregates (through ProviderRegistry)
and writes the result to Redis L2 cache.

Dashboard API reads from Redis instead of hitting the DB on every request.
Cache miss falls through to ProviderRegistry — never to a specific provider directly.

Pattern mirrors CVE Intel's realworld_stats_worker.

Trigger: Celery Beat schedule (every 300s, configurable via CMS_BEAT_DASHBOARD)
Cache key: cms:cache:dashboard_stats:{org_id}  TTL: 10 minutes
Pub/sub: cms:stats:refreshed:{org_id}
"""

import asyncio
from app.workers.celery_app import app
from app.workers.worker_logging import worker_log
from app.cache.redis_client import get_redis_client
from app.cache.dashboard_cache import get_cached_dashboard_stats, set_cached_dashboard_stats
from app.services.portfolio_stats import compute_portfolio_payload

TAG = "DASHBOARD_STATS"

# ── Dev org ID from seed data — replace with dynamic query when auth is ready ──
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"


@app.task(
    name="app.workers.dashboard_stats_worker.refresh_dashboard_stats",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def refresh_dashboard_stats(self):
    """
    Refresh dashboard stats for all active organizations.

    Flow:
        1. Get list of active orgs (hardcoded for MVP, dynamic later)
        2. For each org, query database via ProviderRegistry
        3. Write full dashboard JSON to Redis L2 cache
        4. Publish refresh event for any listeners
        5. Write worker heartbeat

    The ProviderRegistry returns the same data shape regardless of
    whether DB_PROVIDER is 'supabase' or 'postgres'.
    """
    try:
        worker_log(TAG, "Starting dashboard stats refresh")

        # ── Get ProviderRegistry (same singleton the router uses) ──
        # Workers cannot use FastAPI Depends(), so we call directly.
        # This import is deferred to avoid circular imports at module load.
        from app.providers import get_provider_registry
        providers = get_provider_registry()

        redis = get_redis_client()

        # ── 1. Get active organizations ───────────────────
        # MVP: Single hardcoded org from seed data.
        # TODO: When multi-org is ready, replace with:
        #   orgs = asyncio.run(providers.projects.list_active_orgs())
        #   for org in orgs:
        #       _refresh_org(providers, org["id"])
        org_ids = [DEV_ORG_ID]

        refreshed = 0
        for org_id in org_ids:
            try:
                _refresh_org(providers, org_id)
                refreshed += 1
            except Exception as org_exc:
                worker_log(TAG, f"Failed for org {org_id}: {org_exc}")
                # Continue to next org — don't let one failure stop all

        # ── Write heartbeat ───────────────────────────────
        redis.write_heartbeat("dashboard_stats_worker")

        worker_log(TAG, f"Dashboard stats refresh complete — {refreshed}/{len(org_ids)} orgs cached")
        return {"status": "success", "orgs_refreshed": refreshed}

    except Exception as exc:
        worker_log(TAG, f"FAILED — {exc}")
        raise self.retry(exc=exc)


def _refresh_org(providers, org_id: str):
    """
    Refresh dashboard stats for a single organization.

    Calls the IDashboardRepository through ProviderRegistry.
    The repository method is async, so we use asyncio.run()
    since Celery tasks are synchronous (solo pool on Windows).
    """
    # ── Query single-project dashboard via ProviderRegistry ─
    # providers.dashboard is IDashboardRepository
    # Could be SupabaseDashboardRepo or SQLAlchemyDashboardRepo
    # The worker doesn't know and doesn't care.
    data = asyncio.run(
        providers.dashboard.get_owner_dashboard(org_id)
    )

    if not data or not data.get("project"):
        worker_log(TAG, f"No active project for org {org_id} — skipping cache write")
        return

    # ── Write single-project data to Redis L2 cache ───────
    # set_cached_dashboard_stats handles:
    #   - Writing to cms:cache:dashboard_stats:{org_id}
    #   - Setting TTL (10 minutes)
    #   - Publishing cms:stats:refreshed:{org_id} event
    success = set_cached_dashboard_stats(org_id, data)

    if success:
        stats = data.get("stats", {})
        worker_log(
            TAG,
            f"Cached stats for org {org_id}: "
            f"{stats.get('worksite_count', 0)} sites, "
            f"{stats.get('workgroup_count', 0)} workgroups, "
            f"{stats.get('job_count', 0)} jobs "
            f"({stats.get('jobs_done', 0)} done, {stats.get('jobs_active', 0)} active)"
        )
    else:
        worker_log(TAG, f"Redis write failed for org {org_id} — cache not updated")

    # ── FIX (Bug 2): Refresh portfolio cache for landing page ─
    # This was defined but never called. The /owner/portfolio
    # endpoint needs this "portfolio" sub-key in the cache.
    _refresh_portfolio(providers, org_id)


# ── Portfolio-level async queries ─────────────────────────
# FIX (Bug 1): All async calls are batched into a single
# asyncio.run() to avoid "attached to a different loop" errors.
# asyncio.run() creates and tears down an event loop each time.
# Multiple sequential calls can break if the Supabase client
# holds references to the first loop's objects.

async def _fetch_portfolio_data(dashboard_repo, org_id: str) -> tuple:
    """
    Fetch all portfolio data in a single event loop context.

    This is an async function called via asyncio.run() once,
    instead of calling asyncio.run() four separate times.
    """
    projects = await dashboard_repo.get_portfolio_projects(org_id)
    pending_invoices = await dashboard_repo.get_pending_invoices(org_id)
    pending_workgroups = await dashboard_repo.get_pending_workgroups(org_id)
    recent_activity = await dashboard_repo.get_recent_activity(org_id, limit=10)
    return projects, pending_invoices, pending_workgroups, recent_activity


def _refresh_portfolio(providers, org_id: str):
    """
    Refresh portfolio-level stats for the Owner Dashboard landing page.

    Writes a "portfolio" sub-key into the existing cache entry at
    cms:cache:dashboard_stats:{org_id} so both single-project and
    portfolio data coexist under one Redis key.
    """
    try:
        # ── FIX (Bug 1): Single asyncio.run() for all queries ─
        projects, pending_invoices, pending_workgroups, recent_activity = (
            asyncio.run(
                _fetch_portfolio_data(providers.dashboard, org_id)
            )
        )

        # ── Compute using shared utility ──────────────────
        # Same compute_portfolio_payload used by the router on cache miss.
        # Single source of truth — no stat computation drift.
        portfolio = compute_portfolio_payload(
            projects=projects,
            pending_invoices=pending_invoices,
            pending_workgroups=pending_workgroups,
            recent_activity=recent_activity,
            ai_insights=None,  # AI insights come from separate cache key
        )

        # ── Merge into existing cache entry ───────────────
        # The single-project data was just written by _refresh_org().
        # We add the "portfolio" sub-key so both coexist.
        existing = get_cached_dashboard_stats(org_id) or {}
        existing["portfolio"] = portfolio
        set_cached_dashboard_stats(org_id, existing)

        worker_log(
            TAG,
            f"Cached portfolio for org {org_id}: "
            f"{len(projects)} projects, "
            f"{len(pending_invoices)} pending invoices, "
            f"{len(pending_workgroups)} pending workgroups"
        )

    except Exception as exc:
        worker_log(TAG, f"Portfolio cache failed for org {org_id}: {exc}")
        # Don't re-raise — let the main worker continue.
        # The router will fall through to DB on cache miss.
