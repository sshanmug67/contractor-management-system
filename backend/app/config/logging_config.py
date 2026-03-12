"""
CMS Backend — Logging Configuration

Adapted from CVE Intelligence pattern:
- Root logs: cms_all_messages.log, cms_warnings.log, cms_errors.log
- Special logs: per-module dedicated log files (dashboard_queries.log, etc.)
- Rotation settings from config/logger_config.yaml
- Centralized enable/disable per special logger via YAML

File layout:
  contractor-management-system/
  ├── config/
  │   └── logger_config.yaml      ← rotation + special logger control
  ├── backend/
  │   ├── logs/                    ← log files written here
  │   └── app/
  │       └── config/
  │           └── logging_config.py  ← THIS FILE
"""

import logging
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import json
from datetime import datetime, date
from logging.handlers import RotatingFileHandler


# ============================================================================
# ROTATION DEFAULTS (used if logger_config.yaml not found)
# ============================================================================
_DEFAULT_ROOT_MAX_BYTES = 5 * 1024 * 1024       # 5 MB
_DEFAULT_ROOT_BACKUP_COUNT = 3
_DEFAULT_SPECIAL_MAX_BYTES = 5 * 1024 * 1024    # 5 MB
_DEFAULT_SPECIAL_BACKUP_COUNT = 3


class ConditionalFormatter(logging.Formatter):
    """Formatter that can output raw or formatted messages."""

    def format(self, record):
        if getattr(record, 'raw', False):
            return record.getMessage()
        return super().format(record)


class LazyRotatingFileHandler(logging.Handler):
    """
    Defers file creation until first log record is emitted.
    Uses RotatingFileHandler internally for automatic file rotation.

    Solves the import-time problem: setup_special_logging() may be called
    at module level before LOG_DIR is set, but the actual file isn't
    created until the first log message.
    """

    def __init__(self, log_file_name, encoding='utf-8', fresh_start=False,
                 max_bytes=None, backup_count=None):
        super().__init__()
        self.log_file_name = log_file_name
        self.encoding = encoding
        self.fresh_start = fresh_start
        self.max_bytes = max_bytes if max_bytes is not None else _DEFAULT_SPECIAL_MAX_BYTES
        self.backup_count = backup_count if backup_count is not None else _DEFAULT_SPECIAL_BACKUP_COUNT
        self._file_handler = None

    def _ensure_handler(self):
        if self._file_handler is None:
            full_log_dir = get_log_dir()
            os.makedirs(full_log_dir, exist_ok=True)
            filepath = os.path.join(full_log_dir, f"{self.log_file_name}.log")

            if self.fresh_start and os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except PermissionError:
                    print(f"⚠️  Special log file locked: {filepath}")
                except Exception as e:
                    print(f"⚠️  Could not delete special log: {e}")

            self._file_handler = RotatingFileHandler(
                filepath,
                maxBytes=self.max_bytes,
                backupCount=self.backup_count,
                encoding=self.encoding
            )
            self._file_handler.setFormatter(self.formatter)

    def emit(self, record):
        self._ensure_handler()
        self._file_handler.emit(record)

    def close(self):
        if self._file_handler:
            self._file_handler.close()
        super().close()


# ============================================================================
# PATH HELPERS
# ============================================================================

def get_project_root():
    """
    Get the backend/ directory (project root for the Python app).

    This file is at: backend/app/config/logging_config.py
    Project root (backend/) is 2 levels up.
    """
    current_file = Path(__file__).resolve()
    return current_file.parent.parent.parent  # app/config/ → app/ → backend/


def get_repo_root():
    """
    Get the monorepo root (contractor-management-system/).

    This file is at: backend/app/config/logging_config.py
    Repo root is 3 levels up.
    """
    return get_project_root().parent


def get_log_dir():
    """
    Get log directory.

    Priority:
    1. LOG_DIR env var (Docker / production)
    2. Default: backend/logs/ (local development)
    """
    log_dir = os.getenv("LOG_DIR")
    if log_dir:
        return log_dir

    return str(get_project_root() / "logs")


# ============================================================================
# ROTATION SETTINGS (from logger_config.yaml)
# ============================================================================

def _get_rotation_settings() -> dict:
    """
    Get rotation settings from logger_config.yaml.
    Falls back to module-level defaults if YAML not found.
    """
    try:
        import yaml

        # Check CONFIG_DIR env var first (Docker: /config/)
        config_dir = os.getenv("CONFIG_DIR")
        if config_dir:
            config_path = Path(config_dir) / "logger_config.yaml"
        else:
            # Local dev: repo_root/config/logger_config.yaml
            config_path = get_repo_root() / "config" / "logger_config.yaml"

        if not config_path.exists():
            return {
                "root_max_bytes": _DEFAULT_ROOT_MAX_BYTES,
                "root_backup_count": _DEFAULT_ROOT_BACKUP_COUNT,
                "special_max_bytes": _DEFAULT_SPECIAL_MAX_BYTES,
                "special_backup_count": _DEFAULT_SPECIAL_BACKUP_COUNT,
            }

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)

        log_rotation = config.get('log_rotation', {})
        root_conf = log_rotation.get('root', {})
        special_conf = log_rotation.get('special', {})

        return {
            "root_max_bytes": root_conf.get('max_bytes_mb', 5) * 1024 * 1024,
            "root_backup_count": root_conf.get('backup_count', _DEFAULT_ROOT_BACKUP_COUNT),
            "special_max_bytes": special_conf.get('max_bytes_mb', 5) * 1024 * 1024,
            "special_backup_count": special_conf.get('backup_count', _DEFAULT_SPECIAL_BACKUP_COUNT),
        }
    except Exception:
        return {
            "root_max_bytes": _DEFAULT_ROOT_MAX_BYTES,
            "root_backup_count": _DEFAULT_ROOT_BACKUP_COUNT,
            "special_max_bytes": _DEFAULT_SPECIAL_MAX_BYTES,
            "special_backup_count": _DEFAULT_SPECIAL_BACKUP_COUNT,
        }


# ============================================================================
# CENTRALIZED LOGGER CONTROL
# ============================================================================

def _load_logger_config() -> Dict[str, bool]:
    """Load special_loggers section from logger_config.yaml."""
    try:
        import yaml

        config_dir = os.getenv("CONFIG_DIR")
        if config_dir:
            config_path = Path(config_dir) / "logger_config.yaml"
        else:
            config_path = get_repo_root() / "config" / "logger_config.yaml"

        if not config_path.exists():
            return {}

        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            return config.get('special_loggers', {})
    except Exception:
        return {}


def _is_special_logger_enabled(logger_name: str) -> bool:
    """Check if a special logger is enabled in centralized YAML config."""
    config = _load_logger_config()
    return config.get(logger_name, True)  # Default to enabled


# ============================================================================
# MAIN SETUP
# ============================================================================

def setup_logging(
    log_file_name: str = "cms",
    log_dir: str = None,
    console_level: int = logging.INFO,
    enable_console: bool = True,
    fresh_start: bool = False
):
    """
    Setup CMS logging with console + rotating file handlers.

    Creates 3 root log files:
      - cms_all_messages.log  (DEBUG+)
      - cms_warnings.log      (WARNING+)
      - cms_errors.log         (ERROR+)

    Rotation values from config/logger_config.yaml.
    Defaults: 5 MB / 3 backups per root log file.

    Args:
        log_file_name: Base name for log files (default: "cms")
        log_dir: Directory for log files (default: backend/logs/)
        console_level: Logging level for console output
        enable_console: Enable console output
        fresh_start: Delete old logs on startup
    """

    root = logging.getLogger()

    # Avoid duplicate handlers
    if root.hasHandlers():
        root.handlers.clear()

    root.setLevel(logging.INFO)

    # === SILENCE NOISY THIRD-PARTY LOGGERS ===
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('urllib3.connectionpool').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('httpcore.http11').setLevel(logging.WARNING)
    logging.getLogger('httpcore.connection').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('hpack').setLevel(logging.WARNING)
    logging.getLogger('hpack.hpack').setLevel(logging.WARNING)
    logging.getLogger('hpack.table').setLevel(logging.WARNING)
    logging.getLogger('charset_normalizer').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('watchfiles').setLevel(logging.WARNING)
    # Supabase / PostgREST
    logging.getLogger('supabase').setLevel(logging.WARNING)
    logging.getLogger('postgrest').setLevel(logging.WARNING)
    logging.getLogger('gotrue').setLevel(logging.WARNING)
    logging.getLogger('storage3').setLevel(logging.WARNING)
    logging.getLogger('realtime').setLevel(logging.WARNING)
    logging.getLogger('supafunc').setLevel(logging.WARNING)

    # Use ConditionalFormatter for all handlers
    formatter = ConditionalFormatter(
        "[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # ── Console handler ──────────────────────────────────
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(console_level)
        console_handler.setFormatter(formatter)
        try:
            console_handler.stream = open(
                sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1
            )
        except Exception:
            pass  # Fallback to default stream
        root.addHandler(console_handler)

    # ── File handlers ────────────────────────────────────
    if log_dir is None:
        full_log_dir = get_log_dir()
    elif os.path.isabs(log_dir):
        full_log_dir = log_dir
    else:
        full_log_dir = str(get_project_root() / log_dir)

    os.makedirs(full_log_dir, exist_ok=True)

    all_file = os.path.join(full_log_dir, f"{log_file_name}_all_messages.log")
    warn_file = os.path.join(full_log_dir, f"{log_file_name}_warnings.log")
    error_file = os.path.join(full_log_dir, f"{log_file_name}_errors.log")

    # Handle fresh_start
    if fresh_start:
        for log_file in [all_file, warn_file, error_file]:
            if os.path.exists(log_file):
                try:
                    os.remove(log_file)
                except PermissionError:
                    print(f"⚠️  Log file locked: {log_file}")
                except Exception as e:
                    print(f"⚠️  Could not delete {log_file}: {e}")

    # Get rotation values
    rot = _get_rotation_settings()
    max_bytes = rot["root_max_bytes"]
    backup_count = rot["root_backup_count"]

    # File handler 1 — all messages
    all_handler = RotatingFileHandler(
        all_file, maxBytes=max_bytes, backupCount=backup_count, encoding='utf-8'
    )
    all_handler.setLevel(logging.DEBUG)
    all_handler.setFormatter(formatter)
    root.addHandler(all_handler)

    # File handler 2 — warnings only
    warn_handler = RotatingFileHandler(
        warn_file, maxBytes=max_bytes, backupCount=backup_count, encoding='utf-8'
    )
    warn_handler.setLevel(logging.WARNING)
    warn_handler.setFormatter(formatter)
    root.addHandler(warn_handler)

    # File handler 3 — errors only
    error_handler = RotatingFileHandler(
        error_file, maxBytes=max_bytes, backupCount=backup_count, encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root.addHandler(error_handler)

    # Log rotation info
    mb = max_bytes / (1024 * 1024)
    total_mb = mb * (1 + backup_count)
    logging.getLogger(__name__).info(
        f"✅ Log rotation: root files = {mb:.0f} MB × {backup_count} backups "
        f"({total_mb:.0f} MB max per log file)"
    )


def shutdown_logging():
    """Flush and close all logging handlers."""
    logging.shutdown()


def setup_fresh_logging(
    log_file_name: str = "cms",
    log_dir: str = "logs",
    console_level: int = logging.INFO,
    enable_console: bool = True
):
    """Setup fresh logging — deletes old log files first."""
    os.makedirs(log_dir, exist_ok=True)
    setup_logging(
        log_file_name=log_file_name,
        log_dir=log_dir,
        console_level=console_level,
        enable_console=enable_console,
        fresh_start=True
    )


# ============================================================================
# RAW LOGGING HELPERS
# ============================================================================

def log_raw(message, level=logging.INFO):
    """Log a raw (unformatted) message."""
    logger = logging.getLogger()
    safe_message = str(message).encode('utf-8', errors='replace').decode('utf-8')
    logger.log(level, safe_message, extra={'raw': True})


def log_debug_raw(message):
    log_raw(message, logging.DEBUG)


def log_info_raw(message):
    log_raw(message, logging.INFO)


def log_warning_raw(message):
    log_raw(message, logging.WARNING)


def log_error_raw(message):
    log_raw(message, logging.ERROR)


# ============================================================================
# JSON SERIALIZATION HELPER
# ============================================================================

def json_serializer(obj: Any) -> str:
    """Handle non-serializable objects for JSON logging."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    elif hasattr(obj, '__dict__'):
        return str(obj)
    return str(obj)


# ============================================================================
# JSON LOGGING HELPERS
# ============================================================================

def log_json_raw(
    data: Dict[str, Any],
    label: Optional[str] = None,
    indent: int = 2,
    level: int = logging.INFO,
    include_borders: bool = True
):
    """
    Log a dictionary/object as formatted JSON.

    Args:
        data: Dictionary or object to log
        label: Optional label to print before JSON
        indent: JSON indentation (default: 2)
        level: Logging level (default: INFO)
        include_borders: Whether to include separator lines
    """
    try:
        json_str = json.dumps(data, indent=indent, default=json_serializer, ensure_ascii=False)

        if include_borders:
            log_raw("=" * 70, level)

        if label:
            log_raw(f"📋 {label}", level)
            if include_borders:
                log_raw("=" * 70, level)

        log_raw(json_str, level)

        if include_borders:
            log_raw("=" * 70, level)

    except Exception as e:
        log_raw(f"❌ Error serializing JSON: {e}", logging.ERROR)
        log_raw(f"Data: {str(data)[:500]}...", logging.ERROR)


def log_json_compact(
    data: Dict[str, Any],
    label: Optional[str] = None,
    level: int = logging.INFO
):
    """Log a dictionary as compact JSON (no indentation)."""
    try:
        json_str = json.dumps(data, default=json_serializer, ensure_ascii=False)
        if label:
            log_raw(f"{label}: {json_str}", level)
        else:
            log_raw(json_str, level)
    except Exception as e:
        log_raw(f"❌ Error serializing JSON: {e}", logging.ERROR)


# ============================================================================
# SPECIAL LOGGING (per-module dedicated log files)
# ============================================================================

def setup_special_logging(
    log_file_name: str = "special_log_file",
    logger_name: Optional[str] = None,
    fresh_start: bool = False
):
    """
    Setup dedicated logger for monitoring specific activities.

    Uses RotatingFileHandler with rotation values from logger_config.yaml.
    Defaults: 5 MB / 3 backups per special log file.

    Args:
        log_file_name: Name of the log file (without extension)
        logger_name: Unique logger name (defaults to special.{log_file_name})
        fresh_start: If True, delete existing log file

    Returns:
        Logger instance

    Example:
        logger = setup_special_logging("dashboard_queries")
        log_special_raw("Query took 45ms", logger_name="special.dashboard_queries")
    """
    if logger_name is None:
        logger_name = f"special.{log_file_name}"

    special_logger = logging.getLogger(logger_name)

    # Skip if already configured (idempotent)
    if special_logger.hasHandlers():
        return special_logger

    special_logger.setLevel(logging.INFO)
    special_logger.propagate = False  # Don't send to root logger

    formatter = ConditionalFormatter(
        "[%(asctime)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Get rotation values from logger_config.yaml
    rot = _get_rotation_settings()

    special_handler = LazyRotatingFileHandler(
        log_file_name,
        encoding='utf-8',
        fresh_start=fresh_start,
        max_bytes=rot["special_max_bytes"],
        backup_count=rot["special_backup_count"]
    )
    special_handler.setLevel(logging.INFO)
    special_handler.setFormatter(formatter)
    special_logger.addHandler(special_handler)

    return special_logger


def log_special_raw(
    message,
    logger_name: str = "special.special_log_file",
    include_borders: bool = False
):
    """
    Log raw message to dedicated special log (CHECKS CENTRALIZED CONFIG).

    Args:
        message: Message to log
        logger_name: Name of the logger (must match setup_special_logging call)
        include_borders: Whether to include separator lines

    Example:
        log_special_raw("Dashboard loaded in 120ms", logger_name="special.dashboard_queries")
    """
    clean_name = logger_name.replace("special.", "")

    if not _is_special_logger_enabled(clean_name):
        return

    logger = logging.getLogger(logger_name)
    safe_message = str(message).encode('utf-8', errors='replace').decode('utf-8')

    if include_borders:
        logger.info("=" * 70, extra={'raw': True})

    logger.info(safe_message, extra={'raw': True})

    if include_borders:
        logger.info("=" * 70, extra={'raw': True})


def log_special_json(
    data: Dict[str, Any],
    logger_name: str = "special.special_log_file",
    label: Optional[str] = None,
    indent: int = 2,
    include_borders: bool = True
):
    """
    Log JSON to a special logger (CHECKS CENTRALIZED CONFIG).

    Args:
        data: Dictionary to log
        logger_name: Name of special logger
        label: Optional label
        indent: JSON indentation
        include_borders: Whether to include separator lines

    Example:
        log_special_json(dashboard_data, logger_name="special.dashboard_queries", label="API Response")
    """
    clean_name = logger_name.replace("special.", "")

    if not _is_special_logger_enabled(clean_name):
        return

    logger = logging.getLogger(logger_name)

    try:
        json_str = json.dumps(data, indent=indent, default=json_serializer, ensure_ascii=False)
        safe_json = json_str.encode('utf-8', errors='replace').decode('utf-8')

        if include_borders:
            logger.info("=" * 70, extra={'raw': True})

        if label:
            logger.info(f"📋 {label}", extra={'raw': True})
            if include_borders:
                logger.info("=" * 70, extra={'raw': True})

        logger.info(safe_json, extra={'raw': True})

        if include_borders:
            logger.info("=" * 70, extra={'raw': True})

    except Exception as e:
        logger.error(f"❌ Error serializing JSON: {e}", extra={'raw': True})
        logger.error(f"Data: {str(data)[:500]}...", extra={'raw': True})
