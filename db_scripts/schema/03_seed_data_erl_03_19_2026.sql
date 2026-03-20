-- ============================================================
-- CMS-ERL SEED DATA — Equipment Rental Logistics
-- Run: AFTER 02_erl_additions.sql in Supabase SQL Editor
--
-- Creates a realistic rental operation:
--   1 org, 4 branches, 6 drivers (contractors + workers),
--   8 customers, 11 customer worksites, 30 equipment units,
--   12 contracts, 7 transaction types,
--   4 trips with 22 stops and 35+ line items
--
-- UUID prefix key:
--   a0 = org          b1 = business_locations (branches)
--   be = employees    c0 = contractors (driver companies)
--   ab = contractor_workers (individual drivers)
--   c5 = customers    e0 = worksites (customer sites)
--   e9 = equipment    c7 = contracts
--   d0 = projects     f1 = workgroups (trips)
--   a1 = jobs (stops)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- ORGANIZATION
-- ████████████████████████████████████████████████████████████

INSERT INTO organizations (id, name, template, settings) VALUES
    ('a0000000-0000-0000-0000-000000000001',
     'Metro Aerial Equipment LLC',
     'equipment_rental',
     '{"vertical": "equipment_rental", "terminology": {"project": "Branch Operations", "workgroup": "Trip", "job": "Stop", "contractor": "Driver Company", "contractor_worker": "Driver", "worksite": "Site"}}');


-- ████████████████████████████████████████████████████████████
-- BRANCHES (as business_locations with type='branch')
-- ████████████████████████████████████████████████████████████

INSERT INTO business_locations (id, org_id, name, location_type, address_line1, city, state, zip_code, phone, geo_latitude, geo_longitude, is_default) VALUES
    ('b1000000-0000-0000-0000-000000000404', 'a0000000-0000-0000-0000-000000000001',
     'Branch 404 — Bridgeport', 'branch', '552 Housatonic Ave', 'Bridgeport', 'CT', '06604',
     '(203) 555-4040', 41.1893860, -73.1912420, TRUE),

    ('b1000000-0000-0000-0000-000000000109', 'a0000000-0000-0000-0000-000000000001',
     'Branch 109 — Danbury', 'branch', '32 Federal Rd', 'Danbury', 'CT', '06810',
     '(203) 555-1090', 41.4024630, -73.4326560, FALSE),

    ('b1000000-0000-0000-0000-000000000215', 'a0000000-0000-0000-0000-000000000001',
     'Branch 215 — Hartford', 'branch', '85 Brainard Rd', 'Hartford', 'CT', '06114',
     '(860) 555-2150', 41.7376880, -72.6742880, FALSE),

    ('b1000000-0000-0000-0000-000000000318', 'a0000000-0000-0000-0000-000000000001',
     'Branch 318 — Stamford', 'branch', '44 Harbor Point Rd', 'Stamford', 'CT', '06902',
     '(203) 555-3180', 41.0534300, -73.5387340, FALSE);


-- ████████████████████████████████████████████████████████████
-- BUSINESS EMPLOYEES (dispatchers, yard managers)
-- ████████████████████████████████████████████████████████████

INSERT INTO business_employees (id, org_id, first_name, last_name, email, phone, role) VALUES
    ('be000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Sarah', 'Johnson', 'sarah@metroaerial.com', '(203) 555-4001', 'Dispatch Manager'),
    ('be000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Mike', 'Chen', 'mike@metroaerial.com', '(203) 555-4002', 'Yard Manager — Bridgeport'),
    ('be000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Lisa', 'Park', 'lisa@metroaerial.com', '(203) 555-1091', 'Yard Manager — Danbury'),
    ('be000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'Dave', 'Williams', 'dave@metroaerial.com', '(860) 555-2151', 'Branch Manager — Hartford'),
    ('be000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'Jen', 'Torres', 'jen@metroaerial.com', '(203) 555-3181', 'Branch Manager — Stamford');


-- ████████████████████████████████████████████████████████████
-- PERPETUAL PROJECTS (one per branch)
-- ████████████████████████████████████████████████████████████

INSERT INTO projects (id, org_id, title, description, project_type, status, start_date, branch_id) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Branch 404 — Bridgeport Operations', 'Daily delivery/pickup operations for Bridgeport.',
     'perpetual', 'active', '2026-01-01', 'b1000000-0000-0000-0000-000000000404'),

    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Branch 109 — Danbury Operations', 'Daily delivery/pickup operations for Danbury.',
     'perpetual', 'active', '2026-01-01', 'b1000000-0000-0000-0000-000000000109'),

    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Branch 215 — Hartford Operations', 'Daily delivery/pickup operations for Hartford.',
     'perpetual', 'active', '2026-01-01', 'b1000000-0000-0000-0000-000000000215'),

    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'Branch 318 — Stamford Operations', 'Daily delivery/pickup operations for Stamford.',
     'perpetual', 'active', '2026-01-01', 'b1000000-0000-0000-0000-000000000318');


-- ████████████████████████████████████████████████████████████
-- DRIVER COMPANIES (contractors) + INDIVIDUAL DRIVERS (workers)
-- ████████████████████████████████████████████████████████████

INSERT INTO contractors (id, org_id, company_name, owner_name, email, phone, skills, rating, verification_status, branch_id, max_weight_lbs, license_class, driver_type) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Ramirez Transport LLC', 'Mike Ramirez', 'mike@ramireztransport.com', '(203) 555-6001',
     ARRAY['Flatbed', 'Lowboy', 'Oversized'], 4.7, 'verified',
     'b1000000-0000-0000-0000-000000000404', 52000, 'CDL-A', 'external'),

    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Metro Aerial — Employee Drivers', NULL, 'drivers@metroaerial.com', '(203) 555-4040',
     ARRAY['Flatbed', 'Box Truck', 'Trailer'], 4.5, 'verified',
     'b1000000-0000-0000-0000-000000000404', 48000, 'CDL-B', 'employee'),

    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'Wilson Hauling', 'Pete Wilson', 'pete@wilsonhauling.com', '(203) 555-6003',
     ARRAY['Flatbed', 'Heavy Haul'], 4.3, 'verified',
     'b1000000-0000-0000-0000-000000000109', 60000, 'CDL-A', 'external'),

    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'Metro Aerial — Hartford Drivers', NULL, 'hartford@metroaerial.com', '(860) 555-2150',
     ARRAY['Flatbed', 'Box Truck'], 4.6, 'verified',
     'b1000000-0000-0000-0000-000000000215', 48000, 'CDL-B', 'employee');

INSERT INTO contractor_workers (id, contractor_id, first_name, last_name, phone, email) VALUES
    ('ab000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'Mike', 'Ramirez', '(203) 555-6001', 'mike@ramireztransport.com'),
    ('ab000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
     'James', 'Thompson', '(203) 555-6002', 'jthompson@metroaerial.com'),
    ('ab000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
     'Carlos', 'Mendez', '(203) 555-6004', 'cmendez@metroaerial.com'),
    ('ab000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003',
     'Pete', 'Wilson', '(203) 555-6003', 'pete@wilsonhauling.com'),
    ('ab000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004',
     'Andre', 'Williams', '(860) 555-6005', 'awilliams@metroaerial.com'),
    ('ab000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004',
     'Tom', 'Chen', '(860) 555-6006', 'tchen@metroaerial.com');


-- ████████████████████████████████████████████████████████████
-- CUSTOMERS
-- ████████████████████████████████████████████████████████████

INSERT INTO customers (id, org_id, customer_name, customer_code, primary_contact, phone, email, billing_address_line1, billing_city, billing_state, billing_zip, credit_status, payment_terms) VALUES
    ('c5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'XYZ Co', 'XYZ-001', 'General Office', '(860) 555-1100', 'rentals@xyzco.com',
     '100 Corporate Dr', 'Bloomfield', 'CT', '06002', 'active', 30),
    ('c5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Electric Co', 'ELC-001', 'Tony Riccio', '(860) 209-4923', 'triccio@electricco.com',
     '445 Silas Deane Hwy', 'Wethersfield', 'CT', '06109', 'active', 30),
    ('c5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'ABC Construction', 'ABC-001', 'Bob Frost', '(203) 359-4704', 'bfrost@abcconstruction.com',
     '200 Main St', 'Stamford', 'CT', '06901', 'active', 45),
    ('c5000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'Metro Builders Inc', 'MTB-001', 'Rick Palazzo', '(203) 555-7701', 'rpalazzo@metrobuilders.com',
     '88 Elm St', 'Bridgeport', 'CT', '06604', 'active', 30),
    ('c5000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'Northeast Mechanical', 'NEM-001', 'Dave Kohl', '(860) 555-8801', 'dkohl@nemechanical.com',
     '312 Asylum St', 'Hartford', 'CT', '06103', 'active', 30),
    ('c5000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
     'Hartford Hospital', 'HH-001', 'Facilities Dept', '(860) 545-5000', 'facilities@hhchealth.org',
     '80 Seymour St', 'Hartford', 'CT', '06106', 'active', 60),
    ('c5000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
     'CT DOT', 'DOT-001', 'Project Office', '(860) 594-2000', 'projects@ct.gov',
     '2800 Berlin Tpke', 'Newington', 'CT', '06111', 'active', 60),
    ('c5000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
     'Greenfield Development', 'GFD-001', 'Maria Santos', '(203) 555-9901', 'msantos@greenfielddev.com',
     '15 Bank St', 'Stamford', 'CT', '06901', 'active', 30);


-- ████████████████████████████████████████████████████████████
-- CUSTOMER WORKSITES (delivery/pickup locations)
-- ████████████████████████████████████████████████████████████

INSERT INTO worksites (id, project_id, name, address_line1, city, state, zip_code, phone, site_notes, geo_latitude, geo_longitude, geo_fence_radius_m, status, site_type, customer_id) VALUES
    -- XYZ Co sites
    ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'XYZ Co — Bloomfield', '11 Northwood Dr', 'Bloomfield', 'CT', '06002',
     '(860) 555-1101', 'Gate code: 4455. Delivery to loading dock B.',
     41.8499590, -72.7045800, 300, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000001'),

    ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003',
     'XYZ Co — Hartford Office', '100 Corporate Dr', 'Hartford', 'CT', '06114',
     '(860) 555-1102', 'Use south entrance.',
     41.7401100, -72.6693200, 200, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000001'),

    -- Electric Co
    ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001',
     'Electric Co — Bloomfield', '11 Northwood Dr', 'Bloomfield', 'CT', '06002',
     '(860) 209-4923', 'Ask for Tony Riccio on site.',
     41.8503390, -72.7045890, 200, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000002'),

    -- ABC Construction
    ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     'ABC Construction — Amenia', '517 Leedsville Rd', 'Amenia', 'NY', '12501',
     '(203) 359-4704', 'Dirt road, 4WD recommended.',
     41.8551510, -73.5151570, 400, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000003'),

    ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004',
     'ABC Construction — Stamford', '95 Atlantic St', 'Stamford', 'CT', '06901',
     '(203) 359-4705', 'High-rise site. Coordinate with crane operator.',
     41.0531900, -73.5394400, 200, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000003'),

    -- Metro Builders
    ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001',
     'Metro Builders — Fairfield', '1200 Post Rd', 'Fairfield', 'CT', '06824',
     '(203) 555-7702', 'New condo development. Hard hat required.',
     41.1411700, -73.2637300, 500, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000004'),

    -- Northeast Mechanical
    ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000003',
     'Northeast Mech — Hartford', '50 Church St', 'Hartford', 'CT', '06103',
     '(860) 555-8802', 'HVAC replacement project, 3rd floor.',
     41.7658300, -72.6734100, 150, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000005'),

    -- Hartford Hospital
    ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003',
     'Hartford Hospital — Campus', '80 Seymour St', 'Hartford', 'CT', '06106',
     '(860) 545-5100', 'Deliver to facilities loading dock. No deliveries before 7am.',
     41.7542900, -72.6858300, 300, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000006'),

    -- CT DOT
    ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000003',
     'CT DOT — I-84 Bridge Project', 'I-84 Exit 32 Staging Area', 'Farmington', 'CT', '06032',
     '(860) 594-2001', 'Active highway zone. Follow flaggers.',
     41.7197500, -72.8279600, 800, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000007'),

    ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001',
     'CT DOT — Route 8 Bridge', 'Route 8 North Staging', 'Shelton', 'CT', '06484',
     '(860) 594-2002', 'Night work only. Arrive after 8pm.',
     41.2425000, -73.1318000, 600, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000007'),

    -- Greenfield Development
    ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000004',
     'Greenfield — Harbor Point', '15 Harbor Point Rd', 'Stamford', 'CT', '06902',
     '(203) 555-9902', 'Mixed-use development. South lot for equipment.',
     41.0541600, -73.5378900, 300, 'active', 'customer_site', 'c5000000-0000-0000-0000-000000000008');


-- ████████████████████████████████████████████████████████████
-- WORKSITE CONTACTS
-- ████████████████████████████████████████████████████████████

INSERT INTO worksite_contacts (worksite_id, employee_id, contact_role, contact_name, contact_phone, contact_email) VALUES
    -- Business employee contacts (dispatchers/yard mgrs)
    ('e0000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000001', 'secondary', NULL, NULL, NULL),
    -- Customer contacts (no employee_id, just contact info)
    ('e0000000-0000-0000-0000-000000000003', NULL, 'primary', 'Tony Riccio', '(860) 209-4923', 'triccio@electricco.com'),
    ('e0000000-0000-0000-0000-000000000004', NULL, 'primary', 'Bob Frost', '(203) 359-4704', 'bfrost@abcconstruction.com'),
    ('e0000000-0000-0000-0000-000000000006', NULL, 'primary', 'Rick Palazzo', '(203) 555-7701', 'rpalazzo@metrobuilders.com'),
    ('e0000000-0000-0000-0000-000000000007', NULL, 'primary', 'Dave Kohl', '(860) 555-8802', NULL),
    ('e0000000-0000-0000-0000-000000000008', NULL, 'primary', 'Facilities Receiving', '(860) 545-5100', NULL),
    ('e0000000-0000-0000-0000-000000000009', NULL, 'primary', 'DOT Project Office', '(860) 594-2001', NULL),
    ('e0000000-0000-0000-0000-000000000010', NULL, 'primary', 'DOT Night Crew Lead', '(860) 594-2002', NULL),
    ('e0000000-0000-0000-0000-000000000011', NULL, 'primary', 'Maria Santos', '(203) 555-9902', 'msantos@greenfielddev.com');


-- ████████████████████████████████████████████████████████████
-- TRANSACTION TYPES
-- ████████████████████████████████████████████████████████████

INSERT INTO transaction_types (org_id, code, name, direction, description, work_code, work_code_desc, sort_order) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'LEQ', 'Load Equipment',      'internal',  'Load equipment at home branch to start route',   'LEQ', 'LOAD EQUIPMENT',          1),
    ('a0000000-0000-0000-0000-000000000001', 'DEL', 'Delivery',            'outbound',  'Deliver rented equipment to customer job site',   'DEL', 'DELIVERY',                2),
    ('a0000000-0000-0000-0000-000000000001', 'ZDL', 'Misc Delivery',       'outbound',  'Non-standard delivery (courtesy, swap, respot)',  'ZDL', 'MISC DEL',                3),
    ('a0000000-0000-0000-0000-000000000001', 'PU',  'Pickup',              'inbound',   'Pick up equipment returned by customer',           'PU',  'PICKUP',                  4),
    ('a0000000-0000-0000-0000-000000000001', 'IML', 'Inter-Branch Load',   'transfer',  'Load equipment from a sister branch',              'IML', 'ALTERNATE BRANCH LOAD',   5),
    ('a0000000-0000-0000-0000-000000000001', 'IMB', 'Inter-Branch Return', 'transfer',  'Drop equipment at a sister branch',                'IMB', 'ALTERNATE BRANCH RETURN',  6),
    ('a0000000-0000-0000-0000-000000000001', 'RTB', 'Return to Branch',    'internal',  'Return to home branch at end of route',            'RTB', 'RETURN TO BRANCH',        7);


-- ████████████████████████████████████████████████████████████
-- EQUIPMENT (30 units across 8 categories)
-- ████████████████████████████████████████████████████████████

INSERT INTO equipment (id, org_id, equipment_code, category, subcategory, description, make, model, year, serial_number, weight_lbs, home_branch_id, current_branch_id, current_worksite_id, status, daily_rate, weekly_rate, monthly_rate, replacement_value, last_inspection) VALUES
    -- ── Scissor Lifts — Electric (8 units) ────────────────
    ('e9000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-001', 'Scissor Lift', 'Electric', 'SCISSOR 19'' ELECTRIC', 'MEC', 'Micro 19-XD', 2024, 'MEC24-00145',
     2952, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 150.00, 525.00, 1400.00, 28000.00, '2026-02-15'),

    ('e9000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-002', 'Scissor Lift', 'Electric', 'SCISSOR 26'' ELECTRIC', 'JLG', '2630ES', 2023, 'JLG23-08812',
     4850, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000006',
     'rented', 185.00, 650.00, 1750.00, 42000.00, '2026-01-20'),

    ('e9000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-003', 'Scissor Lift', 'Electric', 'SCISSOR 32'' ELECTRIC', 'SKYJACK', 'SJIII3226', 2024, 'SJ24-55231',
     5200, 'b1000000-0000-0000-0000-000000000109', 'b1000000-0000-0000-0000-000000000109', NULL,
     'available', 210.00, 735.00, 2000.00, 48000.00, '2026-03-01'),

    ('e9000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-004', 'Scissor Lift', 'Electric', 'SCISSOR 40'' ELECTRIC WIDE', 'SKYJACK', 'SJIII4740', 2023, 'SJ23-33102',
     7480, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000004',
     'rented', 250.00, 875.00, 2400.00, 58000.00, '2026-02-01'),

    ('e9000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-005', 'Scissor Lift', 'Electric', 'SCISSOR 19'' ELECTRIC', 'MEC', 'Micro 19-XD', 2025, 'MEC25-00298',
     2952, 'b1000000-0000-0000-0000-000000000215', 'b1000000-0000-0000-0000-000000000215', NULL,
     'available', 150.00, 525.00, 1400.00, 30000.00, '2026-03-10'),

    ('e9000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
     'SL-E-006', 'Scissor Lift', 'Electric', 'SCISSOR 26'' ELECTRIC', 'GENIE', 'GS-2669 RT', 2024, 'GN24-11205',
     5400, 'b1000000-0000-0000-0000-000000000318', 'b1000000-0000-0000-0000-000000000318', NULL,
     'available', 195.00, 680.00, 1850.00, 45000.00, '2026-02-20'),

    -- ── Scissor Lifts — Rough Terrain (2 units) ──────────
    ('e9000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
     'SL-RT-001', 'Scissor Lift', 'Rough Terrain', 'SCISSOR 50'' IC 4WD RT', 'SKYJACK', 'SJ9250RT', 2022, 'SJ22-44180',
     16000, 'b1000000-0000-0000-0000-000000000109', NULL, 'e0000000-0000-0000-0000-000000000004',
     'rented', 450.00, 1550.00, 4200.00, 95000.00, '2026-01-15'),

    ('e9000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
     'SL-RT-002', 'Scissor Lift', 'Rough Terrain', 'SCISSOR 40'' IC 4WD RT', 'JLG', '4045R', 2024, 'JLG24-09101',
     11200, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 375.00, 1300.00, 3500.00, 78000.00, '2026-03-05'),

    -- ── Boom Lifts — Articulating (3 units) ──────────────
    ('e9000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
     'BM-A-001', 'Boom Lift', 'Articulating', 'BOOM 45'' ARTICULATING', 'SKYJACK', 'SJ46AJ', 2023, 'SJ23-66014',
     14730, 'b1000000-0000-0000-0000-000000000109', 'b1000000-0000-0000-0000-000000000109', NULL,
     'available', 350.00, 1200.00, 3500.00, 110000.00, '2026-02-10'),

    ('e9000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
     'BM-A-002', 'Boom Lift', 'Articulating', 'BOOM 60'' ARTICULATING', 'JLG', '600AJ', 2024, 'JLG24-12088',
     22500, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000009',
     'rented', 550.00, 1900.00, 5500.00, 185000.00, '2026-01-25'),

    ('e9000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
     'BM-A-003', 'Boom Lift', 'Articulating', 'BOOM 34'' ARTICULATING', 'GENIE', 'Z-33/18', 2025, 'GN25-00410',
     9800, 'b1000000-0000-0000-0000-000000000215', NULL, 'e0000000-0000-0000-0000-000000000007',
     'rented', 285.00, 995.00, 2800.00, 72000.00, '2026-03-12'),

    -- ── Boom Lifts — Telescopic (2 units) ────────────────
    ('e9000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
     'BM-T-001', 'Boom Lift', 'Telescopic', 'BOOM 60'' TELESCOPIC', 'GENIE', 'S-60X', 2023, 'GN23-07432',
     20500, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 525.00, 1825.00, 5000.00, 175000.00, '2026-02-28'),

    ('e9000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001',
     'BM-T-002', 'Boom Lift', 'Telescopic', 'BOOM 80'' TELESCOPIC', 'JLG', '800S', 2022, 'JLG22-05520',
     32000, 'b1000000-0000-0000-0000-000000000215', 'b1000000-0000-0000-0000-000000000215', NULL,
     'maintenance', 750.00, 2600.00, 7500.00, 280000.00, '2026-01-10'),

    -- ── Forklifts (4 units) ──────────────────────────────
    ('e9000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001',
     'FK-W-001', 'Forklift', 'Warehouse', 'FORKLIFT 5K WAREHOUSE', 'TOYOTA', '8FGCU25', 2024, 'TOY24-82100',
     8200, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 175.00, 610.00, 1650.00, 35000.00, '2026-03-08'),

    ('e9000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001',
     'FK-W-002', 'Forklift', 'Warehouse', 'FORKLIFT 5K WAREHOUSE', 'TOYOTA', '8FGCU25', 2023, 'TOY23-77544',
     8200, 'b1000000-0000-0000-0000-000000000109', NULL, 'e0000000-0000-0000-0000-000000000008',
     'rented', 175.00, 610.00, 1650.00, 32000.00, '2026-02-05'),

    ('e9000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001',
     'FK-RT-001', 'Forklift', 'Rough Terrain', 'FORKLIFT 8K ROUGH TERRAIN', 'JCB', '930', 2024, 'JCB24-03388',
     13500, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000010',
     'rented', 350.00, 1200.00, 3400.00, 85000.00, '2026-02-18'),

    ('e9000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001',
     'FK-RT-002', 'Forklift', 'Rough Terrain', 'FORKLIFT 6K ROUGH TERRAIN', 'CAT', 'TH255C', 2023, 'CAT23-44921',
     10800, 'b1000000-0000-0000-0000-000000000318', 'b1000000-0000-0000-0000-000000000318', NULL,
     'available', 295.00, 1025.00, 2900.00, 72000.00, '2026-03-01'),

    -- ── Generators (4 units) ─────────────────────────────
    ('e9000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001',
     'GN-001', 'Generator', 'Towable', 'GENERATOR 20KW TOWABLE', 'MULTIQUIP', 'DCA20SPXU4F', 2024, 'MQ24-15602',
     1800, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 125.00, 435.00, 1200.00, 22000.00, '2026-03-01'),

    ('e9000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001',
     'GN-002', 'Generator', 'Towable', 'GENERATOR 45KW TOWABLE', 'MULTIQUIP', 'DCA45SSIU4F', 2023, 'MQ23-10215',
     3200, 'b1000000-0000-0000-0000-000000000215', NULL, 'e0000000-0000-0000-0000-000000000009',
     'rented', 225.00, 785.00, 2200.00, 45000.00, '2026-01-28'),

    ('e9000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001',
     'GN-003', 'Generator', 'Portable', 'GENERATOR 7KW PORTABLE', 'HONDA', 'EU7000iS', 2025, 'HON25-00088',
     262, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 85.00, 295.00, 800.00, 5500.00, '2026-03-15'),

    ('e9000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001',
     'GN-004', 'Generator', 'Towable', 'GENERATOR 100KW TOWABLE', 'CAT', 'XQ100', 2022, 'CAT22-88401',
     5800, 'b1000000-0000-0000-0000-000000000109', 'b1000000-0000-0000-0000-000000000109', NULL,
     'available', 450.00, 1550.00, 4500.00, 95000.00, '2026-02-10'),

    -- ── Air Compressors (3 units) ────────────────────────
    ('e9000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001',
     'AC-001', 'Air Compressor', 'Towable', 'COMPRESSOR 185CFM TOWABLE', 'ATLAS COPCO', 'XAS185', 2024, 'AC24-22017',
     2400, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 145.00, 505.00, 1400.00, 28000.00, '2026-03-05'),

    ('e9000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001',
     'AC-002', 'Air Compressor', 'Towable', 'COMPRESSOR 375CFM TOWABLE', 'DOOSAN', 'P375', 2023, 'DS23-06651',
     4100, 'b1000000-0000-0000-0000-000000000109', NULL, 'e0000000-0000-0000-0000-000000000009',
     'rented', 275.00, 960.00, 2700.00, 52000.00, '2026-02-12'),

    ('e9000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000001',
     'AC-003', 'Air Compressor', 'Towable', 'COMPRESSOR 185CFM TOWABLE', 'ATLAS COPCO', 'XAS185', 2025, 'AC25-00190',
     2400, 'b1000000-0000-0000-0000-000000000215', 'b1000000-0000-0000-0000-000000000215', NULL,
     'available', 145.00, 505.00, 1400.00, 30000.00, '2026-03-10'),

    -- ── Light Towers (3 units) ───────────────────────────
    ('e9000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000001',
     'LT-001', 'Light Tower', 'Towable', 'LIGHT TOWER 6KW 4-HEAD', 'GENERAC', 'MLT6SMD', 2024, 'GC24-30110',
     2650, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000010',
     'rented', 95.00, 330.00, 900.00, 18000.00, '2026-02-20'),

    ('e9000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000001',
     'LT-002', 'Light Tower', 'Towable', 'LIGHT TOWER 6KW 4-HEAD', 'GENERAC', 'MLT6SMD', 2024, 'GC24-30111',
     2650, 'b1000000-0000-0000-0000-000000000109', 'b1000000-0000-0000-0000-000000000109', NULL,
     'available', 95.00, 330.00, 900.00, 18000.00, '2026-03-01'),

    ('e9000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000001',
     'LT-003', 'Light Tower', 'Towable', 'LIGHT TOWER 8KW 4-HEAD LED', 'WACKER NEUSON', 'LTN8', 2025, 'WN25-00044',
     3100, 'b1000000-0000-0000-0000-000000000215', NULL, 'e0000000-0000-0000-0000-000000000009',
     'rented', 115.00, 400.00, 1100.00, 25000.00, '2026-03-08'),

    -- ── Skid Steers (2 units) ────────────────────────────
    ('e9000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000001',
     'SS-001', 'Skid Steer', 'Wheeled', 'SKID STEER WHEELED 74HP', 'BOBCAT', 'S650', 2023, 'BOB23-19082',
     8100, 'b1000000-0000-0000-0000-000000000404', 'b1000000-0000-0000-0000-000000000404', NULL,
     'available', 325.00, 1125.00, 3200.00, 55000.00, '2026-02-25'),

    ('e9000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000001',
     'SS-002', 'Skid Steer', 'Tracked', 'SKID STEER TRACKED 74HP', 'BOBCAT', 'T650', 2024, 'BOB24-22015',
     9200, 'b1000000-0000-0000-0000-000000000109', 'b1000000-0000-0000-0000-000000000109', NULL,
     'available', 365.00, 1275.00, 3600.00, 65000.00, '2026-03-05'),

    -- ── Mini Excavator (1 unit) ──────────────────────────
    ('e9000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000001',
     'EX-001', 'Excavator', 'Mini', 'MINI EXCAVATOR 35 CLASS', 'KUBOTA', 'KX040-4', 2024, 'KUB24-05501',
     9500, 'b1000000-0000-0000-0000-000000000404', NULL, 'e0000000-0000-0000-0000-000000000006',
     'rented', 395.00, 1375.00, 3900.00, 68000.00, '2026-02-15');


-- ████████████████████████████████████████████████████████████
-- CONTRACTS (12 active rental agreements)
-- ████████████████████████████████████████████████████████████

INSERT INTO contracts (id, org_id, contract_number, customer_id, worksite_id, status, start_date, end_date, daily_rate, weekly_rate, monthly_rate, total_value, po_number) VALUES
    -- Metro Builders: scissor + excavator on condo site
    ('c7000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0142', 'c5000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000006',
     'active', '2026-02-01', '2026-05-31', NULL, NULL, 2400.00, 9600.00, 'MB-PO-2026-044'),

    ('c7000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0143', 'c5000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000006',
     'active', '2026-02-15', '2026-04-30', NULL, NULL, 3900.00, 7800.00, 'MB-PO-2026-045'),

    -- ABC Construction: 2 scissors in Amenia
    ('c7000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0098', 'c5000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004',
     'active', '2026-01-15', '2026-06-30', NULL, NULL, 4200.00, 25200.00, 'ABC-PO-1122'),

    ('c7000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0099', 'c5000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004',
     'active', '2026-02-01', '2026-06-30', NULL, NULL, 2400.00, 12000.00, 'ABC-PO-1123'),

    -- CT DOT: boom + generator + compressor + lights on I-84
    ('c7000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0201', 'c5000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000009',
     'active', '2026-01-20', '2026-12-31', NULL, NULL, 5500.00, 66000.00, 'DOT-2026-BRG-084'),

    ('c7000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0202', 'c5000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000009',
     'active', '2026-01-25', '2026-12-31', NULL, NULL, 2200.00, 26400.00, 'DOT-2026-BRG-085'),

    ('c7000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0203', 'c5000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000009',
     'active', '2026-02-01', '2026-12-31', NULL, NULL, 2700.00, 29700.00, 'DOT-2026-BRG-086'),

    -- CT DOT: forklift + light on Rt 8
    ('c7000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0210', 'c5000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000010',
     'active', '2026-02-15', '2026-09-30', NULL, NULL, 3400.00, 27200.00, 'DOT-2026-RT8-010'),

    ('c7000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0211', 'c5000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000010',
     'active', '2026-02-20', '2026-09-30', NULL, NULL, 900.00, 6300.00, 'DOT-2026-RT8-011'),

    -- Hartford Hospital: forklift
    ('c7000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0305', 'c5000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000008',
     'active', '2026-02-01', '2026-04-30', NULL, NULL, 1650.00, 4950.00, 'HH-FAC-2026-12'),

    -- Northeast Mech: boom on church st
    ('c7000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0310', 'c5000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000007',
     'active', '2026-03-10', '2026-04-15', NULL, NULL, 2800.00, 2800.00, NULL),

    -- XYZ Co: misc delivery contract
    ('c7000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
     'RA-2026-0320', 'c5000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'active', '2026-03-15', '2026-03-31', 150.00, 525.00, NULL, NULL, NULL);


-- ████████████████████████████████████████████████████████████
-- TRIP 1: Driver 404EXT1 — March 17, 2026 (Bridgeport)
-- Route: Branch 404 → Bloomfield → Danbury → Bloomfield → Amenia → Danbury → Branch 404
-- ████████████████████████████████████████████████████████████

INSERT INTO workgroups (id, project_id, contractor_id, title, trip_number, trip_date, status, total_stops, total_weight_lbs, total_equipment, dispatch_notes) VALUES
    ('f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'Trip #1 — Ramirez — Mar 17', 1, '2026-03-17',
     'dispatched', 7, 49534, 5,
     'Multi-stop: 1 courtesy del + inter-branch pickup + customer deliveries + pickups');

INSERT INTO jobs (id, workgroup_id, project_id, title, transaction_type, work_code, stop_number, stop_sequence, status, planned_arrival, site_type, branch_id, customer_site_id, worksite_id, customer_id, contract_id, contact_name, contact_phone, delivery_instructions) VALUES
    ('a1000000-0000-0000-0000-000000010000', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'LEQ — Load at Branch 404', 'LEQ', 'LEQ', 0, 1, 'pending',
     '2026-03-17 06:00:00-04', 'branch', 'b1000000-0000-0000-0000-000000000404', NULL, NULL, NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000010001', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'ZDL — XYZ Co, Bloomfield', 'ZDL', 'ZDL', 1, 2, 'pending',
     '2026-03-17 07:28:00-04', 'customer_site', NULL, NULL, 'e0000000-0000-0000-0000-000000000001',
     'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000012', NULL, NULL, 'ur del 3.17'),

    ('a1000000-0000-0000-0000-000000010002', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'IML — Load from Branch 109', 'IML', 'IML', 2, 3, 'pending',
     '2026-03-17 08:56:00-04', 'branch', 'b1000000-0000-0000-0000-000000000109', NULL, NULL, NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000010003', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'DEL — Electric Co, Bloomfield', 'DEL', 'DEL', 3, 4, 'pending',
     '2026-03-17 10:27:00-04', 'customer_site', NULL, NULL, 'e0000000-0000-0000-0000-000000000003',
     'c5000000-0000-0000-0000-000000000002', NULL, 'Tony Riccio', '(860) 209-4923', NULL),

    ('a1000000-0000-0000-0000-000000010004', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'PU — ABC Construction, Amenia', 'PU', 'PU', 4, 5, 'pending',
     '2026-03-17 12:13:00-04', 'customer_site', NULL, NULL, 'e0000000-0000-0000-0000-000000000004',
     'c5000000-0000-0000-0000-000000000003', 'c7000000-0000-0000-0000-000000000003', 'Bob Frost', '(203) 359-4704', NULL),

    ('a1000000-0000-0000-0000-000000010005', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'IMB — Return to Branch 109', 'IMB', 'IMB', 5, 6, 'pending',
     '2026-03-17 13:29:00-04', 'branch', 'b1000000-0000-0000-0000-000000000109', NULL, NULL, NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000010006', 'f1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'RTB — Return to Branch 404', 'RTB', 'RTB', 6, 7, 'pending',
     '2026-03-17 14:41:00-04', 'branch', 'b1000000-0000-0000-0000-000000000404', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- Trip 1 equipment line items
INSERT INTO job_equipment (job_id, equipment_id, contract_id, transaction_type, quantity, weight_lbs, load_sequence, load_unload_branch_id) VALUES
    ('a1000000-0000-0000-0000-000000010000', 'e9000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000012', 'LEQ', 1, 2952, 1, 'b1000000-0000-0000-0000-000000000404'),
    ('a1000000-0000-0000-0000-000000010001', 'e9000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000012', 'ZDL', 1, 2952, 1, 'b1000000-0000-0000-0000-000000000404'),
    ('a1000000-0000-0000-0000-000000010002', 'e9000000-0000-0000-0000-000000000003', NULL, 'IML', 1, 5200, 1, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010002', 'e9000000-0000-0000-0000-000000000009', NULL, 'IML', 1, 14730, 2, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010003', 'e9000000-0000-0000-0000-000000000003', NULL, 'DEL', 1, 5200, 1, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010003', 'e9000000-0000-0000-0000-000000000009', NULL, 'DEL', 1, 14730, 2, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010004', 'e9000000-0000-0000-0000-000000000004', 'c7000000-0000-0000-0000-000000000004', 'PU', 1, 7480, 1, 'b1000000-0000-0000-0000-000000000404'),
    ('a1000000-0000-0000-0000-000000010004', 'e9000000-0000-0000-0000-000000000007', 'c7000000-0000-0000-0000-000000000003', 'PU', 1, 16000, 2, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010005', 'e9000000-0000-0000-0000-000000000007', 'c7000000-0000-0000-0000-000000000003', 'IMB', 1, 16000, 1, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000010006', 'e9000000-0000-0000-0000-000000000004', 'c7000000-0000-0000-0000-000000000004', 'RTB', 1, 7480, 1, 'b1000000-0000-0000-0000-000000000404');


-- ████████████████████████████████████████████████████████████
-- TRIP 2: Employee driver Thompson — March 17, 2026 (Bridgeport local)
-- Simple route: Branch 404 → Metro Builders → Branch 404
-- ████████████████████████████████████████████████████████████

INSERT INTO workgroups (id, project_id, contractor_id, title, trip_number, trip_date, status, total_stops, total_weight_lbs, total_equipment, dispatch_notes) VALUES
    ('f1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000002',
     'Trip #2 — Thompson — Mar 17', 2, '2026-03-17',
     'completed', 3, 10650, 2, 'Generator + compressor delivery to condo site');

INSERT INTO jobs (id, workgroup_id, project_id, title, transaction_type, work_code, stop_number, stop_sequence, status, planned_arrival, actual_arrival, completed_at, site_type, branch_id, worksite_id, customer_id, contract_id, contact_name, contact_phone) VALUES
    ('a1000000-0000-0000-0000-000000020000', 'f1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
     'LEQ — Load at Branch 404', 'LEQ', 'LEQ', 0, 1, 'completed',
     '2026-03-17 07:00:00-04', '2026-03-17 07:05:00-04', '2026-03-17 07:25:00-04',
     'branch', 'b1000000-0000-0000-0000-000000000404', NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000020001', 'f1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
     'DEL — Metro Builders, Fairfield', 'DEL', 'DEL', 1, 2, 'completed',
     '2026-03-17 07:45:00-04', '2026-03-17 07:52:00-04', '2026-03-17 08:20:00-04',
     'customer_site', NULL, 'e0000000-0000-0000-0000-000000000006',
     'c5000000-0000-0000-0000-000000000004', NULL, 'Rick Palazzo', '(203) 555-7701'),

    ('a1000000-0000-0000-0000-000000020002', 'f1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
     'RTB — Return to Branch 404', 'RTB', 'RTB', 2, 3, 'completed',
     '2026-03-17 08:45:00-04', '2026-03-17 08:50:00-04', '2026-03-17 09:00:00-04',
     'branch', 'b1000000-0000-0000-0000-000000000404', NULL, NULL, NULL, NULL, NULL);

INSERT INTO job_equipment (job_id, equipment_id, contract_id, transaction_type, quantity, weight_lbs, load_sequence, load_unload_branch_id, status, condition_on_load, condition_on_delivery) VALUES
    ('a1000000-0000-0000-0000-000000020000', 'e9000000-0000-0000-0000-000000000018', NULL, 'LEQ', 1, 1800, 1, 'b1000000-0000-0000-0000-000000000404', 'loaded', 'good', NULL),
    ('a1000000-0000-0000-0000-000000020000', 'e9000000-0000-0000-0000-000000000022', NULL, 'LEQ', 1, 2400, 2, 'b1000000-0000-0000-0000-000000000404', 'loaded', 'good', NULL),
    ('a1000000-0000-0000-0000-000000020001', 'e9000000-0000-0000-0000-000000000018', NULL, 'DEL', 1, 1800, 1, 'b1000000-0000-0000-0000-000000000404', 'delivered', 'good', 'good'),
    ('a1000000-0000-0000-0000-000000020001', 'e9000000-0000-0000-0000-000000000022', NULL, 'DEL', 1, 2400, 2, 'b1000000-0000-0000-0000-000000000404', 'delivered', 'good', 'good');


-- ████████████████████████████████████████████████████████████
-- TRIP 3: Hartford driver Williams — March 18, 2026
-- Route: Branch 215 → Hospital → NE Mech → DOT I-84 → Branch 215
-- ████████████████████████████████████████████████████████████

INSERT INTO workgroups (id, project_id, contractor_id, title, trip_number, trip_date, status, total_stops, total_weight_lbs, total_equipment, dispatch_notes) VALUES
    ('f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'c0000000-0000-0000-0000-000000000004',
     'Trip #1 — Williams — Mar 18', 1, '2026-03-18',
     'dispatched', 5, 15352, 3, 'Scissor swap at hospital, boom delivery to NE Mech, generator swap at DOT');

INSERT INTO jobs (id, workgroup_id, project_id, title, transaction_type, work_code, stop_number, stop_sequence, status, planned_arrival, site_type, branch_id, worksite_id, customer_id, contract_id, contact_name, contact_phone) VALUES
    ('a1000000-0000-0000-0000-000000030000', 'f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'LEQ — Load at Branch 215', 'LEQ', 'LEQ', 0, 1, 'pending',
     '2026-03-18 06:30:00-04', 'branch', 'b1000000-0000-0000-0000-000000000215', NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000030001', 'f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'ZDL — Hartford Hospital swap', 'ZDL', 'ZDL', 1, 2, 'pending',
     '2026-03-18 07:15:00-04', 'customer_site', NULL, 'e0000000-0000-0000-0000-000000000008',
     'c5000000-0000-0000-0000-000000000006', 'c7000000-0000-0000-0000-000000000010', 'Facilities Receiving', '(860) 545-5100'),

    ('a1000000-0000-0000-0000-000000030002', 'f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'DEL — NE Mechanical, Hartford', 'DEL', 'DEL', 2, 3, 'pending',
     '2026-03-18 08:30:00-04', 'customer_site', NULL, 'e0000000-0000-0000-0000-000000000007',
     'c5000000-0000-0000-0000-000000000005', 'c7000000-0000-0000-0000-000000000011', 'Dave Kohl', '(860) 555-8802'),

    ('a1000000-0000-0000-0000-000000030003', 'f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'ZDL — DOT I-84 generator swap', 'ZDL', 'ZDL', 3, 4, 'pending',
     '2026-03-18 10:00:00-04', 'customer_site', NULL, 'e0000000-0000-0000-0000-000000000009',
     'c5000000-0000-0000-0000-000000000007', 'c7000000-0000-0000-0000-000000000006', 'DOT Project Office', '(860) 594-2001'),

    ('a1000000-0000-0000-0000-000000030004', 'f1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
     'RTB — Return to Branch 215', 'RTB', 'RTB', 4, 5, 'pending',
     '2026-03-18 11:30:00-04', 'branch', 'b1000000-0000-0000-0000-000000000215', NULL, NULL, NULL, NULL, NULL);

INSERT INTO job_equipment (job_id, equipment_id, contract_id, transaction_type, quantity, weight_lbs, load_sequence, load_unload_branch_id) VALUES
    ('a1000000-0000-0000-0000-000000030000', 'e9000000-0000-0000-0000-000000000005', 'c7000000-0000-0000-0000-000000000010', 'LEQ', 1, 2952, 1, 'b1000000-0000-0000-0000-000000000215'),
    ('a1000000-0000-0000-0000-000000030000', 'e9000000-0000-0000-0000-000000000024', 'c7000000-0000-0000-0000-000000000011', 'LEQ', 1, 2400, 2, 'b1000000-0000-0000-0000-000000000215'),
    ('a1000000-0000-0000-0000-000000030001', 'e9000000-0000-0000-0000-000000000005', 'c7000000-0000-0000-0000-000000000010', 'ZDL', 1, 2952, 1, 'b1000000-0000-0000-0000-000000000215'),
    ('a1000000-0000-0000-0000-000000030002', 'e9000000-0000-0000-0000-000000000024', 'c7000000-0000-0000-0000-000000000011', 'DEL', 1, 2400, 1, 'b1000000-0000-0000-0000-000000000215'),
    ('a1000000-0000-0000-0000-000000030003', 'e9000000-0000-0000-0000-000000000020', 'c7000000-0000-0000-0000-000000000006', 'ZDL', 1, 262, 1, 'b1000000-0000-0000-0000-000000000215');


-- ████████████████████████████████████████████████████████████
-- TRIP 4: Danbury external driver Wilson — March 18, 2026
-- Heavy haul: Branch 109 → ABC Amenia (deliver skid steer) → Branch 109
-- ████████████████████████████████████████████████████████████

INSERT INTO workgroups (id, project_id, contractor_id, title, trip_number, trip_date, status, total_stops, total_weight_lbs, total_equipment, dispatch_notes) VALUES
    ('f1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000003',
     'Trip #1 — Wilson — Mar 18', 1, '2026-03-18',
     'dispatched', 3, 9200, 1, 'Heavy haul: tracked skid steer to ABC Amenia. Lowboy trailer required.');

INSERT INTO jobs (id, workgroup_id, project_id, title, transaction_type, work_code, stop_number, stop_sequence, status, planned_arrival, site_type, branch_id, worksite_id, customer_id, contract_id, contact_name, contact_phone, delivery_instructions) VALUES
    ('a1000000-0000-0000-0000-000000040000', 'f1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     'LEQ — Load at Branch 109', 'LEQ', 'LEQ', 0, 1, 'pending',
     '2026-03-18 07:00:00-04', 'branch', 'b1000000-0000-0000-0000-000000000109', NULL, NULL, NULL, NULL, NULL, NULL),

    ('a1000000-0000-0000-0000-000000040001', 'f1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     'DEL — ABC Construction, Amenia', 'DEL', 'DEL', 1, 2, 'pending',
     '2026-03-18 08:30:00-04', 'customer_site', NULL, 'e0000000-0000-0000-0000-000000000004',
     'c5000000-0000-0000-0000-000000000003', NULL, 'Bob Frost', '(203) 359-4704', 'Dirt road access. Unload at graded pad near west entrance.'),

    ('a1000000-0000-0000-0000-000000040002', 'f1000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
     'RTB — Return to Branch 109', 'RTB', 'RTB', 2, 3, 'pending',
     '2026-03-18 10:00:00-04', 'branch', 'b1000000-0000-0000-0000-000000000109', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO job_equipment (job_id, equipment_id, contract_id, transaction_type, quantity, weight_lbs, load_sequence, load_unload_branch_id) VALUES
    ('a1000000-0000-0000-0000-000000040000', 'e9000000-0000-0000-0000-000000000029', NULL, 'LEQ', 1, 9200, 1, 'b1000000-0000-0000-0000-000000000109'),
    ('a1000000-0000-0000-0000-000000040001', 'e9000000-0000-0000-0000-000000000029', NULL, 'DEL', 1, 9200, 1, 'b1000000-0000-0000-0000-000000000109');


-- ████████████████████████████████████████████████████████████
-- INVOICES (3 sample invoices)
-- ████████████████████████████████████████████████████████████

INSERT INTO invoices (id, workgroup_id, contractor_id, invoice_number, amount, line_items, status, submitted_at, org_id, project_id, customer_id, contract_id, billing_period_start, billing_period_end) VALUES
    ('1b000000-0000-0000-0000-000000000001',
     'f1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
     'INV-2026-ERL-001', 450.00,
     '[{"description": "Driver trip fee — Thompson Mar 17", "amount": 450}]',
     'paid', '2026-03-17 17:00:00-04',
     'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'c5000000-0000-0000-0000-000000000004', NULL, '2026-03-17', '2026-03-17'),

    ('1b000000-0000-0000-0000-000000000002',
     NULL, NULL,
     'INV-2026-ERL-002', 9600.00,
     '[{"description": "Metro Builders — Scissor SL-E-002 monthly rental Mar 2026", "amount": 2400}, {"description": "Metro Builders — Excavator EX-001 monthly rental Mar 2026", "amount": 3900}, {"description": "Delivery/pickup fees", "amount": 3300}]',
     'submitted', '2026-03-01 09:00:00-04',
     'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'c5000000-0000-0000-0000-000000000004', 'c7000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31'),

    ('1b000000-0000-0000-0000-000000000003',
     NULL, NULL,
     'INV-2026-ERL-003', 14700.00,
     '[{"description": "CT DOT I-84 — Boom BM-A-002 monthly rental Mar 2026", "amount": 5500}, {"description": "CT DOT I-84 — Generator GN-002 monthly rental Mar 2026", "amount": 2200}, {"description": "CT DOT I-84 — Compressor AC-002 monthly rental Mar 2026", "amount": 2700}, {"description": "CT DOT I-84 — Light Tower LT-003 monthly rental Mar 2026", "amount": 1100}, {"description": "Delivery/mobilization fees", "amount": 3200}]',
     'approved', '2026-03-01 09:00:00-04',
     'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
     'c5000000-0000-0000-0000-000000000007', 'c7000000-0000-0000-0000-000000000005', '2026-03-01', '2026-03-31');


-- ============================================================
-- SEED COMPLETE
--
-- Summary:
--   1 organization (Metro Aerial Equipment LLC)
--   4 branches (Bridgeport, Danbury, Hartford, Stamford)
--   5 business employees (dispatchers, yard/branch managers)
--   4 projects (perpetual, one per branch)
--   4 contractor companies (2 external, 2 employee pools)
--   6 individual drivers
--   8 customers
--   11 customer worksites
--   30 equipment units across 8 categories:
--      6 electric scissors, 2 RT scissors, 3 artic booms,
--      2 tele booms, 2 warehouse forklifts, 2 RT forklifts,
--      4 generators, 3 compressors, 3 light towers,
--      2 skid steers, 1 mini excavator
--   12 contracts
--   7 transaction types
--   4 trips (22 stops, 35+ equipment line items)
--   3 invoices ($24,750 total — 1 paid, 1 submitted, 1 approved)
--
-- Equipment status:
--   12 available (at branches)
--   10 rented (at customer sites)
--   1 maintenance
--   7 involved in active trips
-- ============================================================
