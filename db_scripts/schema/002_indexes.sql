-- ============================================================
-- CMS DATABASE SCHEMA — Indexes
-- Run: After 001_tables.sql
-- ============================================================

-- ── Projects ─────────────────────────────────────────────
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);

-- ── Worksites ────────────────────────────────────────────
CREATE INDEX idx_worksites_project ON worksites(project_id);

-- ── Worksite Contacts ────────────────────────────────────
CREATE INDEX idx_worksite_contacts_worksite ON worksite_contacts(worksite_id);
CREATE INDEX idx_worksite_contacts_employee ON worksite_contacts(employee_id);

-- ── Workgroups ───────────────────────────────────────────
CREATE INDEX idx_workgroups_worksite ON workgroups(worksite_id);
CREATE INDEX idx_workgroups_contractor ON workgroups(contractor_id);
CREATE INDEX idx_workgroups_status ON workgroups(worksite_id, status);

-- ── Jobs ─────────────────────────────────────────────────
CREATE INDEX idx_jobs_workgroup ON jobs(workgroup_id);
CREATE INDEX idx_jobs_status ON jobs(workgroup_id, status);

-- ── Invoices ─────────────────────────────────────────────
CREATE INDEX idx_invoices_workgroup ON invoices(workgroup_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ── Messages (ordered for chat scroll) ───────────────────
CREATE INDEX idx_messages_workgroup ON messages(workgroup_id, created_at DESC);

-- ── Uploads ──────────────────────────────────────────────
CREATE INDEX idx_uploads_workgroup ON uploads(workgroup_id);
CREATE INDEX idx_uploads_job ON uploads(job_id);

-- ── Audit Logs ───────────────────────────────────────────
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- ── Contractors ──────────────────────────────────────────
CREATE INDEX idx_contractors_org ON contractors(org_id);
CREATE INDEX idx_contractors_skills ON contractors USING GIN(skills);

-- ── Contractor Workers ───────────────────────────────────
CREATE INDEX idx_contractor_workers ON contractor_workers(contractor_id);

-- ── Site Check-ins ───────────────────────────────────────
CREATE INDEX idx_site_checkins_workgroup ON site_checkins(workgroup_id);
CREATE INDEX idx_site_checkins_worker ON site_checkins(worker_id);
CREATE INDEX idx_site_checkins_time ON site_checkins(checked_in_at DESC);

-- ── QR Tokens ────────────────────────────────────────────
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_workgroup ON qr_tokens(workgroup_id);

-- ── Contractor Verifications ─────────────────────────────
CREATE INDEX idx_verifications_contractor ON contractor_verifications(contractor_id);
