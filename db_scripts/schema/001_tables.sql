-- ============================================================
-- CMS DATABASE SCHEMA — Tables
-- Run: First time setup on a fresh Supabase project
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ──────────────────────────────────────────

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    template TEXT DEFAULT 'general_contracting',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (Supabase Auth + profile) ───────────────────────

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES organizations(id),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Business Employees (Contact Persons) ──────────────────

CREATE TABLE business_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projects ──────────────────────────────────────────────

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    total_budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'planning', 'active', 'review',
        'complete', 'on_hold', 'cancelled'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractors ───────────────────────────────────────────

CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    company_name TEXT NOT NULL,
    owner_name TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    email TEXT NOT NULL,             -- shared credential (keyless entry)
    phone TEXT NOT NULL,             -- shared credential (keyless entry)
    license_number TEXT,
    insurance_info JSONB DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0,
    performance JSONB DEFAULT '{}',
    verification_status TEXT DEFAULT 'pending' CHECK (
        verification_status IN ('verified', 'pending', 'flagged')
    ),
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractor Workers (self-identified on first access) ──

CREATE TABLE contractor_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,                       -- optional
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Worksites ─────────────────────────────────────────────

CREATE TABLE worksites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone TEXT,
    site_notes TEXT,
    geo_latitude DECIMAL(10,7),
    geo_longitude DECIMAL(10,7),
    geo_fence_radius_m INTEGER DEFAULT 200,
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'in_progress', 'review',
        'complete', 'on_hold'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Worksite Contact Persons (Junction Table) ─────────────

CREATE TABLE worksite_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES business_employees(id) NOT NULL,
    contact_role TEXT NOT NULL CHECK (contact_role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worksite_id, employee_id)
);

-- ── Workgroups ────────────────────────────────────────────

CREATE TABLE workgroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id),
    title TEXT NOT NULL,
    trade TEXT,
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending', 'accepted', 'rejected',
        'in_progress', 'review', 'approved',
        'complete', 'disputed'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    accepted_by UUID REFERENCES contractor_workers(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workgroup Dependencies ────────────────────────────────

CREATE TABLE workgroup_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    depends_on_workgroup_id UUID REFERENCES workgroups(id) NOT NULL,
    dependency_type TEXT DEFAULT 'finish_to_start',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workgroup_id, depends_on_workgroup_id)
);

-- ── QR Tokens ─────────────────────────────────────────────

CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Jobs ──────────────────────────────────────────────────

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget DECIMAL(12,2),
    est_duration_days INTEGER,
    sequence INTEGER DEFAULT 1,
    status TEXT DEFAULT 'not_started' CHECK (status IN (
        'not_started', 'in_progress', 'complete',
        'invoiced', 'paid'
    )),
    invoice_id UUID,                  -- FK added after invoices table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Job Dependencies ──────────────────────────────────────

CREATE TABLE job_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    depends_on_job_id UUID REFERENCES jobs(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, depends_on_job_id)
);

-- ── Invoices ──────────────────────────────────────────────

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    submitted_by_worker UUID REFERENCES contractor_workers(id),
    invoice_number TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'ai_validated', 'ai_flagged',
        'pending_approval', 'approved', 'rejected', 'paid'
    )),
    ai_validated BOOLEAN DEFAULT FALSE,
    ai_flags JSONB DEFAULT '[]',
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    file_url TEXT,
    submitted_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK from jobs.invoice_id → invoices
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ── Site Check-ins (GPS) ──────────────────────────────────

CREATE TABLE site_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    worksite_id UUID REFERENCES worksites(id) NOT NULL,
    worker_id UUID REFERENCES contractor_workers(id) NOT NULL,
    geo_latitude DECIMAL(10,7) NOT NULL,
    geo_longitude DECIMAL(10,7) NOT NULL,
    distance_from_site_m DECIMAL(8,2),
    within_geo_fence BOOLEAN NOT NULL,
    device_info JSONB,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'employee', 'worker', 'ai')),
    worker_id UUID REFERENCES contractor_workers(id),
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN (
        'text', 'photo', 'file', 'invoice', 'system'
    )),
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Uploads ───────────────────────────────────────────────

CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id),
    uploaded_by UUID NOT NULL,
    worker_id UUID REFERENCES contractor_workers(id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    ai_analysis JSONB,
    geo_latitude DECIMAL(10,7),
    geo_longitude DECIMAL(10,7),
    geo_verified BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Checklists ────────────────────────────────────────────

CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    actor_type TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractor Verifications ──────────────────────────────

CREATE TABLE contractor_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    verification_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('passed', 'failed', 'expired', 'pending')
    ),
    source_url TEXT,
    details JSONB,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
