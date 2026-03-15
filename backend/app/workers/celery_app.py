"""
CMS Celery Application

Central Celery configuration with Beat schedule for periodic tasks.
Broker and result backend use Redis.

Logging: All workers write to logs/celery_workers.log
via the CMS special logging system. Each task tags its messages
with [WORKER_NAME] for easy filtering.

Start worker:   celery -A app.workers.celery_app worker --loglevel=info --pool=solo
Start beat:     celery -A app.workers.celery_app beat --loglevel=info
Start flower:   celery -A app.workers.celery_app flower --port=5555
"""

import os
import logging
from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_init, worker_ready, task_prerun, task_postrun, task_failure, beat_init, after_setup_logger

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
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Result expiration
    result_expires=3600,

    # Retry defaults
    task_default_retry_delay=10,
    task_max_retries=3,

    # Task routes
    task_routes={
        "app.workers.notification_worker.*": {"queue": "notifications"},
        "app.workers.invoice_worker.*": {"queue": "invoices"},
        "app.workers.geo_worker.*": {"queue": "geo"},
        "app.workers.dashboard_stats_worker.*": {"queue": "periodic"},
        "app.workers.dependency_analysis_worker.*": {"queue": "periodic"},
        "app.workers.insights_worker.*": {"queue": "periodic"},
        "app.workers.verification_worker.*": {"queue": "periodic"},
    },

    task_default_queue="default",
)

# ── Beat Schedule (Periodic Tasks) ────────────────────────
app.conf.beat_schedule = {
    "refresh-dashboard-stats": {
        "task": "app.workers.dashboard_stats_worker.refresh_dashboard_stats",
        "schedule": int(os.getenv("CMS_BEAT_DASHBOARD", 300)),
        "options": {"queue": "periodic"},
    },
    # v1.1: Dependency analysis — daily at 5 AM
    "refresh-dependency-analysis": {
        "task": "app.workers.dependency_analysis_worker.refresh_dependency_analysis",
        "schedule": crontab(
            hour=int(os.getenv("CMS_BEAT_DEPENDENCY_HOUR", 5)),
            minute=0,
        ),
        "options": {"queue": "periodic"},
    },
    "generate-ai-insights": {
        "task": "app.workers.insights_worker.generate_ai_insights",
        "schedule": int(os.getenv("CMS_BEAT_INSIGHTS", 1800)),
        "options": {"queue": "periodic"},
    },
    "cleanup-stale-sessions": {
        "task": "app.workers.stale_session_worker.cleanup_stale_sessions",
        "schedule": int(os.getenv("CMS_BEAT_CLEANUP", 3600)),
        "options": {"queue": "periodic"},
    },
    "monitor-deadlines": {
        "task": "app.workers.deadline_monitor_worker.monitor_deadlines",
        "schedule": int(os.getenv("CMS_BEAT_DEADLINE", 21600)),
        "options": {"queue": "periodic"},
    },
    "verify-contractors": {
        "task": "app.workers.verification_worker.verify_contractors",
        "schedule": crontab(
            hour=int(os.getenv("CMS_BEAT_VERIFY_HOUR", 2)),
            minute=0,
        ),
        "options": {"queue": "periodic"},
    },
}

# ── Auto-discover tasks ──────────────────────────────────
app.autodiscover_tasks([
    "app.workers.notification_worker",
    "app.workers.invoice_worker",
    "app.workers.progress_worker",
    "app.workers.dependency_worker",
    "app.workers.dependency_analysis_worker",
    "app.workers.geo_worker",
    "app.workers.qr_worker",
    "app.workers.dashboard_stats_worker",
    "app.workers.insights_worker",
    "app.workers.stale_session_worker",
    "app.workers.deadline_monitor_worker",
    "app.workers.verification_worker",
])


# ══════════════════════════════════════════════════════════
# LOGGING — Celery Signal Hooks
# ══════════════════════════════════════════════════════════

_celery_logger = None  # Initialized on worker/beat startup


def _get_celery_logger():
    """Get or create the celery_workers special logger."""
    global _celery_logger
    if _celery_logger is None:
        from app.config.logging_config import setup_special_logging
        _celery_logger = setup_special_logging(
            log_file_name="celery_workers",
            logger_name="special.celery_workers",
            fresh_start=False,
        )
    return _celery_logger


def _log(tag: str, message: str):
    """Write a tagged message to the celery_workers log."""
    from app.config.logging_config import log_special_raw
    log_special_raw(
        f"[{tag}] {message}",
        logger_name="special.celery_workers",
    )


# ── Worker Startup ────────────────────────────────────────

@worker_init.connect
def on_worker_init(**kwargs):
    """Called when a Celery worker process starts."""
    logger = _get_celery_logger()
    _log("WORKER", f"Worker started — broker: {redis_config.broker_url}")
    _log("WORKER", f"Queues: {list(app.conf.beat_schedule.keys())}")


@worker_ready.connect
def on_worker_ready(**kwargs):
    """
    Pre-warm analysis cache when worker comes online.

    Fires refresh_dependency_analysis (all projects) immediately
    so the GanttData cache is warm within seconds of startup.
    No waiting for the 5 AM Beat schedule.
    """
    _get_celery_logger()
    _log("WORKER", "Pre-warming dependency analysis cache on startup")
    app.send_task(
        "app.workers.dependency_analysis_worker.refresh_dependency_analysis",
        queue="periodic",
    )
    # Also pre-warm dashboard stats
    app.send_task(
        "app.workers.dashboard_stats_worker.refresh_dashboard_stats",
        queue="periodic",
    )


# ── Beat Startup ──────────────────────────────────────────

@beat_init.connect
def on_beat_init(**kwargs):
    """Called when Celery Beat scheduler starts."""
    logger = _get_celery_logger()
    _log("BEAT", "Beat scheduler started")
    for name, entry in app.conf.beat_schedule.items():
        schedule = entry.get("schedule")
        _log("BEAT", f"  Scheduled: {name} — every {schedule}")


@after_setup_logger.connect
def on_after_setup_logger(**kwargs):
    """Re-attach our file handler after Celery configures logging."""
    _get_celery_logger()

# ── Task Lifecycle ────────────────────────────────────────

@task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **kw):
    """Called just before a task executes."""
    _get_celery_logger()
    tag = _task_tag(task.name)
    _log(tag, f"STARTED — task_id={task_id}")


@task_postrun.connect
def on_task_postrun(task_id, task, args, kwargs, retval, state, **kw):
    """Called after a task completes (success or failure)."""
    _get_celery_logger()
    tag = _task_tag(task.name)
    _log(tag, f"FINISHED — task_id={task_id} state={state}")


@task_failure.connect
def on_task_failure(task_id, exception, traceback, sender, **kw):
    """Called when a task raises an exception."""
    _get_celery_logger()
    tag = _task_tag(sender.name)
    _log(tag, f"FAILED — task_id={task_id} error={exception}")


# ── Tag Helper ────────────────────────────────────────────

def _task_tag(task_name: str) -> str:
    """
    Extract a short tag from the full task name.

    'app.workers.notification_worker.send_notification' → 'NOTIFICATION'
    'app.workers.dashboard_stats_worker.refresh_dashboard_stats' → 'DASHBOARD_STATS'
    'app.workers.dependency_analysis_worker.refresh_dependency_analysis' → 'DEPENDENCY_ANALYSIS'
    """
    parts = task_name.split(".")
    if len(parts) >= 3:
        worker_name = parts[-2]  # e.g., 'notification_worker'
        return worker_name.replace("_worker", "").upper()
    return task_name.upper()
