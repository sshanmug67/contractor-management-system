"""
CMS Celery Application

Central Celery configuration with Beat schedule for periodic tasks.
Broker and result backend use Redis.

Start worker:   celery -A app.workers.celery_app worker --loglevel=info
Start beat:     celery -A app.workers.celery_app beat --loglevel=info
Start flower:   celery -A app.workers.celery_app flower --port=5555
"""

import os
from celery import Celery
from celery.schedules import crontab

from app.cache.redis_config import get_redis_config

# ── Redis Config ──────────────────────────────────────────
redis_config = get_redis_config()

# ── Celery App ────────────────────────────────────────────
app = Celery(
    "cms",
    broker=redis_config.broker_url,
    backend=redis_config.result_backend,
)

# ── Celery Settings ───────────────────────────────────────
app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_acks_late=True,                    # Ack after completion (crash safety)
    task_reject_on_worker_lost=True,        # Re-queue if worker dies
    worker_prefetch_multiplier=1,           # One task at a time per process

    # Result expiration
    result_expires=3600,                    # Clean up results after 1 hour

    # Retry defaults
    task_default_retry_delay=10,            # 10 seconds
    task_max_retries=3,

    # Task routes (optional: separate queues for different priorities)
    task_routes={
        "app.workers.notification_worker.*": {"queue": "notifications"},
        "app.workers.invoice_worker.*": {"queue": "invoices"},
        "app.workers.geo_worker.*": {"queue": "geo"},
        "app.workers.dashboard_stats_worker.*": {"queue": "periodic"},
        "app.workers.insights_worker.*": {"queue": "periodic"},
        "app.workers.verification_worker.*": {"queue": "periodic"},
    },

    # Default queue for tasks not explicitly routed
    task_default_queue="default",
)

# ── Beat Schedule (Periodic Tasks) ────────────────────────
# Intervals are configurable via env vars with sensible defaults.

app.conf.beat_schedule = {
    # Dashboard stats refresh — every 5 minutes
    "refresh-dashboard-stats": {
        "task": "app.workers.dashboard_stats_worker.refresh_dashboard_stats",
        "schedule": int(os.getenv("CMS_BEAT_DASHBOARD", 300)),
        "options": {"queue": "periodic"},
    },

    # AI insights generation — every 30 minutes
    "generate-ai-insights": {
        "task": "app.workers.insights_worker.generate_ai_insights",
        "schedule": int(os.getenv("CMS_BEAT_INSIGHTS", 1800)),
        "options": {"queue": "periodic"},
    },

    # Stale session cleanup — every 1 hour
    "cleanup-stale-sessions": {
        "task": "app.workers.stale_session_worker.cleanup_stale_sessions",
        "schedule": int(os.getenv("CMS_BEAT_CLEANUP", 3600)),
        "options": {"queue": "periodic"},
    },

    # Deadline monitor — every 6 hours
    "monitor-deadlines": {
        "task": "app.workers.deadline_monitor_worker.monitor_deadlines",
        "schedule": int(os.getenv("CMS_BEAT_DEADLINE", 21600)),
        "options": {"queue": "periodic"},
    },

    # Contractor verification — daily at 2 AM
    "verify-contractors": {
        "task": "app.workers.verification_worker.verify_contractors",
        "schedule": crontab(
            hour=int(os.getenv("CMS_BEAT_VERIFY_HOUR", 2)),
            minute=0,
        ),
        "options": {"queue": "periodic"},
    },
}

# ── Auto-discover tasks from worker modules ───────────────
app.autodiscover_tasks([
    "app.workers.notification_worker",
    "app.workers.invoice_worker",
    "app.workers.progress_worker",
    "app.workers.dependency_worker",
    "app.workers.geo_worker",
    "app.workers.qr_worker",
    "app.workers.dashboard_stats_worker",
    "app.workers.insights_worker",
    "app.workers.stale_session_worker",
    "app.workers.deadline_monitor_worker",
    "app.workers.verification_worker",
])
