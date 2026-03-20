-- ============================================================
-- BUSINESS PROFILES — Vertical-Agnostic Onboarding
-- Run: AFTER core schema + ERL additions (if applicable)
--
-- Shared across CMS and CMS-ERL. Stores company identity,
-- primary address, classification, and onboarding state.
-- One profile per organization (1:1 with organizations).
--
-- The organizations.settings JSONB continues to hold
-- vertical-specific config (terminology, billing defaults).
-- This table holds the universal business identity.
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- TABLE: business_profiles
-- ████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS business_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(id) NOT NULL UNIQUE,

    -- ── Business Identity ──────────────────────────────────
    company_name    TEXT NOT NULL,
    dba_name        TEXT,
    ein             TEXT,
    phone           TEXT,
    email           TEXT,
    website         TEXT,
    logo_url        TEXT,

    -- ── Primary Address (HQ) ──────────────────────────────
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    zip_code        TEXT,
    country         TEXT DEFAULT 'US',
    geo_latitude    DECIMAL(10, 7),
    geo_longitude   DECIMAL(10, 7),

    -- ── Classification ────────────────────────────────────
    business_type   TEXT CHECK (business_type IN (
        'sole_proprietorship', 'llc', 'corporation',
        's_corp', 'partnership', 'nonprofit', 'other'
    )),
    industry        TEXT CHECK (industry IN (
        'equipment_rental', 'general_contracting',
        'property_management', 'logistics',
        'service_company', 'landscaping',
        'electrical', 'plumbing', 'hvac',
        'construction', 'other'
    )),

    -- ── Onboarding ────────────────────────────────────────
    onboarding_complete  BOOLEAN DEFAULT FALSE,
    onboarding_step      INTEGER DEFAULT 0,

    -- ── Financial Defaults ────────────────────────────────
    default_payment_terms  INTEGER DEFAULT 30,
    default_billing_cycle  TEXT DEFAULT 'monthly'
        CHECK (default_billing_cycle IN ('daily', 'weekly', 'monthly', '28day')),
    default_markup_pct     DECIMAL(5, 2) DEFAULT 18.00,
    invoice_prefix         TEXT DEFAULT 'INV',

    -- ── Timestamps ────────────────────────────────────────
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████
-- INDEXES
-- ████████████████████████████████████████████████████████████

CREATE INDEX idx_business_profiles_org ON business_profiles(org_id);


-- ████████████████████████████████████████████████████████████
-- RLS
-- ████████████████████████████████████████████████████████████

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org profile" ON business_profiles
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org profile" ON business_profiles
    FOR ALL USING (org_id = auth_org_id());


-- ████████████████████████████████████████████████████████████
-- TRIGGER
-- ████████████████████████████████████████████████████████████

CREATE TRIGGER trg_business_profiles_updated_at
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ████████████████████████████████████████████████████████████
-- ADD onboarding_complete TO organizations (for quick checks)
-- ████████████████████████████████████████████████████████████

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;


-- ============================================================
-- BUSINESS PROFILES MIGRATION COMPLETE
--
-- New table: business_profiles (1:1 with organizations)
-- New column: organizations.onboarding_complete (denormalized flag)
-- Next: Seed data or start the app
-- ============================================================
