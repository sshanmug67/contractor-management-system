"""
Notification Worker — Multi-Channel Dispatch

Central notification hub implementing the notification matrix (Part 8, v5 doc).
Thin orchestration layer: resolves recipients, routes to channels, logs delivery.

Trigger: send_notification.delay(event_type, entity_id, context)
Called by: any other worker or API endpoint that needs to notify someone.
"""

from app.workers.celery_app import app
from app.workers.worker_logging import worker_log
from app.providers import get_provider_registry
from app.cache.redis_client import get_redis_client

TAG = "NOTIFICATION"


@app.task(
    name="app.workers.notification_worker.send_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def send_notification(self, event_type: str, entity_id: str, context: dict = None):
    """
    Dispatch notifications for a CMS event.

    Args:
        event_type: Event from notification matrix (e.g., 'invoice_validated',
                    'dependency_unblocked', 'deadline_approaching')
        entity_id: ID of the related entity (workgroup_id, invoice_id, etc.)
        context: Additional context dict (project_name, amounts, etc.)
    """
    context = context or {}

    try:
        worker_log(TAG, f"Processing: {event_type} for entity {entity_id}")

        providers = get_provider_registry()
        redis = get_redis_client()

        # ── 1. Look up notification matrix rules ──────────
        matrix_entry = NOTIFICATION_MATRIX.get(event_type)
        if not matrix_entry:
            worker_log(TAG, f"Unknown event_type: {event_type} — skipping")
            return {"status": "skipped", "reason": "unknown_event_type"}

        # ── 2. Resolve recipients ─────────────────────────
        # TODO: Query worksite contacts, business owner, contractor
        # based on entity_id and the matrix rules

        # ── 3. Check preferences and rate limits ──────────
        # TODO: Check per-user opt-outs
        # TODO: Check SMS rate limit via Redis

        # ── 4. Dispatch to channels ───────────────────────
        # TODO: Call notification service for each channel

        # ── 5. Log delivery ───────────────────────────────
        # TODO: Write to audit_logs

        # ── 6. Write heartbeat ────────────────────────────
        redis.write_heartbeat("notification_worker")

        worker_log(TAG, f"Dispatched: {event_type} for {entity_id}")
        return {"status": "sent", "event_type": event_type, "entity_id": entity_id}

    except Exception as exc:
        worker_log(TAG, f"FAILED: {event_type} for {entity_id} — {exc}")
        raise self.retry(exc=exc)


# ── Notification Matrix (from v5 doc Part 8) ─────────────

NOTIFICATION_MATRIX = {
    "workgroup_allocated": {
        "owner": [],
        "worksite_contact": ["email"],
        "contractor": ["sms", "email"],
    },
    "contractor_accepted": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": [],
    },
    "contractor_rejected": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": [],
    },
    "no_response_24hr": {
        "owner": [],
        "worksite_contact": ["email"],
        "contractor": ["sms"],
    },
    "no_response_48hr": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": ["sms"],
    },
    "invoice_validated": {
        "owner": ["push"],
        "worksite_contact": ["push"],
        "contractor": [],
    },
    "invoice_flagged": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": ["sms"],
    },
    "invoice_approved": {
        "owner": [],
        "worksite_contact": [],
        "contractor": ["sms", "push"],
    },
    "payment_processed": {
        "owner": [],
        "worksite_contact": [],
        "contractor": ["sms", "email"],
    },
    "dependency_unblocked": {
        "owner": ["push"],
        "worksite_contact": ["push", "email"],
        "contractor": ["sms", "email"],
    },
    "deadline_approaching": {
        "owner": ["push"],
        "worksite_contact": ["push", "sms"],
        "contractor": ["sms"],
    },
    "deadline_missed": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email", "sms"],
        "contractor": ["sms"],
    },
    "workgroup_stalled": {
        "owner": ["push"],
        "worksite_contact": ["push", "email"],
        "contractor": ["sms"],
    },
    "no_checkins": {
        "owner": [],
        "worksite_contact": ["push", "email"],
        "contractor": ["sms"],
    },
    "geo_anomaly": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": [],
    },
    "worksite_complete": {
        "owner": ["push", "email"],
        "worksite_contact": ["push", "email"],
        "contractor": [],
    },
    "verification_expiring": {
        "owner": ["push", "email"],
        "worksite_contact": [],
        "contractor": ["sms"],
    },
}
