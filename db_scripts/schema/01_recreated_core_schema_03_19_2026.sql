-- ============================================================
-- CMS CORE SCHEMA — Consolidated from Live Supabase DB
-- Generated: March 19, 2026
--
-- Reproduces the EXACT live schema (22 tables) as a single
-- runnable script. Includes all migrations through v5.
--
-- Source: 01_full_schema.sql + 04_project_settings_templates.sql
--         + 05_workgroup_project_id.sql (all applied)
--
-- Instructions:
--   1. Create a new Supabase project
--   2. Open Dashboard → SQL Editor
--   3. Paste this entire script and click "Run"
--   4. Then run 02_erl_additions.sql (for Equipment Rental)
--      OR 02_seed_data.sql (for Renovation)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART 1: EXTENSIONS & UTILITIES
-- ████████████████████████████████████████████████████████████

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ████████████████████████████████████████████████████████████
-- PART 2: TABLES (22 tables)
-- ████████████████████████████████████████████████████████████

-- ── 1. Organizations ──────────────────────────────────────

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    template TEXT DEFAULT 'general_contracting',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. User Profiles (Supabase Auth) ─────────────────────

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

-- ── 3. Business Employees ────────────────────────────────

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

-- ── 4. Business Locations ────────────────────────────────

CREATE TABLE business_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    location_type TEXT DEFAULT 'office'
        CHECK (location_type IN (
            'office', 'warehouse', 'yard',
            'shop', 'storage', 'branch', 'other'
        )),
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    geo_latitude DECIMAL(10,7),
    geo_longitude DECIMAL(10,7),
    geo_fence_radius_m INTEGER DEFAULT 200,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    google_place_id TEXT,
    verification_status TEXT DEFAULT 'unverified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Projects ──────────────────────────────────────────

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Migration 04: Project settings
    project_type TEXT DEFAULT 'direct'
        CHECK (project_type IN ('direct', 'contract')),
    industry TEXT,
    project_subtype TEXT,
    contractor_payment_terms INTEGER DEFAULT 15
        CHECK (contractor_payment_terms IN (15, 30, 45)),
    client_payment_terms INTEGER
        CHECK (client_payment_terms IS NULL OR client_payment_terms IN (30, 45, 60)),
    client_name TEXT,
    contract_value DECIMAL(12,2),
    retainage_pct DECIMAL(5,4) DEFAULT 0
        CHECK (retainage_pct >= 0 AND retainage_pct <= 0.20),
    retainage_release TEXT DEFAULT 'substantial_completion'
        CHECK (retainage_release IN ('substantial_completion', 'final_completion', 'time_based')),
    sub_retainage_pct DECIMAL(5,4) DEFAULT 0
        CHECK (sub_retainage_pct >= 0 AND sub_retainage_pct <= 0.20),
    draw_frequency TEXT DEFAULT 'monthly'
        CHECK (draw_frequency IN ('monthly', 'milestone', 'manual')),
    template_id UUID,
    scaffold_prompt TEXT,
    scaffold_metadata JSONB
);

-- ── 6. Project Templates ─────────────────────────────────

CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    project_subtype TEXT,
    project_type_default TEXT DEFAULT 'direct'
        CHECK (project_type_default IN ('direct', 'contract')),
    scaffold_data JSONB NOT NULL,
    default_settings JSONB,
    is_system BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1 NOT NULL,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    created_by UUID,
    source TEXT DEFAULT 'manual'
        CHECK (source IN ('llm_scaffold', 'from_project', 'manual', 'system')),
    source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK: projects.template_id → project_templates
ALTER TABLE projects
    ADD CONSTRAINT fk_project_template
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL;

-- ── 7. Contractors ───────────────────────────────────────

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

-- ── 8. Contractor Workers ────────────────────────────────

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

-- ── 9. Contractor Verifications ──────────────────────────

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

-- ── 10. Worksites ────────────────────────────────────────

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Migration 05: link to business location
    business_location_id UUID REFERENCES business_locations(id)
);

-- ── 11. Worksite Contacts ────────────────────────────────

CREATE TABLE worksite_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES business_employees(id) NOT NULL,
    contact_role TEXT NOT NULL CHECK (contact_role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worksite_id, employee_id)
);

-- ── 12. Workgroups ───────────────────────────────────────

CREATE TABLE workgroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE,  -- nullable after migration 05
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Migration 05: direct project link
    project_id UUID REFERENCES projects(id) NOT NULL
);

-- ── 13. Workgroup Dependencies ───────────────────────────

CREATE TABLE workgroup_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    depends_on_workgroup_id UUID REFERENCES workgroups(id) NOT NULL,
    dependency_type TEXT DEFAULT 'finish_to_start',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workgroup_id, depends_on_workgroup_id)
);

-- ── 14. QR Tokens ────────────────────────────────────────

CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. Jobs ─────────────────────────────────────────────

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Migration 05: per-job worksite override
    worksite_id UUID REFERENCES worksites(id)
);

-- ── 16. Job Dependencies ─────────────────────────────────

CREATE TABLE job_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    depends_on_job_id UUID REFERENCES jobs(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, depends_on_job_id)
);

-- ── 17. Invoices ─────────────────────────────────────────

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

-- FK: jobs.invoice_id → invoices
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ── 18. Site Check-ins (GPS) ─────────────────────────────

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

-- ── 19. Messages ─────────────────────────────────────────

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

-- ── 20. Uploads ──────────────────────────────────────────

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

-- ── 21. Checklists ───────────────────────────────────────

CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 22. Audit Logs ───────────────────────────────────────

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


-- ████████████████████████████████████████████████████████████
-- PART 3: INDEXES
-- ████████████████████████████████████████████████████████████

-- User Profiles
CREATE INDEX idx_user_profiles_org ON user_profiles(org_id);

-- Business Employees
CREATE INDEX idx_business_employees_org ON business_employees(org_id);

-- Business Locations
CREATE INDEX idx_biz_loc_org ON business_locations(org_id);
CREATE INDEX idx_biz_loc_active ON business_locations(org_id, is_active);

-- Projects
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);
CREATE INDEX idx_projects_type ON projects(org_id, project_type);

-- Project Templates
CREATE INDEX idx_templates_org ON project_templates(org_id);
CREATE INDEX idx_templates_industry ON project_templates(industry);
CREATE INDEX idx_templates_system ON project_templates(is_system);
CREATE INDEX idx_templates_usage ON project_templates(usage_count DESC);
CREATE INDEX idx_templates_archived ON project_templates(org_id, is_archived);

-- Contractors
CREATE INDEX idx_contractors_org ON contractors(org_id);
CREATE INDEX idx_contractors_skills ON contractors USING GIN(skills);

-- Contractor Workers
CREATE INDEX idx_contractor_workers ON contractor_workers(contractor_id);

-- Contractor Verifications
CREATE INDEX idx_verifications_contractor ON contractor_verifications(contractor_id);

-- Worksites
CREATE INDEX idx_worksites_project ON worksites(project_id);

-- Worksite Contacts
CREATE INDEX idx_worksite_contacts_worksite ON worksite_contacts(worksite_id);
CREATE INDEX idx_worksite_contacts_employee ON worksite_contacts(employee_id);

-- Workgroups
CREATE INDEX idx_workgroups_worksite ON workgroups(worksite_id);
CREATE INDEX idx_workgroups_contractor ON workgroups(contractor_id);
CREATE INDEX idx_workgroups_status ON workgroups(worksite_id, status);
CREATE INDEX idx_workgroups_project ON workgroups(project_id);

-- Jobs
CREATE INDEX idx_jobs_workgroup ON jobs(workgroup_id);
CREATE INDEX idx_jobs_status ON jobs(workgroup_id, status);
CREATE INDEX idx_jobs_worksite ON jobs(worksite_id);

-- Invoices
CREATE INDEX idx_invoices_workgroup ON invoices(workgroup_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Messages
CREATE INDEX idx_messages_workgroup ON messages(workgroup_id, created_at DESC);

-- Uploads
CREATE INDEX idx_uploads_workgroup ON uploads(workgroup_id);
CREATE INDEX idx_uploads_job ON uploads(job_id);

-- Site Check-ins
CREATE INDEX idx_site_checkins_workgroup ON site_checkins(workgroup_id);
CREATE INDEX idx_site_checkins_worker ON site_checkins(worker_id);
CREATE INDEX idx_site_checkins_time ON site_checkins(checked_in_at DESC);

-- QR Tokens
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_workgroup ON qr_tokens(workgroup_id);

-- Audit
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);


-- ████████████████████████████████████████████████████████████
-- PART 4: VIEWS
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
LEFT JOIN worksites ws ON wg.worksite_id = ws.id
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
LEFT JOIN worksites ws ON wg.worksite_id = ws.id
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
LEFT JOIN workgroups wg ON wg.project_id = p.id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
GROUP BY p.id;


-- ████████████████████████████████████████████████████████████
-- PART 5: ROW LEVEL SECURITY
-- ████████████████████████████████████████████████████████████

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
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

-- Organizations
CREATE POLICY "Users see own org" ON organizations
    FOR SELECT USING (id = auth_org_id());

-- User Profiles
CREATE POLICY "Users see own org users" ON user_profiles
    FOR SELECT USING (org_id = auth_org_id());

-- Business Employees
CREATE POLICY "Users see own org employees" ON business_employees
    FOR SELECT USING (org_id = auth_org_id());

-- Business Locations
CREATE POLICY "Users see own org locations" ON business_locations
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org locations" ON business_locations
    FOR ALL USING (org_id = auth_org_id());

-- Projects
CREATE POLICY "Users see own org projects" ON projects
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users create projects in own org" ON projects
    FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Users update own org projects" ON projects
    FOR UPDATE USING (org_id = auth_org_id());

-- Project Templates
CREATE POLICY "Users see own org templates and system templates" ON project_templates
    FOR SELECT USING (
        org_id = auth_org_id() OR is_system = TRUE
    );
CREATE POLICY "Users manage own org templates" ON project_templates
    FOR ALL USING (
        org_id = auth_org_id() AND is_system = FALSE
    );

-- Contractors
CREATE POLICY "Users see own org contractors" ON contractors
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org contractors" ON contractors
    FOR ALL USING (org_id = auth_org_id());

-- Worksites
CREATE POLICY "Users see own org worksites" ON worksites
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE org_id = auth_org_id()
    ));

-- Workgroups (via project_id)
CREATE POLICY "Users see own org workgroups" ON workgroups
    FOR SELECT USING (project_id IN (
        SELECT id FROM projects WHERE org_id = auth_org_id()
    ));

-- Jobs (via workgroup → project)
CREATE POLICY "Users see own org jobs" ON jobs
    FOR SELECT USING (workgroup_id IN (
        SELECT wg.id FROM workgroups wg
        WHERE wg.project_id IN (
            SELECT id FROM projects WHERE org_id = auth_org_id()
        )
    ));


-- ████████████████████████████████████████████████████████████
-- PART 6: SUPABASE REALTIME
-- ████████████████████████████████████████████████████████████

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE workgroups;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE site_checkins;


-- ████████████████████████████████████████████████████████████
-- PART 7: FUNCTIONS & TRIGGERS
-- ████████████████████████████████████████████████████████████

-- Progress cascade functions
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

    IF v_total = 0 THEN v_pct := 0;
    ELSE v_pct := ROUND((v_done::DECIMAL / v_total) * 100, 2);
    END IF;

    UPDATE workgroups SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_workgroup_id;
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_recalculate_worksite_progress(p_worksite_id UUID)
RETURNS DECIMAL AS $$
DECLARE v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0) INTO v_pct
    FROM workgroups WHERE worksite_id = p_worksite_id;

    UPDATE worksites SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_worksite_id;
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_recalculate_project_progress(p_project_id UUID)
RETURNS DECIMAL AS $$
DECLARE v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0) INTO v_pct
    FROM worksites WHERE project_id = p_project_id;

    UPDATE projects SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_project_id;
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_cascade_progress(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_workgroup_id UUID;
    v_worksite_id UUID;
    v_project_id UUID;
BEGIN
    SELECT wg.id, wg.worksite_id, wg.project_id
    INTO v_workgroup_id, v_worksite_id, v_project_id
    FROM jobs j
    JOIN workgroups wg ON j.workgroup_id = wg.id
    WHERE j.id = p_job_id;

    PERFORM fn_recalculate_workgroup_progress(v_workgroup_id);
    IF v_worksite_id IS NOT NULL THEN
        PERFORM fn_recalculate_worksite_progress(v_worksite_id);
    END IF;
    PERFORM fn_recalculate_project_progress(v_project_id);
END;
$$ LANGUAGE plpgsql;

-- Billing helpers
CREATE OR REPLACE FUNCTION fn_is_workgroup_fully_paid(p_workgroup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_total INTEGER; v_paid INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'paid')
    INTO v_total, v_paid
    FROM jobs WHERE workgroup_id = p_workgroup_id;
    RETURN v_total > 0 AND v_total = v_paid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_double_billing(p_workgroup_id UUID, p_job_ids UUID[])
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT j.id FROM jobs j
        WHERE j.id = ANY(p_job_ids)
          AND j.workgroup_id = p_workgroup_id
          AND j.invoice_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Consistency trigger: workgroup.worksite_id must match project
CREATE OR REPLACE FUNCTION check_wg_worksite_project()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.worksite_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM worksites
            WHERE id = NEW.worksite_id AND project_id = NEW.project_id
        ) THEN
            RAISE EXCEPTION 'Worksite % does not belong to project %',
                NEW.worksite_id, NEW.project_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wg_worksite_project
    BEFORE INSERT OR UPDATE ON workgroups
    FOR EACH ROW EXECUTE FUNCTION check_wg_worksite_project();

-- Updated_at triggers
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
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
CREATE TRIGGER trg_business_locations_updated_at BEFORE UPDATE ON business_locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- CORE SCHEMA COMPLETE
--
-- 22 tables, 30+ indexes, 4 views, 14+ RLS policies,
-- 5 realtime subscriptions, 7 functions, 13 triggers
--
-- This script reproduces the live Supabase DB exactly.
-- Run 02_erl_additions.sql next for Equipment Rental Logistics.
-- ============================================================
ALTER TABLE invoices ALTER COLUMN workgroup_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN contractor_id DROP NOT NULL;