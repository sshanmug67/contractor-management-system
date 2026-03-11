"""
CMS Backend — Application Configuration

Loads settings from environment variables / .env file.
All secrets are injected via env vars (AWS Secrets Manager in prod).
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ───────────────────────────────────
    app_env: str = "development"
    app_debug: bool = True
    log_level: str = "info"

    # ── Supabase ──────────────────────────────
    supabase_url: str
    supabase_key: str               # anon key (client-facing)
    supabase_service_key: str       # service role key (backend-only)

    # ── Claude AI ─────────────────────────────
    claude_api_key: str = ""

    # ── AWS ───────────────────────────────────
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # ── Notifications ─────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # ── QR / Auth ─────────────────────────────
    qr_token_secret: str = "change-me"
    qr_base_url: str = "https://app.cms.com/wg"

    # ── Redis / Celery ────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Business Defaults ─────────────────────
    default_geo_fence_radius_m: int = 200
    invoice_variance_threshold_pct: float = 10.0
    no_response_reminder_hours: int = 24
    no_response_escalation_hours: int = 48

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
