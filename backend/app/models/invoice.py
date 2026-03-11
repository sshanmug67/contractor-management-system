"""
Pydantic Models — Invoice

Invoices belong to a Workgroup, contain line items referencing Jobs.
Multiple invoices per workgroup allowed (invoice as you go).
Each job can appear on only ONE invoice (no double-billing).
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    AI_VALIDATED = "ai_validated"
    AI_FLAGGED = "ai_flagged"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


# ── Line Items ────────────────────────────────────────

class InvoiceLineItem(BaseModel):
    """A single line item on an invoice, referencing a Job."""
    job_id: str
    job_title: str
    amount: Decimal = Field(..., ge=0, decimal_places=2)
    description: Optional[str] = None


# ── Request Models ────────────────────────────────────

class InvoiceCreate(BaseModel):
    workgroup_id: str
    invoice_number: str
    line_items: list[InvoiceLineItem]
    file_url: Optional[str] = None      # optional PDF upload

class InvoiceApproval(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|query)$")
    reason: Optional[str] = None        # required for reject/query


# ── Response Models ───────────────────────────────────

class InvoiceResponse(BaseModel):
    id: str
    workgroup_id: str
    contractor_id: str
    submitted_by_worker: Optional[str] = None
    invoice_number: str
    amount: Decimal
    line_items: list[InvoiceLineItem] = []
    status: InvoiceStatus
    ai_validated: bool = False
    ai_flags: list = []
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    file_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class InvoiceValidationResult(BaseModel):
    """Result of AI invoice validation (10-point checklist)."""
    is_valid: bool
    checks: list[dict] = []             # { check: str, passed: bool, detail: str }
    flags: list[str] = []
    recommendation: str = ""            # "route_to_approval" | "flag_for_review"
