-- ============================================================
-- CMS EXTENDED SEED DATA — Rich Dashboard Experience
-- Run: AFTER 03_seed_invoices_deps.sql in Supabase SQL Editor
--
-- Adds:
--   2 new projects (Johnson Residence, Westfield Office)
--   6 new worksites, 14 new workgroups, 42 new jobs
--   8 new invoices (various statuses)
--   3 new contractors, 6 new workers
--   12 audit log entries (activity feed)
--   8 site check-ins (GPS presence)
--   Workgroup dependencies for new projects
--
-- After running: Dashboard shows 3 projects, rich invoices,
-- activity feed, and GPS presence data.
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- NEW CONTRACTORS (for the new projects)
-- ████████████████████████████████████████████████████████████

INSERT INTO contractors (id, org_id, company_name, owner_name, email, phone, skills, city, state, zip_code, rating, verification_status) VALUES
    ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
     'Woodcraft Plus', 'Greg Hoffman',
     'greg@woodcraftplus.com', '(512) 555-2007',
     ARRAY['Cabinets', 'Carpentry', 'Trim Work'],
     'Austin', 'TX', '78704', 4.9, 'verified'),

    ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
     'ProWall LLC', 'Hannah Torres',
     'hannah@prowall.com', '(512) 555-2008',
     ARRAY['Drywall', 'Plastering', 'Texture'],
     'Cedar Park', 'TX', '78613', 4.2, 'verified'),

    ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
     'Lone Star Tile', 'Isaac Reyes',
     'isaac@lonestartile.com', '(512) 555-2009',
     ARRAY['Tile', 'Backsplash', 'Stone Work'],
     'Round Rock', 'TX', '78664', 4.6, 'verified');

-- ── Additional Workers ────────────────────────────────────

INSERT INTO contractor_workers (id, contractor_id, first_name, last_name, phone, email) VALUES
    ('ab000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002',
     'Bob', 'Watts', '(512) 555-2002', 'bob@sparkelectric.com'),
    ('ab000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003',
     'Amy', 'Rivera', '(512) 555-2003', 'amy@austinplumbing.com'),
    ('ab000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005',
     'Eve', 'Santos', '(512) 555-2005', 'eve@coolair.com'),
    ('ab000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000007',
     'Greg', 'Hoffman', '(512) 555-2007', 'greg@woodcraftplus.com'),
    ('ab000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000008',
     'Hannah', 'Torres', '(512) 555-2008', 'hannah@prowall.com'),
    ('ab000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000009',
     'Isaac', 'Reyes', '(512) 555-2009', 'isaac@lonestartile.com');


-- ████████████████████████████████████████████████████████████
-- PROJECT 2: Johnson Residence — Kitchen Remodel ($48K)
-- ████████████████████████████████████████████████████████████

INSERT INTO projects (id, org_id, title, description, total_budget, start_date, end_date, status) VALUES
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Johnson Residence — Kitchen Remodel',
     'Full kitchen renovation including cabinets, countertops, plumbing, electrical, and painting.',
     48000.00, '2026-01-15', '2026-04-15', 'active');

-- ── Worksite ──────────────────────────────────────────────

INSERT INTO worksites (id, project_id, name, address_line1, city, state, zip_code, phone, site_notes, geo_latitude, geo_longitude, geo_fence_radius_m, budget, start_date, end_date, status) VALUES
    ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     '42 Maple Dr, Austin TX', '42 Maple Dr', 'Austin', 'TX', '78703',
     '(512) 555-0404', 'Single-story ranch, 1972. Kitchen is 180 sq ft.',
     30.2950000, -97.7560000, 150,
     48000.00, '2026-01-15', '2026-04-15', 'in_progress');

INSERT INTO worksite_contacts (worksite_id, employee_id, contact_role) VALUES
    ('e0000000-0000-0000-0000-000000000004', 'be000000-0000-0000-0000-000000000003', 'primary');

-- ── Workgroups ────────────────────────────────────────────

INSERT INTO workgroups (id, worksite_id, contractor_id, title, trade, budget, start_date, end_date, status) VALUES
    ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     8000.00, '2026-01-15', '2026-01-30', 'complete'),

    ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000003', 'Plumbing', 'Plumbing',
     10000.00, '2026-01-20', '2026-02-10', 'complete'),

    ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000008', 'Drywall', 'Drywall',
     6000.00, '2026-02-10', '2026-02-25', 'complete'),

    ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000007', 'Cabinets', 'Cabinets',
     12000.00, '2026-02-25', '2026-03-15', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000009', 'Tile & Backsplash', 'Tile',
     5000.00, '2026-03-10', '2026-03-25', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000004',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     7000.00, '2026-03-25', '2026-04-10', 'pending');

-- ── Dependencies ──────────────────────────────────────────
-- Drywall depends on Electrical + Plumbing (both done, so unblocked)
-- Cabinets depend on Drywall
-- Tile depends on Cabinets
-- Painting depends on Tile

INSERT INTO workgroup_dependencies (workgroup_id, depends_on_workgroup_id) VALUES
    ('f0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000010'),
    ('f0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000012'),
    ('f0000000-0000-0000-0000-000000000014', 'f0000000-0000-0000-0000-000000000013'),
    ('f0000000-0000-0000-0000-000000000015', 'f0000000-0000-0000-0000-000000000014');

-- ── Jobs ──────────────────────────────────────────────────

INSERT INTO jobs (id, workgroup_id, title, description, budget, est_duration_days, sequence, status) VALUES
    -- Electrical (complete)
    ('aa000000-0000-0000-0000-000000000027', 'f0000000-0000-0000-0000-000000000010',
     'Run new circuits', NULL, 4000.00, 3, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000028', 'f0000000-0000-0000-0000-000000000010',
     'Install under-cabinet lighting', NULL, 4000.00, 2, 2, 'paid'),

    -- Plumbing (complete)
    ('aa000000-0000-0000-0000-000000000029', 'f0000000-0000-0000-0000-000000000011',
     'Relocate sink plumbing', NULL, 5000.00, 3, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000030', 'f0000000-0000-0000-0000-000000000011',
     'Install dishwasher hookup', NULL, 3000.00, 2, 2, 'paid'),
    ('aa000000-0000-0000-0000-000000000031', 'f0000000-0000-0000-0000-000000000011',
     'Install garbage disposal', NULL, 2000.00, 1, 3, 'paid'),

    -- Drywall (complete)
    ('aa000000-0000-0000-0000-000000000032', 'f0000000-0000-0000-0000-000000000012',
     'Patch and repair walls', NULL, 2500.00, 3, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000033', 'f0000000-0000-0000-0000-000000000012',
     'Texture and finish', NULL, 3500.00, 3, 2, 'paid'),

    -- Cabinets (in progress)
    ('aa000000-0000-0000-0000-000000000034', 'f0000000-0000-0000-0000-000000000013',
     'Remove old cabinets', NULL, 1500.00, 1, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000035', 'f0000000-0000-0000-0000-000000000013',
     'Install base cabinets', NULL, 5000.00, 3, 2, 'in_progress'),
    ('aa000000-0000-0000-0000-000000000036', 'f0000000-0000-0000-0000-000000000013',
     'Install upper cabinets', NULL, 3500.00, 2, 3, 'not_started'),
    ('aa000000-0000-0000-0000-000000000037', 'f0000000-0000-0000-0000-000000000013',
     'Install countertops', NULL, 2000.00, 2, 4, 'not_started'),

    -- Tile (in progress)
    ('aa000000-0000-0000-0000-000000000038', 'f0000000-0000-0000-0000-000000000014',
     'Prepare surfaces', NULL, 1500.00, 1, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000039', 'f0000000-0000-0000-0000-000000000014',
     'Install backsplash tile', NULL, 3500.00, 3, 2, 'in_progress'),

    -- Painting (pending)
    ('aa000000-0000-0000-0000-000000000040', 'f0000000-0000-0000-0000-000000000015',
     'Prime walls and ceiling', NULL, 3000.00, 2, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000041', 'f0000000-0000-0000-0000-000000000015',
     'Apply finish coats', NULL, 4000.00, 3, 2, 'not_started');

-- ── Invoices for Johnson Residence ────────────────────────

INSERT INTO invoices (workgroup_id, contractor_id, invoice_number, amount, status, line_items, submitted_at, paid_at) VALUES
    ('f0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002',
     'INV-2026-004', 8000.00, 'paid',
     '[{"description": "Run new circuits", "amount": 4000}, {"description": "Under-cabinet lighting", "amount": 4000}]',
     '2026-02-01 10:00:00+00', '2026-02-05 14:00:00+00'),

    ('f0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000003',
     'INV-2026-005', 10000.00, 'paid',
     '[{"description": "Relocate sink", "amount": 5000}, {"description": "Dishwasher hookup", "amount": 3000}, {"description": "Garbage disposal", "amount": 2000}]',
     '2026-02-12 09:00:00+00', '2026-02-15 16:00:00+00'),

    ('f0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000008',
     'INV-2026-006', 6000.00, 'paid',
     '[{"description": "Patch walls", "amount": 2500}, {"description": "Texture and finish", "amount": 3500}]',
     '2026-02-28 11:00:00+00', '2026-03-03 10:00:00+00'),

    ('f0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000007',
     'INV-2026-007', 1500.00, 'approved',
     '[{"description": "Remove old cabinets", "amount": 1500}]',
     '2026-03-08 14:00:00+00', NULL),

    ('f0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000009',
     'INV-2026-008', 1500.00, 'submitted',
     '[{"description": "Prepare surfaces", "amount": 1500}]',
     '2026-03-11 08:00:00+00', NULL);


-- ████████████████████████████████████████████████████████████
-- PROJECT 3: Westfield Office — Buildout Phase 2 ($120K)
-- ████████████████████████████████████████████████████████████

INSERT INTO projects (id, org_id, title, description, total_budget, start_date, end_date, status) VALUES
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Westfield Office — Buildout Phase 2',
     'Commercial office buildout: 2 floors, conference rooms, open workspace, server room.',
     120000.00, '2025-11-01', '2026-06-30', 'active');

-- ── Worksites ─────────────────────────────────────────────

INSERT INTO worksites (id, project_id, name, address_line1, city, state, zip_code, phone, site_notes, geo_latitude, geo_longitude, geo_fence_radius_m, budget, start_date, end_date, status) VALUES
    ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003',
     '800 Westfield Blvd Floor 2, Austin TX', '800 Westfield Blvd', 'Austin', 'TX', '78746',
     '(512) 555-0505', 'Floor 2 — open workspace + 3 conference rooms',
     30.2750000, -97.7700000, 250,
     70000.00, '2025-11-01', '2026-04-30', 'in_progress'),

    ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003',
     '800 Westfield Blvd Floor 3, Austin TX', '800 Westfield Blvd', 'Austin', 'TX', '78746',
     '(512) 555-0506', 'Floor 3 — executive suites + server room',
     30.2750000, -97.7700000, 250,
     50000.00, '2026-01-15', '2026-06-30', 'active');

INSERT INTO worksite_contacts (worksite_id, employee_id, contact_role) VALUES
    ('e0000000-0000-0000-0000-000000000005', 'be000000-0000-0000-0000-000000000002', 'primary'),
    ('e0000000-0000-0000-0000-000000000005', 'be000000-0000-0000-0000-000000000001', 'secondary'),
    ('e0000000-0000-0000-0000-000000000006', 'be000000-0000-0000-0000-000000000001', 'primary');

-- ── Workgroups (Floor 2) ──────────────────────────────────

INSERT INTO workgroups (id, worksite_id, contractor_id, title, trade, budget, start_date, end_date, status) VALUES
    ('f0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000005',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     18000.00, '2025-11-01', '2025-12-15', 'complete'),

    ('f0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000005',
     'c0000000-0000-0000-0000-000000000005', 'HVAC', 'HVAC',
     22000.00, '2025-12-01', '2026-01-15', 'complete'),

    ('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000005',
     'c0000000-0000-0000-0000-000000000008', 'Drywall', 'Drywall',
     12000.00, '2026-01-15', '2026-02-15', 'complete'),

    ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000005',
     'c0000000-0000-0000-0000-000000000006', 'Flooring', 'Flooring',
     10000.00, '2026-02-15', '2026-03-10', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000005',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     8000.00, '2026-03-10', '2026-04-01', 'pending');

-- ── Workgroups (Floor 3) ──────────────────────────────────

INSERT INTO workgroups (id, worksite_id, contractor_id, title, trade, budget, start_date, end_date, status) VALUES
    ('f0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000006',
     'c0000000-0000-0000-0000-000000000002', 'Electrical', 'Electrical',
     15000.00, '2026-01-15', '2026-02-28', 'in_progress'),

    ('f0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000006',
     'c0000000-0000-0000-0000-000000000005', 'HVAC + Server Room Cooling', 'HVAC',
     20000.00, '2026-02-15', '2026-04-01', 'pending'),

    ('f0000000-0000-0000-0000-000000000023', 'e0000000-0000-0000-0000-000000000006',
     'c0000000-0000-0000-0000-000000000004', 'Painting', 'Painting',
     15000.00, '2026-05-01', '2026-06-15', 'draft');

-- ── Dependencies (Westfield) ──────────────────────────────

INSERT INTO workgroup_dependencies (workgroup_id, depends_on_workgroup_id) VALUES
    -- Floor 2 chain
    ('f0000000-0000-0000-0000-000000000018', 'f0000000-0000-0000-0000-000000000016'),
    ('f0000000-0000-0000-0000-000000000018', 'f0000000-0000-0000-0000-000000000017'),
    ('f0000000-0000-0000-0000-000000000019', 'f0000000-0000-0000-0000-000000000018'),
    ('f0000000-0000-0000-0000-000000000020', 'f0000000-0000-0000-0000-000000000019'),
    -- Floor 3 chain
    ('f0000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000021'),
    ('f0000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000022');

-- ── Jobs (Floor 2) ────────────────────────────────────────

INSERT INTO jobs (id, workgroup_id, title, description, budget, est_duration_days, sequence, status) VALUES
    -- Electrical (complete)
    ('aa000000-0000-0000-0000-000000000042', 'f0000000-0000-0000-0000-000000000016',
     'Main panel upgrade', NULL, 6000.00, 3, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000043', 'f0000000-0000-0000-0000-000000000016',
     'Wire conference rooms', NULL, 5000.00, 4, 2, 'paid'),
    ('aa000000-0000-0000-0000-000000000044', 'f0000000-0000-0000-0000-000000000016',
     'Install data drops', NULL, 4000.00, 3, 3, 'paid'),
    ('aa000000-0000-0000-0000-000000000045', 'f0000000-0000-0000-0000-000000000016',
     'Lighting installation', NULL, 3000.00, 2, 4, 'paid'),

    -- HVAC (complete)
    ('aa000000-0000-0000-0000-000000000046', 'f0000000-0000-0000-0000-000000000017',
     'Remove old ductwork', NULL, 4000.00, 3, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000047', 'f0000000-0000-0000-0000-000000000017',
     'Install new VAV system', NULL, 12000.00, 7, 2, 'paid'),
    ('aa000000-0000-0000-0000-000000000048', 'f0000000-0000-0000-0000-000000000017',
     'Thermostat controls', NULL, 6000.00, 3, 3, 'paid'),

    -- Drywall (complete)
    ('aa000000-0000-0000-0000-000000000049', 'f0000000-0000-0000-0000-000000000018',
     'Frame conference rooms', NULL, 5000.00, 4, 1, 'paid'),
    ('aa000000-0000-0000-0000-000000000050', 'f0000000-0000-0000-0000-000000000018',
     'Hang and finish drywall', NULL, 7000.00, 5, 2, 'paid'),

    -- Flooring (in progress)
    ('aa000000-0000-0000-0000-000000000051', 'f0000000-0000-0000-0000-000000000019',
     'Remove old carpet', NULL, 2000.00, 2, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000052', 'f0000000-0000-0000-0000-000000000019',
     'Install LVP flooring', NULL, 6000.00, 5, 2, 'in_progress'),
    ('aa000000-0000-0000-0000-000000000053', 'f0000000-0000-0000-0000-000000000019',
     'Conference room carpet tiles', NULL, 2000.00, 2, 3, 'not_started'),

    -- Painting (pending)
    ('aa000000-0000-0000-0000-000000000054', 'f0000000-0000-0000-0000-000000000020',
     'Prime all surfaces', NULL, 3000.00, 2, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000055', 'f0000000-0000-0000-0000-000000000020',
     'Paint open workspace', NULL, 3000.00, 3, 2, 'not_started'),
    ('aa000000-0000-0000-0000-000000000056', 'f0000000-0000-0000-0000-000000000020',
     'Paint conference rooms', NULL, 2000.00, 2, 3, 'not_started');

-- ── Jobs (Floor 3) ────────────────────────────────────────

INSERT INTO jobs (id, workgroup_id, title, description, budget, est_duration_days, sequence, status) VALUES
    -- Electrical (in progress)
    ('aa000000-0000-0000-0000-000000000057', 'f0000000-0000-0000-0000-000000000021',
     'Wire executive suites', NULL, 5000.00, 4, 1, 'complete'),
    ('aa000000-0000-0000-0000-000000000058', 'f0000000-0000-0000-0000-000000000021',
     'Server room power', NULL, 7000.00, 5, 2, 'in_progress'),
    ('aa000000-0000-0000-0000-000000000059', 'f0000000-0000-0000-0000-000000000021',
     'Emergency lighting', NULL, 3000.00, 2, 3, 'not_started'),

    -- HVAC (pending)
    ('aa000000-0000-0000-0000-000000000060', 'f0000000-0000-0000-0000-000000000022',
     'Server room precision cooling', NULL, 12000.00, 5, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000061', 'f0000000-0000-0000-0000-000000000022',
     'Suite HVAC zones', NULL, 8000.00, 4, 2, 'not_started'),

    -- Painting (draft)
    ('aa000000-0000-0000-0000-000000000062', 'f0000000-0000-0000-0000-000000000023',
     'Executive suite painting', NULL, 8000.00, 4, 1, 'not_started'),
    ('aa000000-0000-0000-0000-000000000063', 'f0000000-0000-0000-0000-000000000023',
     'Common area painting', NULL, 7000.00, 3, 2, 'not_started');

-- ── Invoices for Westfield ────────────────────────────────

INSERT INTO invoices (workgroup_id, contractor_id, invoice_number, amount, status, line_items, submitted_at, paid_at) VALUES
    ('f0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000002',
     'INV-2026-009', 18000.00, 'paid',
     '[{"description": "Panel upgrade", "amount": 6000}, {"description": "Wire conference rooms", "amount": 5000}, {"description": "Data drops", "amount": 4000}, {"description": "Lighting", "amount": 3000}]',
     '2025-12-18 10:00:00+00', '2025-12-22 14:00:00+00'),

    ('f0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000005',
     'INV-2026-010', 22000.00, 'paid',
     '[{"description": "Remove ductwork", "amount": 4000}, {"description": "VAV system", "amount": 12000}, {"description": "Thermostats", "amount": 6000}]',
     '2026-01-18 09:00:00+00', '2026-01-22 16:00:00+00'),

    ('f0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000008',
     'INV-2026-011', 12000.00, 'paid',
     '[{"description": "Frame conference rooms", "amount": 5000}, {"description": "Drywall finish", "amount": 7000}]',
     '2026-02-18 11:00:00+00', '2026-02-21 10:00:00+00'),

    ('f0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-000000000006',
     'INV-2026-012', 2000.00, 'submitted',
     '[{"description": "Remove old carpet", "amount": 2000}]',
     '2026-03-10 14:00:00+00', NULL);


-- ████████████████████████████████████████████████████████████
-- AUDIT LOGS (Activity Feed)
-- ████████████████████████████████████████████████████████████

INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, changes, created_at) VALUES
    ('job', 'aa000000-0000-0000-0000-000000000005', 'status_changed', 'worker',
     '{"title": "Rewire main panel", "new_status": "complete", "worksite_name": "123 Main St", "display_text": "Spark Electric completed \"Rewire main panel\""}',
     NOW() - INTERVAL '2 hours'),

    ('invoice', 'a1000000-0000-0000-0000-000000000001', 'submitted', 'worker',
     '{"amount": 6000, "contractor": "Spark Electric Co", "worksite_name": "123 Main St", "display_text": "Spark Electric Co submitted invoice for $6,000"}',
     NOW() - INTERVAL '5 hours'),

    ('workgroup', 'f0000000-0000-0000-0000-000000000013', 'accepted', 'worker',
     '{"title": "Cabinets", "contractor": "Woodcraft Plus", "worksite_name": "42 Maple Dr", "display_text": "Woodcraft Plus accepted Cabinets workgroup"}',
     NOW() - INTERVAL '1 day'),

    ('message', 'a1000000-0000-0000-0000-000000000004', 'new_message', 'worker',
     '{"sender": "John''s Roofing LLC", "worksite_name": "123 Main St", "display_text": "New message from John''s Roofing LLC"}',
     NOW() - INTERVAL '1 day'),

    ('job', 'aa000000-0000-0000-0000-000000000051', 'status_changed', 'worker',
     '{"title": "Remove old carpet", "new_status": "complete", "worksite_name": "800 Westfield Blvd Floor 2", "display_text": "Premium Floors completed \"Remove old carpet\""}',
     NOW() - INTERVAL '2 days'),

    ('invoice', 'a1000000-0000-0000-0000-000000000002', 'paid', 'owner',
     '{"amount": 12000, "contractor": "ProWall LLC", "worksite_name": "800 Westfield Blvd Floor 2", "display_text": "Paid $12,000 to ProWall LLC for drywall work"}',
     NOW() - INTERVAL '2 days'),

    ('job', 'aa000000-0000-0000-0000-000000000038', 'status_changed', 'worker',
     '{"title": "Prepare surfaces", "new_status": "complete", "worksite_name": "42 Maple Dr", "display_text": "Lone Star Tile completed \"Prepare surfaces\""}',
     NOW() - INTERVAL '3 days'),

    ('workgroup', 'f0000000-0000-0000-0000-000000000020', 'created', 'owner',
     '{"title": "Painting", "contractor": "ColorWorks Painting", "worksite_name": "800 Westfield Blvd Floor 2", "display_text": "Painting workgroup sent to ColorWorks Painting for review"}',
     NOW() - INTERVAL '3 days'),

    ('checkin', 'a1000000-0000-0000-0000-000000000005', 'gps_verified', 'worker',
     '{"worker": "Bob Watts", "contractor": "Spark Electric Co", "worksite_name": "123 Main St", "display_text": "Bob Watts (Spark Electric) checked in at 123 Main St"}',
     NOW() - INTERVAL '4 hours'),

    ('job', 'aa000000-0000-0000-0000-000000000034', 'status_changed', 'worker',
     '{"title": "Remove old cabinets", "new_status": "complete", "worksite_name": "42 Maple Dr", "display_text": "Woodcraft Plus completed \"Remove old cabinets\""}',
     NOW() - INTERVAL '4 days'),

    ('invoice', 'a1000000-0000-0000-0000-000000000003', 'submitted', 'worker',
     '{"amount": 1500, "contractor": "Lone Star Tile", "worksite_name": "42 Maple Dr", "display_text": "Lone Star Tile submitted invoice for $1,500"}',
     NOW() - INTERVAL '12 hours'),

    ('workgroup', 'f0000000-0000-0000-0000-000000000022', 'status_changed', 'system',
     '{"title": "HVAC + Server Room Cooling", "new_status": "pending", "worksite_name": "800 Westfield Blvd Floor 3", "display_text": "HVAC workgroup sent to CoolAir HVAC — awaiting response"}',
     NOW() - INTERVAL '5 days');


-- ████████████████████████████████████████████████████████████
-- SITE CHECK-INS (GPS Presence)
-- ████████████████████████████████████████████████████████████

INSERT INTO site_checkins (workgroup_id, worksite_id, worker_id, geo_latitude, geo_longitude, distance_from_site_m, within_geo_fence, checked_in_at) VALUES
    -- Today's check-ins at 123 Main St
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'ab000000-0000-0000-0000-000000000001', 30.2672100, -97.7431200, 12.5, TRUE, NOW() - INTERVAL '3 hours'),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'ab000000-0000-0000-0000-000000000002', 30.2672300, -97.7430800, 18.2, TRUE, NOW() - INTERVAL '3 hours'),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',
     'ab000000-0000-0000-0000-000000000005', 30.2671800, -97.7431500, 22.1, TRUE, NOW() - INTERVAL '4 hours'),

    -- Today's check-ins at Johnson Residence
    ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000004',
     'ab000000-0000-0000-0000-000000000008', 30.2950200, -97.7560100, 8.3, TRUE, NOW() - INTERVAL '2 hours'),
    ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000004',
     'ab000000-0000-0000-0000-000000000010', 30.2949800, -97.7559900, 15.7, TRUE, NOW() - INTERVAL '2 hours'),

    -- Today's check-ins at Westfield Floor 2
    ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000005',
     'ab000000-0000-0000-0000-000000000004', 30.2750100, -97.7700200, 10.1, TRUE, NOW() - INTERVAL '5 hours'),

    -- Yesterday's check-in (for history)
    ('f0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000006',
     'ab000000-0000-0000-0000-000000000005', 30.2750300, -97.7699800, 14.5, TRUE, NOW() - INTERVAL '1 day'),

    -- Failed geo-fence check (outside range)
    ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000005',
     'ab000000-0000-0000-0000-000000000004', 30.2800000, -97.7750000, 620.0, FALSE, NOW() - INTERVAL '6 hours');


-- ████████████████████████████████████████████████████████████
-- UPDATE PROGRESS CASCADES
-- ████████████████████████████████████████████████████████████
-- Trigger progress recalculation for all affected entities

SELECT fn_recalculate_workgroup_progress(id) FROM workgroups;
SELECT fn_recalculate_worksite_progress(id) FROM worksites;
SELECT fn_recalculate_project_progress(id) FROM projects;


-- ============================================================
-- SEED COMPLETE
--
-- Dashboard should now show:
--   3 active projects
--   ABC Properties:  $185K budget, ~$8K spent, 2/26 jobs done
--   Johnson Residence: $48K budget, ~$25.5K spent, 9/16 jobs done
--   Westfield Office:  $120K budget, ~$54K spent, 12/22 jobs done
--   ~5 pending invoices across all projects
--   12 activity feed entries
--   8 GPS check-ins (6 verified, 1 failed geo-fence)
-- ============================================================
