-- ============================================================
-- CMS DATABASE VERIFICATION QUERIES
-- Run in Supabase SQL Editor to verify seed data integrity
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- 1. TABLE ROW COUNTS
-- ████████████████████████████████████████████████████████████

SELECT 'organizations' AS table_name, COUNT(*) AS rows FROM organizations
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'business_employees', COUNT(*) FROM business_employees
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'contractors', COUNT(*) FROM contractors
UNION ALL SELECT 'contractor_workers', COUNT(*) FROM contractor_workers
UNION ALL SELECT 'worksites', COUNT(*) FROM worksites
UNION ALL SELECT 'worksite_contacts', COUNT(*) FROM worksite_contacts
UNION ALL SELECT 'workgroups', COUNT(*) FROM workgroups
UNION ALL SELECT 'workgroup_dependencies', COUNT(*) FROM workgroup_dependencies
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'job_dependencies', COUNT(*) FROM job_dependencies
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'uploads', COUNT(*) FROM uploads
UNION ALL SELECT 'site_checkins', COUNT(*) FROM site_checkins
UNION ALL SELECT 'qr_tokens', COUNT(*) FROM qr_tokens
ORDER BY table_name;

-- Expected:
--   organizations: 1
--   business_employees: 3
--   contractors: 6
--   contractor_workers: 4
--   projects: 1
--   worksites: 3
--   worksite_contacts: 5
--   workgroups: 8
--   jobs: 23
--   workgroup_dependencies: 3 (if 03_seed ran)
--   invoices: 2-3 (if 03_seed ran)


-- ████████████████████████████████████████████████████████████
-- 2. PROJECT OVERVIEW (matches dashboard header)
-- ████████████████████████████████████████████████████████████

SELECT
    p.title,
    p.status,
    p.total_budget,
    p.start_date,
    p.end_date,
    COUNT(DISTINCT ws.id) AS worksite_count,
    COUNT(DISTINCT wg.id) AS workgroup_count,
    COUNT(DISTINCT j.id) AS job_count,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('complete','invoiced','paid')) AS jobs_done,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'in_progress') AS jobs_active
FROM projects p
LEFT JOIN worksites ws ON p.id = ws.project_id
LEFT JOIN workgroups wg ON ws.id = wg.worksite_id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
WHERE p.org_id = 'a0000000-0000-0000-0000-000000000001'
GROUP BY p.id;


-- ████████████████████████████████████████████████████████████
-- 3. WORKSITE BREAKDOWN (matches site tabs)
-- ████████████████████████████████████████████████████████████

SELECT
    ws.name,
    ws.budget,
    ws.status,
    COUNT(DISTINCT wg.id) AS workgroup_count,
    COUNT(DISTINCT j.id) AS job_count,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('complete','invoiced','paid')) AS jobs_done,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'in_progress') AS jobs_active,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'not_started') AS jobs_queued
FROM worksites ws
LEFT JOIN workgroups wg ON ws.id = wg.worksite_id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001'
GROUP BY ws.id
ORDER BY ws.name;


-- ████████████████████████████████████████████████████████████
-- 4. WORKGROUP DETAIL (matches workgroup cards)
-- ████████████████████████████████████████████████████████████

SELECT
    wg.title AS workgroup,
    wg.trade,
    wg.status,
    wg.budget,
    wg.start_date,
    wg.end_date,
    c.company_name AS contractor,
    ws.name AS worksite,
    COUNT(j.id) AS job_count,
    COUNT(j.id) FILTER (WHERE j.status IN ('complete','invoiced','paid')) AS jobs_done,
    COUNT(j.id) FILTER (WHERE j.status = 'in_progress') AS jobs_active,
    CASE WHEN COUNT(j.id) > 0
         THEN ROUND(COUNT(j.id) FILTER (WHERE j.status IN ('complete','invoiced','paid'))::numeric / COUNT(j.id) * 100)
         ELSE 0 END AS progress_pct
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN contractors c ON wg.contractor_id = c.id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
GROUP BY wg.id, c.company_name, ws.name
ORDER BY ws.name, wg.title;


-- ████████████████████████████████████████████████████████████
-- 5. ALL JOBS WITH STATUS (matches job lists in cards)
-- ████████████████████████████████████████████████████████████

SELECT
    wg.title AS workgroup,
    ws.name AS worksite,
    j.title AS job,
    j.status,
    j.budget,
    j.est_duration_days,
    j.sequence
FROM jobs j
JOIN workgroups wg ON j.workgroup_id = wg.id
JOIN worksites ws ON wg.worksite_id = ws.id
ORDER BY ws.name, wg.title, j.sequence;


-- ████████████████████████████████████████████████████████████
-- 6. JOB STATUS SUMMARY
-- ████████████████████████████████████████████████████████████

SELECT
    j.status,
    COUNT(*) AS count,
    COALESCE(SUM(j.budget), 0) AS total_budget
FROM jobs j
GROUP BY j.status
ORDER BY
    CASE j.status
        WHEN 'paid' THEN 1
        WHEN 'invoiced' THEN 2
        WHEN 'complete' THEN 3
        WHEN 'in_progress' THEN 4
        WHEN 'not_started' THEN 5
    END;


-- ████████████████████████████████████████████████████████████
-- 7. BUDGET TRACKING (matches portfolio budget bar)
-- ████████████████████████████████████████████████████████████

SELECT
    p.title,
    p.total_budget,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status NOT IN ('paid','rejected','draft')), 0) AS total_invoiced_pending,
    p.total_budget
        - COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0)
        - COALESCE(SUM(i.amount) FILTER (WHERE i.status NOT IN ('paid','rejected','draft')), 0)
        AS remaining
FROM projects p
LEFT JOIN worksites ws ON p.id = ws.project_id
LEFT JOIN workgroups wg ON ws.id = wg.worksite_id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
WHERE p.org_id = 'a0000000-0000-0000-0000-000000000001'
GROUP BY p.id;


-- ████████████████████████████████████████████████████████████
-- 8. INVOICES (matches budget paid/invoiced breakdown)
-- ████████████████████████████████████████████████████████████

SELECT
    i.invoice_number,
    i.amount,
    i.status AS invoice_status,
    wg.title AS workgroup,
    c.company_name AS contractor,
    ws.name AS worksite,
    i.line_items,
    i.created_at
FROM invoices i
JOIN workgroups wg ON i.workgroup_id = wg.id
JOIN contractors c ON i.contractor_id = c.id
JOIN worksites ws ON wg.worksite_id = ws.id
ORDER BY i.created_at;


-- ████████████████████████████████████████████████████████████
-- 9. WORKGROUP DEPENDENCIES (matches "Blocked by" pills)
-- ████████████████████████████████████████████████████████████

SELECT
    wg1.title AS workgroup,
    ws1.name AS at_site,
    wg2.title AS depends_on,
    wg2.status AS dependency_status,
    wd.dependency_type,
    CASE WHEN wg2.status = 'complete' THEN true ELSE false END AS is_satisfied
FROM workgroup_dependencies wd
JOIN workgroups wg1 ON wd.workgroup_id = wg1.id
JOIN workgroups wg2 ON wd.depends_on_workgroup_id = wg2.id
JOIN worksites ws1 ON wg1.worksite_id = ws1.id
ORDER BY ws1.name, wg1.title;


-- ████████████████████████████████████████████████████████████
-- 10. CONTRACTORS & ASSIGNMENTS
-- ████████████████████████████████████████████████████████████

SELECT
    c.company_name,
    c.owner_name,
    c.rating,
    c.verification_status,
    c.skills,
    COUNT(DISTINCT wg.id) AS assigned_workgroups,
    COUNT(DISTINCT wg.id) FILTER (WHERE wg.status = 'in_progress') AS active_workgroups,
    COALESCE(SUM(wg.budget), 0) AS total_assigned_budget
FROM contractors c
LEFT JOIN workgroups wg ON c.id = wg.contractor_id
GROUP BY c.id
ORDER BY c.company_name;


-- ████████████████████████████████████████████████████████████
-- 11. WORKSITE CONTACTS
-- ████████████████████████████████████████████████████████████

SELECT
    ws.name AS worksite,
    be.first_name || ' ' || be.last_name AS contact_name,
    be.role,
    be.email,
    be.phone,
    wc.contact_role
FROM worksite_contacts wc
JOIN worksites ws ON wc.worksite_id = ws.id
JOIN business_employees be ON wc.employee_id = be.id
ORDER BY ws.name, wc.contact_role;


-- ████████████████████████████████████████████████████████████
-- 12. V_PROJECT_OVERVIEW (the view used by dashboard_queries)
-- ████████████████████████████████████████████████████████████

SELECT * FROM v_project_overview;


-- ████████████████████████████████████████████████████████████
-- 13. WORKGROUP STATUS DISTRIBUTION
-- ████████████████████████████████████████████████████████████

SELECT
    wg.status,
    COUNT(*) AS count,
    COALESCE(SUM(wg.budget), 0) AS total_budget
FROM workgroups wg
GROUP BY wg.status
ORDER BY
    CASE wg.status
        WHEN 'complete' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'pending' THEN 3
        WHEN 'accepted' THEN 4
        WHEN 'draft' THEN 5
    END;


-- ████████████████████████████████████████████████████████████
-- 14. DATA INTEGRITY CHECKS
-- ████████████████████████████████████████████████████████████

-- Orphan workgroups (no worksite)
SELECT 'orphan_workgroups' AS check_name,
    COUNT(*) AS issues
FROM workgroups wg
WHERE NOT EXISTS (SELECT 1 FROM worksites ws WHERE ws.id = wg.worksite_id);

-- Orphan jobs (no workgroup)
SELECT 'orphan_jobs' AS check_name,
    COUNT(*) AS issues
FROM jobs j
WHERE NOT EXISTS (SELECT 1 FROM workgroups wg WHERE wg.id = j.workgroup_id);

-- Workgroups without contractor
SELECT 'unassigned_workgroups' AS check_name,
    COUNT(*) AS issues
FROM workgroups wg
WHERE wg.contractor_id IS NULL;

-- Jobs budget exceeds workgroup budget
SELECT 'budget_overrun_workgroups' AS check_name,
    COUNT(*) AS issues
FROM (
    SELECT wg.id, wg.budget AS wg_budget, SUM(j.budget) AS jobs_total
    FROM workgroups wg
    JOIN jobs j ON wg.id = j.workgroup_id
    WHERE wg.budget IS NOT NULL
    GROUP BY wg.id
    HAVING SUM(j.budget) > wg.budget
) overruns;

-- Worksite budget vs workgroup budgets
SELECT
    ws.name,
    ws.budget AS site_budget,
    SUM(wg.budget) AS workgroup_total,
    ws.budget - SUM(wg.budget) AS variance
FROM worksites ws
JOIN workgroups wg ON ws.id = wg.worksite_id
WHERE ws.budget IS NOT NULL
GROUP BY ws.id
HAVING ABS(ws.budget - SUM(wg.budget)) > 0.01
ORDER BY ws.name;


-- ████████████████████████████████████████████████████████████
-- 15. QUICK DASHBOARD COMPARISON
-- Run this and compare with what the UI shows
-- ████████████████████████████████████████████████████████████

SELECT
    '--- DASHBOARD SHOULD SHOW ---' AS label, NULL AS value
UNION ALL
SELECT 'Project', p.title FROM projects p WHERE org_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1
UNION ALL
SELECT 'Total Budget', '$' || TO_CHAR(p.total_budget, 'FM999,999') FROM projects p WHERE org_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1
UNION ALL
SELECT 'Sites', COUNT(*)::text FROM worksites WHERE project_id = 'd0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Workgroups', COUNT(*)::text FROM workgroups wg JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Total Jobs', COUNT(*)::text FROM jobs j JOIN workgroups wg ON j.workgroup_id = wg.id JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Jobs Done', COUNT(*)::text FROM jobs j JOIN workgroups wg ON j.workgroup_id = wg.id JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001' AND j.status IN ('complete','invoiced','paid')
UNION ALL
SELECT 'Jobs Active', COUNT(*)::text FROM jobs j JOIN workgroups wg ON j.workgroup_id = wg.id JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001' AND j.status = 'in_progress'
UNION ALL
SELECT 'WG Active', COUNT(*)::text FROM workgroups wg JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001' AND wg.status = 'in_progress'
UNION ALL
SELECT 'WG Pending', COUNT(*)::text FROM workgroups wg JOIN worksites ws ON wg.worksite_id = ws.id WHERE ws.project_id = 'd0000000-0000-0000-0000-000000000001' AND wg.status = 'pending'
UNION ALL
SELECT 'Paid (invoices)', '$' || COALESCE(TO_CHAR(SUM(i.amount), 'FM999,999'), '0') FROM invoices i WHERE i.status = 'paid'
UNION ALL
SELECT 'Invoiced (pending)', '$' || COALESCE(TO_CHAR(SUM(i.amount), 'FM999,999'), '0') FROM invoices i WHERE i.status NOT IN ('paid','rejected','draft')
UNION ALL
SELECT 'Dependencies', COUNT(*)::text FROM workgroup_dependencies;


-- ============================================================
-- END OF VERIFICATION QUERIES
-- ============================================================
