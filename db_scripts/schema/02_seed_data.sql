-- ============================================================
-- CMS SEED DATA — Full Example Scenario
-- Run: AFTER 01_full_schema.sql in Supabase SQL Editor
--
-- Creates: 1 org, 3 employees, 6 contractors, 4 workers,
--          1 project, 3 worksites, 5 contacts, 8 workgroups, 23 jobs
-- ============================================================

-- ── Organization ──────────────────────────────────────────

INSERT INTO organizations (id, name, template) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ABC Properties LLC', 'general_contracting');

-- ── Business Employees ────────────────────────────────────

INSERT INTO business_employees (id, org_id, first_name, last_name, email, phone, role) VALUES
    ('be000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Sarah', 'Johnson', 'sarah@abcproperties.com', '(512) 555-1001', 'Project Manager'),
    ('be000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Mike', 'Chen', 'mike@abcproperties.com', '(512) 555-1002', 'Site Supervisor'),
    ('be000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
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
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'ABC Properties — Multi-Site Renovation',
     'Multi-site renovation across 3 properties in Austin/Round Rock area.',
     185000.00, '2026-03-01', '2026-09-30', 'active');

-- ── Worksites ─────────────────────────────────────────────

INSERT INTO worksites (id, project_id, name, address_line1, city, state, zip_code, phone, site_notes, geo_latitude, geo_longitude, geo_fence_radius_m, budget, start_date, end_date, status) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     '123 Main St, Austin TX', '123 Main St', 'Austin', 'TX', '78701',
     '(512) 555-0101', 'Two-story residential, built 1985',
     30.2672000, -97.7431000, 200,
     85000.00, '2026-03-01', '2026-06-30', 'active'),

    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
     '456 Oak Ave, Austin TX', '456 Oak Ave', 'Austin', 'TX', '78702',
     '(512) 555-0202', NULL,
     30.2590000, -97.7250000, 300,
     55000.00, '2026-04-01', '2026-07-15', 'active'),

    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
     '789 Elm St, Round Rock TX', '789 Elm St', 'Round Rock', 'TX', '78664',
     '(512) 555-0303', NULL,
     30.5083000, -97.6789000, 150,
     45000.00, NULL, NULL, 'active');

-- ── Worksite Contacts ─────────────────────────────────────

INSERT INTO worksite_contacts (worksite_id, employee_id, contact_role) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000001', 'primary'),
    ('e0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000002', 'secondary'),
    ('e0000000-0000-0000-0000-000000000002', 'be000000-0000-0000-0000-000000000002', 'primary'),
    ('e0000000-0000-0000-0000-000000000002', 'be000000-0000-0000-0000-000000000003', 'secondary'),
    ('e0000000-0000-0000-0000-000000000003', 'be000000-0000-0000-0000-000000000001', 'primary');

-- ── Workgroups ────────────────────────────────────────────

INSERT INTO workgroups (id, worksite_id, contractor_id, title, trade, budget, start_date, end_date, status) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001', 'Roofing', 'Roofing',
     15000.00, '2026-03-01', '2026-03-15', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     15000.00, '2026-03-10', '2026-03-25', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000003', 'Plumbing', 'Plumbing',
     20000.00, '2026-03-15', '2026-04-05', 'pending'),

    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     12000.00, '2026-04-10', '2026-04-30', 'draft'),

    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000005', 'HVAC', 'HVAC',
     35000.00, '2026-04-01', '2026-04-20', 'pending'),

    ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     12000.00, '2026-04-15', '2026-04-25', 'draft'),

    ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000003',
     'c0000000-0000-0000-0000-000000000006', 'Flooring', 'Flooring',
     25000.00, NULL, NULL, 'pending'),

    ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000003',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     10000.00, NULL, NULL, 'draft');

-- ── Jobs ──────────────────────────────────────────────────

INSERT INTO jobs (id, workgroup_id, title, description, budget, est_duration_days, sequence, status) VALUES
    ('aa000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
     'Remove old shingles', NULL, 2000.00, 2, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001',
     'Repair roof deck', NULL, 4000.00, 3, 2, 'in_progress'),
    ('aa000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001',
     'Install new shingles', NULL, 7000.00, 4, 3, 'not_started'),
    ('aa000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001',
     'Install gutters', NULL, 2000.00, 1, 4, 'not_started'),

    ('aa000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002',
     'Rewire main panel', NULL, 6000.00, 3, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000002',
     'Install new outlets (kitchen)', NULL, 4000.00, 2, 2, 'in_progress'),
    ('aa000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000002',
     'Install lighting fixtures', NULL, 5000.00, 2, 3, 'not_started'),

    ('aa000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000003',
     'Replace main water line', NULL, 8000.00, 3, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000003',
     'Install new bathroom fixtures', NULL, 6000.00, 2, 2, 'not_started'),
    ('aa000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000003',
     'Install kitchen plumbing', NULL, 6000.00, 2, 3, 'not_started'),

    ('aa000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000004',
     'Interior painting (bedrooms)', NULL, 4000.00, 3, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000004',
     'Interior painting (kitchen/living)', NULL, 4000.00, 3, 2, 'not_started'),
    ('aa000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000004',
     'Exterior painting', NULL, 4000.00, 4, 3, 'not_started'),

    ('aa000000-0000-0000-0000-000000000014', 'f0000000-0000-0000-0000-000000000005',
     'Remove old HVAC system', NULL, 5000.00, 2, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000015', 'f0000000-0000-0000-0000-000000000005',
     'Install new ductwork', NULL, 15000.00, 5, 2, 'not_started'),
    ('aa000000-0000-0000-0000-000000000016', 'f0000000-0000-0000-0000-000000000005',
     'Install new AC unit', NULL, 15000.00, 3, 3, 'not_started'),

    ('aa000000-0000-0000-0000-000000000017', 'f0000000-0000-0000-0000-000000000006',
     'Upgrade electrical panel', NULL, 7000.00, 2, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000018', 'f0000000-0000-0000-0000-000000000006',
     'Install EV charger', NULL, 5000.00, 1, 2, 'not_started'),

    ('aa000000-0000-0000-0000-000000000019', 'f0000000-0000-0000-0000-000000000007',
     'Remove carpet', NULL, 3000.00, 1, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000020', 'f0000000-0000-0000-0000-000000000007',
     'Prepare subfloor', NULL, 7000.00, 3, 2, 'not_started'),
    ('aa000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000007',
     'Install hardwood', NULL, 15000.00, 5, 3, 'not_started'),

    ('aa000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000008',
     'Interior painting', NULL, 5000.00, 3, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000008',
     'Exterior painting', NULL, 5000.00, 4, 2, 'not_started');

-- ── Contractor Workers (example self-identified workers) ──

INSERT INTO contractor_workers (id, contractor_id, first_name, last_name, phone, email) VALUES
    ('ab000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'John', 'Martinez', '(512) 555-2001', 'john@johnsroofing.com'),
    ('ab000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
     'Carlos', 'Rivera', '(512) 555-2002', NULL),
    ('ab000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
     'David', 'Kim', '(512) 555-2003', NULL),
    ('ab000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
     'Maria', 'Santos', '(512) 555-2004', NULL);


-- ============================================================
-- SEED COMPLETE
--
-- UUID prefix key (all valid hex):
--   a0 = org        be = employees    c0 = contractors
--   d0 = project    e0 = worksites    f0 = workgroups
--   aa = jobs       ab = workers
-- ============================================================
