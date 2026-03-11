-- ============================================================
-- CMS ADDITIONAL SEED DATA — Invoices + Dependencies
-- Run: AFTER 02_seed_data.sql in Supabase SQL Editor
--
-- Adds: Workgroup dependencies, 2 invoices, updated job statuses
-- This makes budget tracking visible in the dashboard.
-- ============================================================

-- ── Workgroup Dependencies ────────────────────────────────
-- Painting depends on Plumbing (123 Main St)
-- Electrical depends on HVAC (456 Oak Ave)
-- Painting depends on Flooring (789 Elm St)

INSERT INTO workgroup_dependencies (workgroup_id, depends_on_workgroup_id) VALUES
    ('f0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003'),
    ('f0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005'),
    ('f0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000007');

-- ── Invoice: Roofing shingle removal (PAID) ───────────────

INSERT INTO invoices (workgroup_id, contractor_id, invoice_number, amount, status, line_items) VALUES
    ('f0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'INV-2026-001', 2000.00, 'paid',
     '[{"job_id": "aa000000-0000-0000-0000-000000000001", "description": "Remove old shingles", "amount": 2000}]');

-- Mark job as paid
UPDATE jobs SET status = 'paid'
WHERE id = 'aa000000-0000-0000-0000-000000000001';

-- ── Invoice: Electrical panel rewire (INVOICED, not yet paid) ──

INSERT INTO invoices (workgroup_id, contractor_id, invoice_number, amount, status, line_items) VALUES
    ('f0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000002',
     'INV-2026-002', 6000.00, 'approved',
     '[{"job_id": "aa000000-0000-0000-0000-000000000005", "description": "Rewire main panel", "amount": 6000}]');

-- Mark job as invoiced
UPDATE jobs SET status = 'invoiced'
WHERE id = 'aa000000-0000-0000-0000-000000000005';

-- ── Invoice: Electrical outlets (SUBMITTED, pending approval) ──

INSERT INTO invoices (workgroup_id, contractor_id, invoice_number, amount, status, line_items) VALUES
    ('f0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000002',
     'INV-2026-003', 4000.00, 'submitted',
     '[{"job_id": "aa000000-0000-0000-0000-000000000006", "description": "Install outlets", "amount": 4000}]');

-- ============================================================
-- RESULT: Dashboard will now show:
--   $2K paid (roofing shingles)
--   $10K invoiced (electrical panel $6K + outlets $4K)
--   $173K remaining
--   Dependencies: Painting→Plumbing, Electrical→HVAC, Painting→Flooring
-- ============================================================
-- Add workgroup dependencies
INSERT INTO workgroup_dependencies (workgroup_id, depends_on_workgroup_id) VALUES
('f0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003'),
('f0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000005'),
('f0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000007');