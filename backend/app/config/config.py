"""
CMS Backend — Application Configuration

Modern approach matching CVE Intelligence pattern:
- Single defaults.yaml for structure and safe defaults (committed to git)
- All environment-specific config via environment variables
- No secrets in config files
- Cloud-native and container-friendly

Priority: Environment Variables > defaults.yaml > Hardcoded defaults
"""

import os
import yaml
import logging
from typing import Optional, List
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger(__name__)


class Settings:
    """CMS application configuration."""

    def __init__(self):
        """Initialize with hardcoded defaults (lowest priority)."""

        # ── App ───────────────────────────────────────
        self.app_env: str = "development"
        self.app_debug: bool = True
        self.log_level: str = "info"
        self.app_host: str = "0.0.0.0"
        self.app_port: int = 8000

        # ── Supabase (REQUIRED — from env) ────────────
        self.supabase_url: str = ""
        self.supabase_publishable_key: str = ""  # used for all Supabase operations
        self.supabase_service_role_key: str = ""  # backend / bypasses RLS

        # ── Claude AI Agent ───────────────────────────
        self.ai_agent_enabled: bool = True
        self.ai_agent_model: str = "claude-sonnet-4-20250514"
        self.claude_api_key: str = ""
        self.ai_agent_max_tokens: int = 4096
        self.ai_agent_temperature: float = 0.3
        self.ai_auto_reminders: bool = True
        self.ai_auto_allocation: bool = False
        self.ai_document_ocr: bool = True
        self.ai_anomaly_detection: bool = True

        # ── Authentication ────────────────────────────
        self.qr_token_secret: str = "change-me-in-production"
        self.qr_base_url: str = "http://localhost:5173/wg"
        self.qr_token_expiry_hours: int = 720
        self.session_timeout_minutes: int = 480
        self.refresh_token_days: int = 30

        # ── Notifications ─────────────────────────────
        self.notifications_enabled: bool = False
        self.twilio_account_sid: str = ""
        self.twilio_auth_token: str = ""
        self.twilio_phone_number: str = ""
        self.email_provider: str = "ses"
        self.email_from: str = "noreply@cms.app"

        # ── AWS ───────────────────────────────────────
        self.aws_region: str = "us-east-1"
        self.aws_access_key_id: str = ""
        self.aws_secret_access_key: str = ""
        self.s3_bucket: str = "cms-uploads"
        self.s3_presigned_expiry_seconds: int = 3600

        # ── Background Workers ────────────────────────
        self.reminder_enabled: bool = True
        self.reminder_check_interval_seconds: int = 3600
        self.no_response_reminder_hours: int = 24
        self.no_response_escalation_hours: int = 48
        self.progress_recalc_enabled: bool = True
        self.progress_recalc_interval_seconds: int = 300
        self.overdue_check_enabled: bool = True
        self.overdue_check_interval_seconds: int = 3600

        # ── Business Rules ────────────────────────────
        self.default_geo_fence_radius_m: int = 200
        self.gps_check_tolerance_m: int = 50
        self.invoice_variance_threshold_pct: float = 10.0
        self.invoice_auto_approve_below: float = 500.00
        self.allocation_weight_skill: float = 0.30
        self.allocation_weight_performance: float = 0.25
        self.allocation_weight_availability: float = 0.20
        self.allocation_weight_proximity: float = 0.15
        self.allocation_weight_pricing: float = 0.10

        # ── Redis ─────────────────────────────────────
        self.redis_url: str = "redis://localhost:6379/0"

        # ── CORS ──────────────────────────────────────
        self.cors_allowed_origins: List[str] = [
            "http://localhost:5173",
            "http://localhost:3000",
        ]

        logger.info("✅ Settings: Initialized with hardcoded defaults.")

    # ─────────────────────────────────────────────────────────
    # LOADING
    # ─────────────────────────────────────────────────────────

    @classmethod
    def load(cls, defaults_file: str = "config/defaults.yaml") -> "Settings":
        """
        Load configuration with priority order:

        1. Environment Variables (HIGHEST)
        2. defaults.yaml (structure + safe defaults)
        3. Hardcoded defaults (fallback)
        """
        settings = cls()

        # Step 1: Load from YAML — check project root first, then local
        yaml_loaded = False
        for yaml_path in [f"../{defaults_file}", defaults_file]:
            if Path(yaml_path).exists():
                settings._load_defaults_yaml(yaml_path)
                yaml_loaded = True
                break
        if not yaml_loaded:
            logger.warning(f"⚠️  defaults.yaml not found — using hardcoded defaults")

        # Step 2: Override with environment variables
        settings._load_from_environment()

        # Step 3: Validate
        if not settings.validate():
            raise ValueError("Invalid configuration — see log for details")

        return settings

    def _load_defaults_yaml(self, filepath: str):
        """Load defaults from YAML file (committed to git)."""
        config_file = Path(filepath)

        if not config_file.exists():
            logger.warning(f"⚠️  Defaults file not found: {filepath}")
            logger.info("Using hardcoded defaults")
            return

        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if not data:
                logger.warning(f"⚠️  Defaults file is empty: {filepath}")
                return

            # ── App ───────────────────────────────────
            if "app" in data:
                app = data["app"]
                self.app_env = app.get("env", self.app_env)
                self.app_debug = app.get("debug", self.app_debug)
                self.log_level = app.get("log_level", self.log_level)
                self.app_host = app.get("host", self.app_host)
                self.app_port = app.get("port", self.app_port)

            # ── Supabase ──────────────────────────────
            if "supabase" in data:
                sb = data["supabase"]
                self.supabase_url = sb.get("url", self.supabase_url)
                self.supabase_publishable_key = sb.get("publishable_key", self.supabase_publishable_key)

            # ── AI Agent ──────────────────────────────
            if "ai_agent" in data:
                ai = data["ai_agent"]
                self.ai_agent_enabled = ai.get("enabled", self.ai_agent_enabled)
                self.ai_agent_model = ai.get("model", self.ai_agent_model)
                self.claude_api_key = ai.get("api_key", self.claude_api_key)
                self.ai_agent_max_tokens = ai.get("max_tokens", self.ai_agent_max_tokens)
                self.ai_agent_temperature = ai.get("temperature", self.ai_agent_temperature)
                self.ai_auto_reminders = ai.get("auto_reminders", self.ai_auto_reminders)
                self.ai_auto_allocation = ai.get("auto_allocation", self.ai_auto_allocation)
                self.ai_document_ocr = ai.get("document_ocr", self.ai_document_ocr)
                self.ai_anomaly_detection = ai.get("anomaly_detection", self.ai_anomaly_detection)

            # ── Auth ──────────────────────────────────
            if "auth" in data:
                auth = data["auth"]
                self.qr_token_secret = auth.get("qr_token_secret", self.qr_token_secret)
                self.qr_base_url = auth.get("qr_base_url", self.qr_base_url)
                self.qr_token_expiry_hours = auth.get("qr_token_expiry_hours", self.qr_token_expiry_hours)
                self.session_timeout_minutes = auth.get("session_timeout_minutes", self.session_timeout_minutes)
                self.refresh_token_days = auth.get("refresh_token_days", self.refresh_token_days)

            # ── Notifications ─────────────────────────
            if "notifications" in data:
                notif = data["notifications"]
                self.notifications_enabled = notif.get("enabled", self.notifications_enabled)
                self.twilio_account_sid = notif.get("twilio_account_sid", self.twilio_account_sid)
                self.twilio_auth_token = notif.get("twilio_auth_token", self.twilio_auth_token)
                self.twilio_phone_number = notif.get("twilio_phone_number", self.twilio_phone_number)
                self.email_provider = notif.get("email_provider", self.email_provider)
                self.email_from = notif.get("email_from", self.email_from)

            # ── AWS ───────────────────────────────────
            if "aws" in data:
                aws = data["aws"]
                self.aws_region = aws.get("region", self.aws_region)
                self.s3_bucket = aws.get("s3_bucket", self.s3_bucket)
                self.s3_presigned_expiry_seconds = aws.get("s3_presigned_expiry_seconds", self.s3_presigned_expiry_seconds)

            # ── Workers ───────────────────────────────
            if "workers" in data:
                w = data["workers"]
                self.reminder_enabled = w.get("reminder_enabled", self.reminder_enabled)
                self.reminder_check_interval_seconds = w.get("reminder_check_interval_seconds", self.reminder_check_interval_seconds)
                self.no_response_reminder_hours = w.get("no_response_reminder_hours", self.no_response_reminder_hours)
                self.no_response_escalation_hours = w.get("no_response_escalation_hours", self.no_response_escalation_hours)
                self.progress_recalc_enabled = w.get("progress_recalc_enabled", self.progress_recalc_enabled)
                self.progress_recalc_interval_seconds = w.get("progress_recalc_interval_seconds", self.progress_recalc_interval_seconds)
                self.overdue_check_enabled = w.get("overdue_check_enabled", self.overdue_check_enabled)
                self.overdue_check_interval_seconds = w.get("overdue_check_interval_seconds", self.overdue_check_interval_seconds)

            # ── Business Rules ────────────────────────
            if "business" in data:
                biz = data["business"]
                self.default_geo_fence_radius_m = biz.get("default_geo_fence_radius_m", self.default_geo_fence_radius_m)
                self.gps_check_tolerance_m = biz.get("gps_check_tolerance_m", self.gps_check_tolerance_m)
                self.invoice_variance_threshold_pct = float(biz.get("invoice_variance_threshold_pct", self.invoice_variance_threshold_pct))
                self.invoice_auto_approve_below = float(biz.get("invoice_auto_approve_below", self.invoice_auto_approve_below))
                self.allocation_weight_skill = float(biz.get("allocation_weight_skill", self.allocation_weight_skill))
                self.allocation_weight_performance = float(biz.get("allocation_weight_performance", self.allocation_weight_performance))
                self.allocation_weight_availability = float(biz.get("allocation_weight_availability", self.allocation_weight_availability))
                self.allocation_weight_proximity = float(biz.get("allocation_weight_proximity", self.allocation_weight_proximity))
                self.allocation_weight_pricing = float(biz.get("allocation_weight_pricing", self.allocation_weight_pricing))

            # ── Redis ─────────────────────────────────
            if "redis" in data:
                self.redis_url = data["redis"].get("url", self.redis_url)

            # ── CORS ──────────────────────────────────
            if "cors" in data:
                origins = data["cors"].get("allowed_origins")
                if origins and isinstance(origins, list):
                    self.cors_allowed_origins = origins

            logger.info(f"✅ Settings: Loaded defaults from {filepath}")

        except Exception as e:
            logger.error(f"❌ Error loading defaults YAML: {e}")
            logger.info("Using hardcoded defaults")

    def _load_from_environment(self):
        """Load configuration from environment variables (highest priority)."""

        # ── App ───────────────────────────────────────
        if os.getenv("APP_ENV"):
            self.app_env = os.getenv("APP_ENV")
        if os.getenv("APP_DEBUG"):
            self.app_debug = os.getenv("APP_DEBUG").lower() == "true"
        if os.getenv("LOG_LEVEL"):
            self.log_level = os.getenv("LOG_LEVEL")
        if os.getenv("APP_HOST"):
            self.app_host = os.getenv("APP_HOST")
        if os.getenv("APP_PORT"):
            self.app_port = int(os.getenv("APP_PORT"))

        # ── Supabase (REQUIRED) ───────────────────────
        if os.getenv("SUPABASE_URL"):
            self.supabase_url = os.getenv("SUPABASE_URL")
            logger.info("✓ SUPABASE_URL: Set")
        if os.getenv("SUPABASE_PUBLISHABLE_KEY"):
            self.supabase_publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
            logger.info("✓ SUPABASE_PUBLISHABLE_KEY: Set")
        if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            logger.info("✓ SUPABASE_SERVICE_ROLE_KEY: Set")

        # ── Claude AI ─────────────────────────────────
        if os.getenv("CLAUDE_API_KEY"):
            self.claude_api_key = os.getenv("CLAUDE_API_KEY")
            logger.info("✓ CLAUDE_API_KEY: Set")
        if os.getenv("AI_AGENT_ENABLED"):
            self.ai_agent_enabled = os.getenv("AI_AGENT_ENABLED").lower() == "true"
        if os.getenv("AI_AGENT_MODEL"):
            self.ai_agent_model = os.getenv("AI_AGENT_MODEL")
        if os.getenv("AI_AGENT_MAX_TOKENS"):
            self.ai_agent_max_tokens = int(os.getenv("AI_AGENT_MAX_TOKENS"))
        if os.getenv("AI_AGENT_TEMPERATURE"):
            self.ai_agent_temperature = float(os.getenv("AI_AGENT_TEMPERATURE"))

        # ── Auth ──────────────────────────────────────
        if os.getenv("QR_TOKEN_SECRET"):
            self.qr_token_secret = os.getenv("QR_TOKEN_SECRET")
            logger.info("✓ QR_TOKEN_SECRET: Set")
        if os.getenv("QR_BASE_URL"):
            self.qr_base_url = os.getenv("QR_BASE_URL")
        if os.getenv("QR_TOKEN_EXPIRY_HOURS"):
            self.qr_token_expiry_hours = int(os.getenv("QR_TOKEN_EXPIRY_HOURS"))
        if os.getenv("SESSION_TIMEOUT_MINUTES"):
            self.session_timeout_minutes = int(os.getenv("SESSION_TIMEOUT_MINUTES"))

        # ── Notifications ─────────────────────────────
        if os.getenv("NOTIFICATIONS_ENABLED"):
            self.notifications_enabled = os.getenv("NOTIFICATIONS_ENABLED").lower() == "true"
        if os.getenv("TWILIO_ACCOUNT_SID"):
            self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            logger.info("✓ TWILIO_ACCOUNT_SID: Set")
        if os.getenv("TWILIO_AUTH_TOKEN"):
            self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            logger.info("✓ TWILIO_AUTH_TOKEN: Set")
        if os.getenv("TWILIO_PHONE_NUMBER"):
            self.twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")

        # ── AWS ───────────────────────────────────────
        if os.getenv("AWS_REGION"):
            self.aws_region = os.getenv("AWS_REGION")
        if os.getenv("AWS_ACCESS_KEY_ID"):
            self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
            logger.info("✓ AWS_ACCESS_KEY_ID: Set")
        if os.getenv("AWS_SECRET_ACCESS_KEY"):
            self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            logger.info("✓ AWS_SECRET_ACCESS_KEY: Set")
        if os.getenv("S3_BUCKET"):
            self.s3_bucket = os.getenv("S3_BUCKET")
        if os.getenv("S3_PRESIGNED_EXPIRY_SECONDS"):
            self.s3_presigned_expiry_seconds = int(os.getenv("S3_PRESIGNED_EXPIRY_SECONDS"))

        # ── Workers ───────────────────────────────────
        if os.getenv("REMINDER_ENABLED"):
            self.reminder_enabled = os.getenv("REMINDER_ENABLED").lower() == "true"
        if os.getenv("NO_RESPONSE_REMINDER_HOURS"):
            self.no_response_reminder_hours = int(os.getenv("NO_RESPONSE_REMINDER_HOURS"))
        if os.getenv("NO_RESPONSE_ESCALATION_HOURS"):
            self.no_response_escalation_hours = int(os.getenv("NO_RESPONSE_ESCALATION_HOURS"))
        if os.getenv("PROGRESS_RECALC_ENABLED"):
            self.progress_recalc_enabled = os.getenv("PROGRESS_RECALC_ENABLED").lower() == "true"
        if os.getenv("OVERDUE_CHECK_ENABLED"):
            self.overdue_check_enabled = os.getenv("OVERDUE_CHECK_ENABLED").lower() == "true"

        # ── Business Rules ────────────────────────────
        if os.getenv("DEFAULT_GEO_FENCE_RADIUS_M"):
            self.default_geo_fence_radius_m = int(os.getenv("DEFAULT_GEO_FENCE_RADIUS_M"))
        if os.getenv("INVOICE_VARIANCE_THRESHOLD_PCT"):
            self.invoice_variance_threshold_pct = float(os.getenv("INVOICE_VARIANCE_THRESHOLD_PCT"))
        if os.getenv("INVOICE_AUTO_APPROVE_BELOW"):
            self.invoice_auto_approve_below = float(os.getenv("INVOICE_AUTO_APPROVE_BELOW"))

        # ── Redis ─────────────────────────────────────
        if os.getenv("REDIS_URL"):
            self.redis_url = os.getenv("REDIS_URL")
            logger.info("✓ REDIS_URL: Set")

        # ── CORS ──────────────────────────────────────
        if os.getenv("CORS_ALLOWED_ORIGINS"):
            origins = os.getenv("CORS_ALLOWED_ORIGINS").split(",")
            self.cors_allowed_origins = [o.strip() for o in origins if o.strip()]

        logger.info("✅ Settings: Loaded overrides from environment variables.")

    # ─────────────────────────────────────────────────────────
    # VALIDATION
    # ─────────────────────────────────────────────────────────

    def validate(self) -> bool:
        """Validate configuration. Returns True if valid."""
        errors = []

        # ── Critical: Supabase ────────────────────────
        if not self.supabase_url:
            errors.append("SUPABASE_URL is REQUIRED")
        elif not self.supabase_url.startswith("http"):
            errors.append("SUPABASE_URL must be a valid HTTP/HTTPS URL")

        if not self.supabase_publishable_key:
            errors.append("SUPABASE_PUBLISHABLE_KEY is REQUIRED")

        if not self.supabase_service_role_key:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is REQUIRED (backend bypasses RLS)")
            
        # ── Warning: AI key ───────────────────────────
        if not self.claude_api_key:
            logger.warning("⚠️  CLAUDE_API_KEY not set — AI agent features will be disabled")

        # ── Auth ──────────────────────────────────────
        if self.qr_token_secret == "change-me-in-production" and self.app_env != "development":
            errors.append("QR_TOKEN_SECRET must be changed in non-development environments")

        if self.session_timeout_minutes < 5:
            errors.append("SESSION_TIMEOUT_MINUTES must be at least 5")

        # ── Workers ───────────────────────────────────
        if self.no_response_reminder_hours < 1:
            errors.append("NO_RESPONSE_REMINDER_HOURS must be at least 1")

        if self.no_response_escalation_hours <= self.no_response_reminder_hours:
            errors.append("NO_RESPONSE_ESCALATION_HOURS must be greater than NO_RESPONSE_REMINDER_HOURS")

        if self.progress_recalc_interval_seconds < 30:
            errors.append("PROGRESS_RECALC_INTERVAL_SECONDS must be at least 30")

        # ── Business Rules ────────────────────────────
        if self.default_geo_fence_radius_m < 50:
            errors.append("DEFAULT_GEO_FENCE_RADIUS_M must be at least 50")

        if self.invoice_variance_threshold_pct < 0 or self.invoice_variance_threshold_pct > 100:
            errors.append("INVOICE_VARIANCE_THRESHOLD_PCT must be between 0 and 100")

        weights = (
            self.allocation_weight_skill
            + self.allocation_weight_performance
            + self.allocation_weight_availability
            + self.allocation_weight_proximity
            + self.allocation_weight_pricing
        )
        if abs(weights - 1.0) > 0.01:
            errors.append(f"Allocation weights must sum to 1.0 (currently {weights:.2f})")

        # ── Report errors ─────────────────────────────
        if errors:
            logger.error("\n❌ Configuration Errors:")
            for error in errors:
                logger.error(f"   - {error}")
            return False

        logger.info("✅ Settings: Validation passed.")
        return True

    # ─────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────

    def print_summary(self):
        """Print configuration summary to logs."""
        lines = [
            "",
            "=" * 60,
            "CMS CONFIGURATION SUMMARY",
            "=" * 60,
            f"",
            f"Environment: {self.app_env}",
            f"Debug: {self.app_debug}",
            f"Host: {self.app_host}:{self.app_port}",
            f"",
            f"Supabase:",
            f"  URL: {'✅ Set' if self.supabase_url else '❌ MISSING'}",
            f"  Publishable Key: {'✅ Set' if self.supabase_publishable_key else '❌ MISSING'}",
            f"",
            f"AI Agent:",
            f"  Status: {'✅ Enabled' if self.ai_agent_enabled else '❌ Disabled'}",
            f"  Model: {self.ai_agent_model}",
            f"  API Key: {'✅ Set' if self.claude_api_key else '⚠️  Not set (agent disabled)'}",
            f"  Auto Reminders: {'✅' if self.ai_auto_reminders else '❌'}",
            f"  Auto Allocation: {'✅' if self.ai_auto_allocation else '❌'}",
            f"  Document OCR: {'✅' if self.ai_document_ocr else '❌'}",
            f"  Anomaly Detection: {'✅' if self.ai_anomaly_detection else '❌'}",
            f"",
            f"Auth:",
            f"  QR Secret: {'✅ Custom' if self.qr_token_secret != 'change-me-in-production' else '⚠️  Default (dev only)'}",
            f"  QR Expiry: {self.qr_token_expiry_hours}h ({self.qr_token_expiry_hours // 24}d)",
            f"  Session Timeout: {self.session_timeout_minutes}min",
            f"",
            f"Notifications:",
            f"  Status: {'✅ Enabled' if self.notifications_enabled else '❌ Disabled'}",
            f"  Twilio: {'✅ Set' if self.twilio_account_sid else '❌ Not configured'}",
            f"",
            f"AWS:",
            f"  Region: {self.aws_region}",
            f"  S3 Bucket: {self.s3_bucket}",
            f"  Credentials: {'✅ Set' if self.aws_access_key_id else '⚠️  Not set'}",
            f"",
            f"Background Workers:",
            f"  Reminders: {'✅ Enabled' if self.reminder_enabled else '❌ Disabled'} (check every {self.reminder_check_interval_seconds}s)",
            f"  No-Response: Remind at {self.no_response_reminder_hours}h, Escalate at {self.no_response_escalation_hours}h",
            f"  Progress Recalc: {'✅ Enabled' if self.progress_recalc_enabled else '❌ Disabled'} (every {self.progress_recalc_interval_seconds}s)",
            f"  Overdue Check: {'✅ Enabled' if self.overdue_check_enabled else '❌ Disabled'} (every {self.overdue_check_interval_seconds}s)",
            f"",
            f"Business Rules:",
            f"  Geo-Fence Radius: {self.default_geo_fence_radius_m}m",
            f"  Invoice Variance: {self.invoice_variance_threshold_pct}%",
            f"  Auto-Approve Below: ${self.invoice_auto_approve_below:,.2f}",
            f"  Allocation Weights: Skill={self.allocation_weight_skill} Perf={self.allocation_weight_performance} Avail={self.allocation_weight_availability} Prox={self.allocation_weight_proximity} Price={self.allocation_weight_pricing}",
            f"",
            f"Redis: {self.redis_url}",
            f"CORS Origins: {', '.join(self.cors_allowed_origins)}",
            f"",
            "=" * 60,
            "",
        ]
        for line in lines:
            logger.info(line)

    # ─────────────────────────────────────────────────────────
    # EXPORT
    # ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        """Export configuration as dictionary (safe — no secrets)."""
        return {
            "app": {
                "env": self.app_env,
                "debug": self.app_debug,
                "log_level": self.log_level,
                "host": self.app_host,
                "port": self.app_port,
            },
            "supabase": {
                "url_set": bool(self.supabase_url),
                "publishable_key_set": bool(self.supabase_publishable_key),
            },
            "ai_agent": {
                "enabled": self.ai_agent_enabled,
                "model": self.ai_agent_model,
                "api_key_set": bool(self.claude_api_key),
                "auto_reminders": self.ai_auto_reminders,
                "auto_allocation": self.ai_auto_allocation,
                "document_ocr": self.ai_document_ocr,
                "anomaly_detection": self.ai_anomaly_detection,
            },
            "auth": {
                "qr_expiry_hours": self.qr_token_expiry_hours,
                "session_timeout_minutes": self.session_timeout_minutes,
            },
            "notifications": {
                "enabled": self.notifications_enabled,
                "twilio_configured": bool(self.twilio_account_sid),
            },
            "aws": {
                "region": self.aws_region,
                "s3_bucket": self.s3_bucket,
                "credentials_set": bool(self.aws_access_key_id),
            },
            "workers": {
                "reminders": self.reminder_enabled,
                "progress_recalc": self.progress_recalc_enabled,
                "overdue_check": self.overdue_check_enabled,
            },
            "business": {
                "geo_fence_radius_m": self.default_geo_fence_radius_m,
                "invoice_variance_pct": self.invoice_variance_threshold_pct,
                "invoice_auto_approve_below": self.invoice_auto_approve_below,
            },
        }


# ─────────────────────────────────────────────────────────
# SINGLETON + LOADER
# ─────────────────────────────────────────────────────────

@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton. Call this from dependencies."""
    # Load .env from project root (one level up from backend/)
    for env_path in [Path("../.env"), Path(".env")]:
        if env_path.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path)
                logger.info(f"✅ Loaded {env_path.resolve()}")
            except ImportError:
                logger.warning("⚠️  python-dotenv not installed — pip install python-dotenv")
            break

    settings = Settings.load()
    settings.print_summary()
    return settings


# ─────────────────────────────────────────────────────────
# STANDALONE TEST
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    """Test configuration loading."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )

    print("\n" + "=" * 60)
    print("TESTING CMS CONFIGURATION SYSTEM")
    print("=" * 60)

    try:
        settings = get_settings()
        print("\n✅ Configuration loaded successfully!")
        print(f"   Environment: {settings.app_env}")
        print(f"   Supabase: {'Connected' if settings.supabase_url else 'Not configured'}")
        print(f"   AI Agent: {'Enabled' if settings.ai_agent_enabled and settings.claude_api_key else 'Disabled'}")

    except ValueError as e:
        print(f"\n❌ Configuration validation failed!")
        print(f"   {e}")
        print("\nRequired environment variables (in project root .env):")
        print("   SUPABASE_URL=https://your-project.supabase.co")
        print("   SUPABASE_PUBLISHABLE_KEY=your_publishable_key")
        print("   CLAUDE_API_KEY=your_claude_key  (optional)")
