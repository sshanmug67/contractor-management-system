"""
Worker Logging Helper

All Celery workers use this for consistent tagged logging
to the celery_workers.log special log file.

Usage in any worker:
    from app.workers.worker_logging import worker_log
    worker_log("NOTIFICATION", "Dispatched SMS to (512) 555-2001")
    worker_log("INVOICE", "Validation passed for INV-001")
"""

from app.config.logging_config import setup_special_logging, log_special_raw

# Logger name used by all workers
LOGGER_NAME = "special.celery_workers"
LOG_FILE = "celery_workers"

_initialized = False


def _ensure_logger():
    """Initialize the celery_workers logger once."""
    global _initialized
    if not _initialized:
        setup_special_logging(
            log_file_name=LOG_FILE,
            logger_name=LOGGER_NAME,
            fresh_start=False,
        )
        _initialized = True


def worker_log(tag: str, message: str):
    """
    Log a tagged message to celery_workers.log.

    Args:
        tag: Worker identifier (e.g., 'NOTIFICATION', 'INVOICE', 'DASHBOARD_STATS')
        message: Log message

    Output format in log file:
        [2026-03-12 13:20:00] [NOTIFICATION] Dispatched SMS to (512) 555-2001
    """
    _ensure_logger()
    log_special_raw(
        f"[{tag}] {message}",
        logger_name=LOGGER_NAME,
    )
