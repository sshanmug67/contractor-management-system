"""
Pydantic Models — Business Profile

Organization-level business identity, address, classification,
and onboarding state. 1:1 with organizations table.
Shared across CMS and CMS-ERL.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class BusinessType(str, Enum):
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    LLC = "llc"
    CORPORATION = "corporation"
    S_CORP = "s_corp"
    PARTNERSHIP = "partnership"
    NONPROFIT = "nonprofit"
    OTHER = "other"


class Industry(str, Enum):
    EQUIPMENT_RENTAL = "equipment_rental"
    GENERAL_CONTRACTING = "general_contracting"
    PROPERTY_MANAGEMENT = "property_management"
    LOGISTICS = "logistics"
    SERVICE_COMPANY = "service_company"
    LANDSCAPING = "landscaping"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    HVAC = "hvac"
    CONSTRUCTION = "construction"
    OTHER = "other"


class BillingCycle(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    TWENTY_EIGHT_DAY = "28day"


# ── Request Models ────────────────────────────────────

class BusinessProfileCreate(BaseModel):
    """Step 1 of onboarding — basic identity."""
    company_name: str = Field(..., min_length=1, max_length=200)
    dba_name: Optional[str] = None
    ein: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    business_type: Optional[BusinessType] = None
    industry: Optional[Industry] = None


class BusinessProfileAddressUpdate(BaseModel):
    """Step 2 of onboarding — primary address."""
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None


class BusinessProfileUpdate(BaseModel):
    """Full profile update — any field."""
    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    dba_name: Optional[str] = None
    ein: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None
    business_type: Optional[BusinessType] = None
    industry: Optional[Industry] = None
    default_payment_terms: Optional[int] = Field(None, ge=0, le=365)
    default_billing_cycle: Optional[BillingCycle] = None
    default_markup_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    invoice_prefix: Optional[str] = Field(None, max_length=10)


class OnboardingStepUpdate(BaseModel):
    """Track wizard progress."""
    step: int = Field(..., ge=0, le=3)
    complete: bool = False


# ── Response Models ───────────────────────────────────

class BusinessProfileResponse(BaseModel):
    id: str
    org_id: str
    company_name: str
    dba_name: Optional[str] = None
    ein: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"
    geo_latitude: Optional[Decimal] = None
    geo_longitude: Optional[Decimal] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    onboarding_complete: bool = False
    onboarding_step: int = 0
    default_payment_terms: int = 30
    default_billing_cycle: str = "monthly"
    default_markup_pct: Decimal = Decimal("18.00")
    invoice_prefix: str = "INV"
    created_at: datetime
    updated_at: datetime


class OnboardingStatus(BaseModel):
    """Lightweight check for dashboard banner."""
    has_profile: bool = False
    onboarding_complete: bool = False
    onboarding_step: int = 0
    company_name: Optional[str] = None
    missing_fields: list[str] = []
