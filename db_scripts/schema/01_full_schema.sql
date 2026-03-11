-- ============================================================
-- CMS FULL SCHEMA — Run this FIRST in Supabase SQL Editor
-- 
-- Includes: Tables, Indexes, Views, RLS, Realtime, Functions
-- Project: Contractor_Management_System
-- Version: 5.0
--
-- Instructions:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire script
--   3. Click "Run" (or Ctrl+Enter)
--   4. Then run 02_seed_data.sql
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: TABLES (18 tables)
-- ████████████████████████████████████████████████████████████

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
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
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
    email TEXT,
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
    invoice_id UUID,
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


-- ████████████████████████████████████████████████████████████
-- PART 2: INDEXES (28 indexes)
-- ████████████████████████████████████████████████████████████

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);
CREATE INDEX idx_worksites_project ON worksites(project_id);
CREATE INDEX idx_worksite_contacts_worksite ON worksite_contacts(worksite_id);
CREATE INDEX idx_worksite_contacts_employee ON worksite_contacts(employee_id);
CREATE INDEX idx_workgroups_worksite ON workgroups(worksite_id);
CREATE INDEX idx_workgroups_contractor ON workgroups(contractor_id);
CREATE INDEX idx_workgroups_status ON workgroups(worksite_id, status);
CREATE INDEX idx_jobs_workgroup ON jobs(workgroup_id);
CREATE INDEX idx_jobs_status ON jobs(workgroup_id, status);
CREATE INDEX idx_invoices_workgroup ON invoices(workgroup_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_messages_workgroup ON messages(workgroup_id, created_at DESC);
CREATE INDEX idx_uploads_workgroup ON uploads(workgroup_id);
CREATE INDEX idx_uploads_job ON uploads(job_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX idx_contractors_org ON contractors(org_id);
CREATE INDEX idx_contractors_skills ON contractors USING GIN(skills);
CREATE INDEX idx_contractor_workers ON contractor_workers(contractor_id);
CREATE INDEX idx_site_checkins_workgroup ON site_checkins(workgroup_id);
CREATE INDEX idx_site_checkins_worker ON site_checkins(worker_id);
CREATE INDEX idx_site_checkins_time ON site_checkins(checked_in_at DESC);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_workgroup ON qr_tokens(workgroup_id);
CREATE INDEX idx_verifications_contractor ON contractor_verifications(contractor_id);


-- ████████████████████████████████████████████████████████████
-- PART 3: VIEWS (4 helper views)
-- ████████████████████████████████████████████████████████████

-- Worksite with contact persons
CREATE VIEW v_worksite_with_contacts AS
SELECT
    ws.*,
    p.title AS project_title,
    p.org_id,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'employee_id', be.id,
                'first_name', be.first_name,
                'last_name', be.last_name,
                'email', be.email,
                'phone', be.phone,
                'role', be.role,
                'contact_role', wc.contact_role
            )
        ) FILTER (WHERE be.id IS NOT NULL),
        '[]'
    ) AS contacts
FROM worksites ws
JOIN projects p ON ws.project_id = p.id
LEFT JOIN worksite_contacts wc ON ws.id = wc.worksite_id
LEFT JOIN business_employees be ON wc.employee_id = be.id
GROUP BY ws.id, p.title, p.org_id;

-- Workgroup invoice summary
CREATE VIEW v_workgroup_invoice_summary AS
SELECT
    wg.id AS workgroup_id,
    wg.title,
    wg.budget,
    wg.status,
    ws.name AS worksite_name,
    ws.id AS worksite_id,
    c.company_name AS contractor_name,
    COUNT(DISTINCT i.id) AS invoice_count,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS total_invoiced,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    wg.budget - COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS remaining_budget
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN contractors c ON wg.contractor_id = c.id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
GROUP BY wg.id, wg.title, wg.budget, wg.status, ws.name, ws.id, c.company_name;

-- Workgroup site presence analytics
CREATE VIEW v_workgroup_site_presence AS
SELECT
    wg.id AS workgroup_id,
    wg.title,
    ws.name AS worksite_name,
    COUNT(DISTINCT sc.id) AS total_checkins,
    COUNT(DISTINCT sc.worker_id) AS unique_workers,
    COUNT(DISTINCT DATE(sc.checked_in_at)) AS days_on_site,
    MIN(sc.checked_in_at) AS first_checkin,
    MAX(sc.checked_in_at) AS last_checkin,
    COUNT(DISTINCT u.id) FILTER (WHERE u.geo_verified = TRUE) AS verified_photos,
    COUNT(DISTINCT u.id) FILTER (WHERE u.geo_verified = FALSE) AS unverified_photos
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN site_checkins sc ON wg.id = sc.workgroup_id
LEFT JOIN uploads u ON wg.id = u.workgroup_id
GROUP BY wg.id, wg.title, ws.name;

-- Project progress overview
CREATE VIEW v_project_overview AS
SELECT
    p.id AS project_id,
    p.title,
    p.org_id,
    p.total_budget,
    p.status,
    p.progress_pct,
    p.start_date,
    p.end_date,
    COUNT(DISTINCT ws.id) AS worksite_count,
    COUNT(DISTINCT wg.id) AS workgroup_count,
    COUNT(DISTINCT j.id) AS job_count,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('complete', 'invoiced', 'paid')) AS jobs_complete,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS total_invoiced,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid
FROM projects p
LEFT JOIN worksites ws ON p.id = ws.project_id
LEFT JOIN workgroups wg ON ws.id = wg.worksite_id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
GROUP BY p.id;


-- ████████████████████████████████████████████████████████████
-- PART 4: ROW LEVEL SECURITY
-- ████████████████████████████████████████████████████████████

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_checkins ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's org_id
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users see own org" ON organizations
    FOR SELECT USING (id = auth_org_id());

CREATE POLICY "Users see own org projects" ON projects
    FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users create projects in own org" ON projects
    FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users update own org projects" ON projects
    FOR UPDATE USING (org_id = auth_org_id());

CREATE POLICY "Users see own org contractors" ON contractors
    FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users manage own org contractors" ON contractors
    FOR ALL USING (org_id = auth_org_id());

CREATE POLICY "Users see own org worksites" ON worksites
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE org_id = auth_org_id()
    ));

CREATE POLICY "Users see own org workgroups" ON workgroups
    FOR SELECT USING (worksite_id IN (
        SELECT ws.id FROM worksites ws
        JOIN projects p ON ws.project_id = p.id
        WHERE p.org_id = auth_org_id()
    ));

CREATE POLICY "Users see own org jobs" ON jobs
    FOR SELECT USING (workgroup_id IN (
        SELECT wg.id FROM workgroups wg
        JOIN worksites ws ON wg.worksite_id = ws.id
        JOIN projects p ON ws.project_id = p.id
        WHERE p.org_id = auth_org_id()
    ));


-- ████████████████████████████████████████████████████████████
-- PART 5: SUPABASE REALTIME
-- ████████████████████████████████████████████████████████████

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE workgroups;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE site_checkins;


-- ████████████████████████████████████████████████████████████
-- PART 6: FUNCTIONS & TRIGGERS
-- ████████████████████████████████████████████████████████████

-- Recalculate workgroup progress from job statuses
CREATE OR REPLACE FUNCTION fn_recalculate_workgroup_progress(p_workgroup_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_total INTEGER;
    v_done INTEGER;
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status IN ('complete', 'invoiced', 'paid'))
    INTO v_total, v_done
    FROM jobs WHERE workgroup_id = p_workgroup_id;

    IF v_total = 0 THEN
        v_pct := 0;
    ELSE
        v_pct := ROUND((v_done::DECIMAL / v_total) * 100, 2);
    END IF;

    UPDATE workgroups
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_workgroup_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

-- Recalculate worksite progress from workgroup averages
CREATE OR REPLACE FUNCTION fn_recalculate_worksite_progress(p_worksite_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0)
    INTO v_pct
    FROM workgroups WHERE worksite_id = p_worksite_id;

    UPDATE worksites
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_worksite_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

-- Recalculate project progress from worksite averages
CREATE OR REPLACE FUNCTION fn_recalculate_project_progress(p_project_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0)
    INTO v_pct
    FROM worksites WHERE project_id = p_project_id;

    UPDATE projects
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_project_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

-- Full cascade: job → workgroup → worksite → project
CREATE OR REPLACE FUNCTION fn_cascade_progress(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_workgroup_id UUID;
    v_worksite_id UUID;
    v_project_id UUID;
BEGIN
    SELECT wg.id, wg.worksite_id, ws.project_id
    INTO v_workgroup_id, v_worksite_id, v_project_id
    FROM jobs j
    JOIN workgroups wg ON j.workgroup_id = wg.id
    JOIN worksites ws ON wg.worksite_id = ws.id
    WHERE j.id = p_job_id;

    PERFORM fn_recalculate_workgroup_progress(v_workgroup_id);
    PERFORM fn_recalculate_worksite_progress(v_worksite_id);
    PERFORM fn_recalculate_project_progress(v_project_id);
END;
$$ LANGUAGE plpgsql;

-- Check if workgroup is fully paid
CREATE OR REPLACE FUNCTION fn_is_workgroup_fully_paid(p_workgroup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_paid INTEGER;
BEGIN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status = 'paid')
    INTO v_total, v_paid
    FROM jobs WHERE workgroup_id = p_workgroup_id;

    RETURN v_total > 0 AND v_total = v_paid;
END;
$$ LANGUAGE plpgsql;

-- Double-billing check
CREATE OR REPLACE FUNCTION fn_check_double_billing(
    p_workgroup_id UUID,
    p_job_ids UUID[]
)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT j.id
        FROM jobs j
        WHERE j.id = ANY(p_job_ids)
          AND j.workgroup_id = p_workgroup_id
          AND j.invoice_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Auto updated_at trigger
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_worksites_updated_at BEFORE UPDATE ON worksites
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_workgroups_updated_at BEFORE UPDATE ON workgroups
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contractors_updated_at BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contractor_workers_updated_at BEFORE UPDATE ON contractor_workers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_business_employees_updated_at BEFORE UPDATE ON business_employees
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- SCHEMA COMPLETE
-- 
-- Created: 18 tables, 28 indexes, 4 views, 12 RLS policies,
--          5 realtime subscriptions, 6 functions, 9 triggers
--
-- Next: Run 02_seed_data.sql
-- ============================================================
