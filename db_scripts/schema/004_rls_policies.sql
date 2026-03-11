-- ============================================================
-- CMS DATABASE SCHEMA — Row Level Security
-- Run: After 001_tables.sql
--
-- RLS ensures business owners only see their own org's data.
-- Service role key (backend) bypasses RLS.
-- Anon key (frontend direct) is subject to RLS.
-- ============================================================

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

-- ── Helper: get current user's org_id ─────────────────────

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Organizations ─────────────────────────────────────────

CREATE POLICY "Users see own org"
    ON organizations FOR SELECT
    USING (id = auth_org_id());

-- ── Projects ──────────────────────────────────────────────

CREATE POLICY "Users see own org projects"
    ON projects FOR SELECT
    USING (org_id = auth_org_id());

CREATE POLICY "Users create projects in own org"
    ON projects FOR INSERT
    WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users update own org projects"
    ON projects FOR UPDATE
    USING (org_id = auth_org_id());

-- ── Contractors ───────────────────────────────────────────

CREATE POLICY "Users see own org contractors"
    ON contractors FOR SELECT
    USING (org_id = auth_org_id());

CREATE POLICY "Users manage own org contractors"
    ON contractors FOR ALL
    USING (org_id = auth_org_id());

-- ── Worksites (via project → org) ─────────────────────────

CREATE POLICY "Users see own org worksites"
    ON worksites FOR SELECT
    USING (project_id IN (
        SELECT id FROM projects WHERE org_id = auth_org_id()
    ));

-- ── Workgroups (via worksite → project → org) ─────────────

CREATE POLICY "Users see own org workgroups"
    ON workgroups FOR SELECT
    USING (worksite_id IN (
        SELECT ws.id FROM worksites ws
        JOIN projects p ON ws.project_id = p.id
        WHERE p.org_id = auth_org_id()
    ));

-- ── Jobs (via workgroup → worksite → project → org) ───────

CREATE POLICY "Users see own org jobs"
    ON jobs FOR SELECT
    USING (workgroup_id IN (
        SELECT wg.id FROM workgroups wg
        JOIN worksites ws ON wg.worksite_id = ws.id
        JOIN projects p ON ws.project_id = p.id
        WHERE p.org_id = auth_org_id()
    ));

-- TODO: Add INSERT/UPDATE/DELETE policies for all tables
-- TODO: Add contractor-side policies (via QR session, not Supabase auth)
-- TODO: Consider performance — deep joins may need materialized helper columns
