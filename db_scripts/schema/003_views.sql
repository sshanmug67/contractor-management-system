-- ============================================================
-- CMS DATABASE SCHEMA — Views
-- Run: After 001_tables.sql
--
-- These views power dashboard/detail queries.
-- Repositories reference these by name.
-- ============================================================

-- ── Worksite with contact persons ─────────────────────────
-- Used by: worksite_queries.py → GET_WORKSITE_DETAIL

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


-- ── Workgroup invoice summary ─────────────────────────────
-- Used by: invoice_queries.py → GET_WORKGROUP_INVOICE_SUMMARY

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


-- ── Workgroup site presence analytics ─────────────────────
-- Used by: checkin_queries.py → GET_WORKGROUP_PRESENCE

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


-- ── Project progress overview ─────────────────────────────
-- Used by: dashboard_queries.py → GET_PROJECT_OVERVIEW

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
