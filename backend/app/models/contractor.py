"""
Pydantic Models — Contractor

Contractor companies with shared credentials (phone + email).
Skills, ratings, verification status, and performance tracking.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    PENDING = "pending"
    FLAGGED = "flagged"


# ── Request Models ────────────────────────────────────

class ContractorCreate(BaseModel):
    company_name: str
    owner_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    email: str                          # shared credential
    phone: str                          # shared credential
    license_number: Optional[str] = None
    insurance_info: Optional[dict] = None
    skills: list[str] = []

class ContractorUpdate(BaseModel):
    company_name: Optional[str] = None
    owner_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    insurance_info: Optional[dict] = None
    skills: Optional[list[str]] = None
    is_active: Optional[bool] = None


# ── Response Models ───────────────────────────────────

class ContractorResponse(BaseModel):
    id: str
    org_id: str
    company_name: str
    owner_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    email: str
    phone: str
    license_number: Optional[str] = None
    skills: list[str] = []
    rating: Decimal = Decimal("0")
    verification_status: VerificationStatus = VerificationStatus.PENDING
    last_verified_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class ContractorDetail(ContractorResponse):
    """Full contractor detail with address, performance, workers."""
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    zip_code: Optional[str] = None
    insurance_info: Optional[dict] = None
    performance: Optional[dict] = None
    workers: list = []                  # List[WorkerResponse]
    active_workgroups: list = []        # List[WorkgroupResponse]
    verifications: list = []            # List[VerificationResponse]

class ContractorScoreResult(BaseModel):
    """AI allocation scoring result for a contractor."""
    contractor_id: str
    company_name: str
    total_score: Decimal
    skill_match: Decimal                # 30% weight
    past_performance: Decimal           # 25% weight
    availability: Decimal               # 20% weight
    geographic_proximity: Decimal       # 15% weight
    pricing_history: Decimal            # 10% weight
    recommendation: str = ""
