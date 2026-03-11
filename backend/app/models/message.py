"""
Pydantic Models — Messages & Uploads

Messages are per Workgroup (contractor ↔ business owner/employee).
Uploads can be per Job or per Workgroup, with geo-tag verification.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class SenderType(str, Enum):
    OWNER = "owner"
    EMPLOYEE = "employee"
    WORKER = "worker"
    AI = "ai"


class MessageType(str, Enum):
    TEXT = "text"
    PHOTO = "photo"
    FILE = "file"
    INVOICE = "invoice"
    SYSTEM = "system"


# ── Message Models ────────────────────────────────────

class MessageCreate(BaseModel):
    workgroup_id: str
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT

class MessageResponse(BaseModel):
    id: str
    workgroup_id: str
    sender_id: str
    sender_type: SenderType
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None       # denormalized for display
    content: Optional[str] = None
    message_type: MessageType
    ai_summary: Optional[str] = None
    created_at: datetime


# ── Upload Models ─────────────────────────────────────

class UploadCreate(BaseModel):
    workgroup_id: str
    job_id: Optional[str] = None            # optional — can be workgroup-level
    file_type: Optional[str] = None
    geo_latitude: Optional[Decimal] = Field(None, decimal_places=7)
    geo_longitude: Optional[Decimal] = Field(None, decimal_places=7)

class UploadResponse(BaseModel):
    id: str
    workgroup_id: str
    job_id: Optional[str] = None
    uploaded_by: str
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    file_url: str
    file_type: Optional[str] = None
    ai_analysis: Optional[dict] = None
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None
    geo_verified: Optional[bool] = None
    created_at: datetime
