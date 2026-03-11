"""
Pydantic Models — Contractor Worker

Self-identified workers within a contractor company.
Created on first QR access (one-time self-identification).
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Request Models ────────────────────────────────────

class WorkerSelfIdentify(BaseModel):
    """Worker self-identification on first access."""
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None


# ── Response Models ───────────────────────────────────

class WorkerResponse(BaseModel):
    id: str
    contractor_id: str
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    first_seen_at: datetime
    last_active_at: datetime

class WorkerActivity(BaseModel):
    """Worker activity summary for dashboard."""
    worker_id: str
    worker_name: str
    total_checkins: int = 0
    total_photos: int = 0
    total_messages: int = 0
    last_checkin_at: Optional[datetime] = None
    workgroups_accessed: int = 0
