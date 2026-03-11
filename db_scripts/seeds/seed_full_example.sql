-- ============================================================
-- CMS SEED DATA — Full Example Scenario
-- Source: Spec v5.0 — "ABC Properties Multi-Site Renovation"
--
-- Run: After all schema files (001-006)
-- Creates: 1 org, 3 employees, 6 contractors, 1 project,
--          3 worksites, 8 workgroups, 20+ jobs
-- ============================================================

-- ── Organization ──────────────────────────────────────────

INSERT INTO organizations (id, name, template) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ABC Properties LLC', 'general_contracting');

-- ── Business Employees ────────────────────────────────────

INSERT INTO business_employees (id, org_id, first_name, last_name, email, phone, role) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Sarah', 'Johnson', 'sarah@abcproperties.com', '(512) 555-1001', 'Project Manager'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Mike', 'Chen', 'mike@abcproperties.com', '(512) 555-1002', 'Site Supervisor'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Lisa', 'Park', 'lisa@abcproperties.com', '(512) 555-1003', 'Operations Coordinator');

-- ── Contractors ───────────────────────────────────────────

INSERT INTO contractors (id, org_id, company_name, owner_name, email, phone, skills, city, state, zip_code, rating, verification_status) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'John''s Roofing LLC', 'John Martinez',
     'john@johnsroofing.com', '(512) 555-2001',
     ARRAY['Roofing', 'Gutters', 'Waterproofing'],
     'Austin', 'TX', '78745', 4.7, 'verified'),

    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Spark Electric Co', 'Bob Watts',
     'bob@sparkelectric.com', '(512) 555-2002',
     ARRAY['Electrical', 'EV Chargers', 'Lighting'],
     'Austin', 'TX', '78701', 4.5, 'verified'),

    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Austin Plumbing Pros', 'Amy Rivera',
     'amy@austinplumbing.com', '(512) 555-2003',
     ARRAY['Plumbing', 'Water Lines', 'Fixtures'],
     'Austin', 'TX', '78702', 4.8, 'verified'),

    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'ColorWorks Painting', 'Dan Brooks',
     'dan@colorworks.com', '(512) 555-2004',
     ARRAY['Interior Painting', 'Exterior Painting'],
     'Round Rock', 'TX', '78664', 4.3, 'verified'),

    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'CoolAir HVAC', 'Eve Santos',
     'eve@coolair.com', '(512) 555-2005',
     ARRAY['HVAC', 'Ductwork', 'AC Installation'],
     'Austin', 'TX', '78748', 4.6, 'verified'),

    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
     'Premium Floors', 'Frank Lee',
     'frank@premiumfloors.com', '(512) 555-2006',
     ARRAY['Flooring', 'Hardwood', 'Tile'],
     'Round Rock', 'TX', '78681', 4.4, 'pending');

-- ── Project ───────────────────────────────────────────────

INSERT INTO projects (id, org_id, title, description, total_budget, start_date, end_date, status) VALUES
    ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'ABC Properties — Multi-Site Renovation',
     'Multi-site renovation across 3 properties in Austin/Round Rock area.',
     185000.00, '2026-03-01', '2026-09-30', 'active');

-- ── Worksites ─────────────────────────────────────────────

INSERT INTO worksites (id, project_id, name, address_line1, city, state, zip_code, phone, site_notes, geo_latitude, geo_longitude, geo_fence_radius_m, budget, start_date, end_date, status) VALUES
    ('s0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001',
     '123 Main St, Austin TX', '123 Main St', 'Austin', 'TX', '78701',
     '(512) 555-0101', 'Two-story residential, built 1985',
     30.2672000, -97.7431000, 200,
     85000.00, '2026-03-01', '2026-06-30', 'active'),

    ('s0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001',
     '456 Oak Ave, Austin TX', '456 Oak Ave', 'Austin', 'TX', '78702',
     '(512) 555-0202', NULL,
     30.2590000, -97.7250000, 300,
     55000.00, '2026-04-01', '2026-07-15', 'active'),

    ('s0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001',
     '789 Elm St, Round Rock TX', '789 Elm St', 'Round Rock', 'TX', '78664',
     '(512) 555-0303', NULL,
     30.5083000, -97.6789000, 150,
     45000.00, NULL, NULL, 'active');

-- ── Worksite Contacts ─────────────────────────────────────

INSERT INTO worksite_contacts (worksite_id, employee_id, contact_role) VALUES
    -- 123 Main St: Sarah (primary) + Mike (secondary)
    ('s0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'primary'),
    ('s0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'secondary'),
    -- 456 Oak Ave: Mike (primary) + Lisa (secondary)
    ('s0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'primary'),
    ('s0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'secondary'),
    -- 789 Elm St: Sarah (primary)
    ('s0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'primary');

-- ── Workgroups ────────────────────────────────────────────

INSERT INTO workgroups (id, worksite_id, contractor_id, title, trade, budget, start_date, end_date, status) VALUES
    -- Worksite 1: 123 Main St
    ('w0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001', 'Roofing', 'Roofing',
     15000.00, '2026-03-01', '2026-03-15', 'in_progress'),

    ('w0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     15000.00, '2026-03-10', '2026-03-25', 'in_progress'),

    ('w0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000003', 'Plumbing', 'Plumbing',
     20000.00, '2026-03-15', '2026-04-05', 'pending'),

    ('w0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     12000.00, '2026-04-10', '2026-04-30', 'draft'),

    -- Worksite 2: 456 Oak Ave
    ('w0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000005', 'HVAC', 'HVAC',
     35000.00, '2026-04-01', '2026-04-20', 'pending'),

    ('w0000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     12000.00, '2026-04-15', '2026-04-25', 'draft'),

    -- Worksite 3: 789 Elm St
    ('w0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000003',
     'c0000000-0000-0000-0000-000000000006', 'Flooring', 'Flooring',
     25000.00, NULL, NULL, 'pending'),

    ('w0000000-0000-0000-0000-000000000008', 's0000000-0000-0000-0000-000000000003',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     10000.00, NULL, NULL, 'draft');

-- ── Jobs ──────────────────────────────────────────────────

INSERT INTO jobs (id, workgroup_id, title, description, budget, est_duration_days, sequence, status) VALUES
    -- WG1: Roofing @ 123 Main St
    ('j0000000-0000-0000-0000-000000000001', 'w0000000-0000-0000-0000-000000000001',
     'Remove old shingles', NULL, 2000.00, 2, 1, 'complete'),
    ('j0000000-0000-0000-0000-000000000002', 'w0000000-0000-0000-0000-000000000001',
     'Repair roof deck', NULL, 4000.00, 3, 2, 'in_progress'),
    ('j0000000-0000-0000-0000-000000000003', 'w0000000-0000-0000-0000-000000000001',
     'Install new shingles', NULL, 7000.00, 4, 3, 'not_started'),
    ('j0000000-0000-0000-0000-000000000004', 'w0000000-0000-0000-0000-000000000001',
     'Install gutters', NULL, 2000.00, 1, 4, 'not_started'),

    -- WG2: Electrical @ 123 Main St
    ('j0000000-0000-0000-0000-000000000005', 'w0000000-0000-0000-0000-000000000002',
     'Rewire main panel', NULL, 6000.00, 3, 1, 'complete'),
    ('j0000000-0000-0000-0000-000000000006', 'w0000000-0000-0000-0000-000000000002',
     'Install new outlets (kitchen)', NULL, 4000.00, 2, 2, 'in_progress'),
    ('j0000000-0000-0000-0000-000000000007', 'w0000000-0000-0000-0000-000000000002',
     'Install lighting fixtures', NULL, 5000.00, 2, 3, 'not_started'),

    -- WG3: Plumbing @ 123 Main St
    ('j0000000-0000-0000-0000-000000000008', 'w0000000-0000-0000-0000-000000000003',
     'Replace main water line', NULL, 8000.00, 3, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000009', 'w0000000-0000-0000-0000-000000000003',
     'Install new bathroom fixtures', NULL, 6000.00, 2, 2, 'not_started'),
    ('j0000000-0000-0000-0000-000000000010', 'w0000000-0000-0000-0000-000000000003',
     'Install kitchen plumbing', NULL, 6000.00, 2, 3, 'not_started'),

    -- WG4: Painting @ 123 Main St
    ('j0000000-0000-0000-0000-000000000011', 'w0000000-0000-0000-0000-000000000004',
     'Interior painting (bedrooms)', NULL, 4000.00, 3, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000012', 'w0000000-0000-0000-0000-000000000004',
     'Interior painting (kitchen/living)', NULL, 4000.00, 3, 2, 'not_started'),
    ('j0000000-0000-0000-0000-000000000013', 'w0000000-0000-0000-0000-000000000004',
     'Exterior painting', NULL, 4000.00, 4, 3, 'not_started'),

    -- WG5: HVAC @ 456 Oak Ave
    ('j0000000-0000-0000-0000-000000000014', 'w0000000-0000-0000-0000-000000000005',
     'Remove old HVAC system', NULL, 5000.00, 2, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000015', 'w0000000-0000-0000-0000-000000000005',
     'Install new ductwork', NULL, 15000.00, 5, 2, 'not_started'),
    ('j0000000-0000-0000-0000-000000000016', 'w0000000-0000-0000-0000-000000000005',
     'Install new AC unit', NULL, 15000.00, 3, 3, 'not_started'),

    -- WG6: Electrical @ 456 Oak Ave
    ('j0000000-0000-0000-0000-000000000017', 'w0000000-0000-0000-0000-000000000006',
     'Upgrade electrical panel', NULL, 7000.00, 2, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000018', 'w0000000-0000-0000-0000-000000000006',
     'Install EV charger', NULL, 5000.00, 1, 2, 'not_started'),

    -- WG7: Flooring @ 789 Elm St
    ('j0000000-0000-0000-0000-000000000019', 'w0000000-0000-0000-0000-000000000007',
     'Remove carpet', NULL, 3000.00, 1, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000020', 'w0000000-0000-0000-0000-000000000007',
     'Prepare subfloor', NULL, 7000.00, 3, 2, 'not_started'),
    ('j0000000-0000-0000-0000-000000000021', 'w0000000-0000-0000-0000-000000000007',
     'Install hardwood', NULL, 15000.00, 5, 3, 'not_started'),

    -- WG8: Painting @ 789 Elm St
    ('j0000000-0000-0000-0000-000000000022', 'w0000000-0000-0000-0000-000000000008',
     'Interior painting', NULL, 5000.00, 3, 1, 'not_started'),
    ('j0000000-0000-0000-0000-000000000023', 'w0000000-0000-0000-0000-000000000008',
     'Exterior painting', NULL, 5000.00, 4, 2, 'not_started');

-- ── Contractor Workers (example self-identified workers) ──

INSERT INTO contractor_workers (id, contractor_id, first_name, last_name, phone, email) VALUES
    ('cw000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'John', 'Martinez', '(512) 555-2001', 'john@johnsroofing.com'),
    ('cw000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
     'Carlos', 'Rivera', '(512) 555-2002', NULL),
    ('cw000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
     'David', 'Kim', '(512) 555-2003', NULL),
    ('cw000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
     'Maria', 'Santos', '(512) 555-2004', NULL);

-- ── Summary ───────────────────────────────────────────────
-- Organization:  1   (ABC Properties LLC)
-- Employees:     3   (Sarah, Mike, Lisa)
-- Contractors:   6   (Roofing, Electrical, Plumbing, Painting, HVAC, Flooring)
-- Workers:       4   (at John's Roofing — others self-ID on first QR access)
-- Project:       1   ($185K multi-site renovation)
-- Worksites:     3   (123 Main, 456 Oak, 789 Elm)
-- Contacts:      5   assignments (primary + secondary)
-- Workgroups:    8   (across 3 worksites)
-- Jobs:          23  (across 8 workgroups)
