"""
Branding Cache — L2 Redis Cache Helpers

Read/write business profile branding data from Redis.
Used by:
  - dashboard_stats_worker (writes on startup + every 5 min)
  - settings router (write-through on profile save)
  - branding router (reads on every page load)

Key schema:
  cms:cache:branding:{org_id}  → company name, logo, address, defaults

Branding changes rarely (only when Settings saves), so TTL is
longer than dashboard stats. The Settings PUT endpoint does a
write-through to keep cache fresh immediately on save.
"""

import logging
from typing import Optional
from app.cache.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# ── TTL ───────────────────────────────────────────────────
BRANDING_TTL = 3600  # 1 hour (profile changes are rare)

# ── Branding fields to extract from full profile ──────────
BRANDING_FIELDS = [
    "company_name",
    "dba_name",
    "logo_url",
    "phone",
    "email",
    "website",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "zip_code",
    "country",
    "industry",
    "invoice_prefix",
    "default_markup_pct",
    "default_billing_cycle",
    "default_payment_terms",
]


def extract_branding(profile: dict) -> dict:
    """
    Extract branding-relevant fields from a full business_profiles row.

    Keeps the cached payload lean — only what the UI needs for
    sidebar, headers, invoices, and exports.
    """
    return {k: profile.get(k) for k in BRANDING_FIELDS}


# ── Cache Read/Write ──────────────────────────────────────

def get_cached_branding(org_id: str) -> Optional[dict]:
    """Read branding data from Redis L2 cache."""
    client = get_redis_client()
    return client.get_json(f"cms:cache:branding:{org_id}")


def set_cached_branding(org_id: str, branding: dict) -> bool:
    """
    Write branding data to Redis L2 cache.

    Publishes cms:branding:updated:{org_id} so frontend
    can react without a page refresh (e.g., sidebar update).
    """
    client = get_redis_client()
    success = client.set_json(
        f"cms:cache:branding:{org_id}",
        branding,
        ttl_seconds=BRANDING_TTL,
    )
    if success:
        client.publish(f"cms:branding:updated:{org_id}", {
            "org_id": org_id,
            "company_name": branding.get("company_name"),
        })
    return success


def invalidate_branding(org_id: str) -> bool:
    """Delete branding cache (forces re-read on next request)."""
    client = get_redis_client()
    return client.delete_key(f"cms:cache:branding:{org_id}")
