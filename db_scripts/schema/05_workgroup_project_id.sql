-- ══════════════════════════════════════════════════════════════
-- CMS Data Model Migration: Workgroup → Project (direct)
-- File: 05_workgroup_project_id.sql
-- Version: 3.0  —  March 2026
--
-- Run order:
--   1. Pre-migration sanity check (Part 0)
--   2. Workgroup project_id + optional worksite_id (Part A)
--   3. Job worksite_id (Part B)
--   4. Business locations table (Part C)
--   5. Consistency trigger (Part D)
--   6. RLS policy updates (Part E)
--   7. Verification queries (Part F)
--
-- Rollback: See Part G at bottom of file.
-- ══════════════════════════════════════════════════════════════


-- ── PART 0: Pre-Migration Sanity Check ──────────────────────
-- Run these SELECT queries BEFORE applying any changes.
-- If any return rows, fix the data first.

-- Check 1: Orphaned workgroups (worksite_id points to deleted worksite)
SELECT wg.id, wg.title, wg.worksite_id
FROM workgroups wg
LEFT JOIN worksites ws ON ws.id = wg.worksite_id
WHERE ws.id IS NULL;
-- Expected: 0 rows. If any found, either re-assign or delete before proceeding.

-- Check 2: Orphaned worksites (project_id points to deleted project)
SELECT ws.id, ws.name, ws.project_id
FROM worksites ws
LEFT JOIN projects p ON p.id = ws.project_id
WHERE p.id IS NULL;
-- Expected: 0 rows.


-- ══════════════════════════════════════════════════════════════
-- PART A: Workgroup project_id + optional worksite_id
-- ══════════════════════════════════════════════════════════════

-- Step 1: Add project_id column (nullable initially for backfill)
ALTER TABLE workgroups
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Step 2: Backfill project_id from existing worksite → project chain
UPDATE workgroups wg
SET project_id = ws.project_id
FROM worksites ws
WHERE wg.worksite_id = ws.id
  AND wg.project_id IS NULL;

-- Step 3: Verify backfill succeeded (should return 0)
-- SELECT count(*) as orphans FROM workgroups WHERE project_id IS NULL;

-- Step 4: Make project_id required (all rows now backfilled)
ALTER TABLE workgroups
  ALTER COLUMN project_id SET NOT NULL;

-- Step 5: Make worksite_id optional (was required)
ALTER TABLE workgroups
  ALTER COLUMN worksite_id DROP NOT NULL;

-- Step 6: Index for the new primary query pattern
CREATE INDEX IF NOT EXISTS idx_workgroups_project
  ON workgroups(project_id);


-- ══════════════════════════════════════════════════════════════
-- PART B: Job worksite_id (optional, for per-job location override)
-- ══════════════════════════════════════════════════════════════

-- Step 1: Add optional worksite_id to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS worksite_id UUID REFERENCES worksites(id);

-- Step 2: Backfill from workgroup's worksite (where set)
UPDATE jobs j
SET worksite_id = wg.worksite_id
FROM workgroups wg
WHERE j.workgroup_id = wg.id
  AND j.worksite_id IS NULL
  AND wg.worksite_id IS NOT NULL;

-- Step 3: Index for worksite-based job queries
CREATE INDEX IF NOT EXISTS idx_jobs_worksite
  ON jobs(worksite_id);


-- ══════════════════════════════════════════════════════════════
-- PART C: Business Locations Table (org-level locations)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID REFERENCES organizations(id) NOT NULL,
  name            TEXT NOT NULL,                          -- 'Main Office', 'Equipment Yard'
  location_type   TEXT DEFAULT 'office'
                  CHECK (location_type IN (
                    'office', 'warehouse', 'yard',
                    'shop', 'storage', 'branch', 'other'
                  )),
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  phone           TEXT,
  geo_latitude    DECIMAL(10,7),
  geo_longitude   DECIMAL(10,7),
  geo_fence_radius_m INTEGER DEFAULT 200,
  is_default      BOOLEAN DEFAULT FALSE,                  -- default location for new projects
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biz_loc_org
  ON business_locations(org_id);

CREATE INDEX IF NOT EXISTS idx_biz_loc_active
  ON business_locations(org_id, is_active);

-- RLS for business_locations
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org locations"
  ON business_locations FOR SELECT
  USING (org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users manage own org locations"
  ON business_locations FOR ALL
  USING (org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid()));


-- ══════════════════════════════════════════════════════════════
-- PART D: Consistency Trigger
-- Ensures workgroup.worksite_id (when set) references a worksite
-- that belongs to the same project as workgroup.project_id.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_wg_worksite_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.worksite_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM worksites
      WHERE id = NEW.worksite_id
        AND project_id = NEW.project_id
    ) THEN
      RAISE EXCEPTION
        'Worksite % does not belong to project %',
        NEW.worksite_id, NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wg_worksite_project
  BEFORE INSERT OR UPDATE ON workgroups
  FOR EACH ROW
  EXECUTE FUNCTION check_wg_worksite_project();


-- ══════════════════════════════════════════════════════════════
-- PART E: RLS Policy Updates
-- Update workgroup RLS to use project_id directly instead of
-- chaining through worksites → projects → organizations.
-- ══════════════════════════════════════════════════════════════

-- Drop old workgroup policies (if they chain through worksites)
-- NOTE: Adjust policy names to match your actual policy names.
-- DROP POLICY IF EXISTS "workgroup_select_policy" ON workgroups;
-- DROP POLICY IF EXISTS "workgroup_all_policy" ON workgroups;

-- New policies using direct project_id → org chain
-- CREATE POLICY "Users see own org workgroups"
--   ON workgroups FOR SELECT
--   USING (project_id IN (
--     SELECT id FROM projects
--     WHERE org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid())
--   ));

-- CREATE POLICY "Users manage own org workgroups"
--   ON workgroups FOR ALL
--   USING (project_id IN (
--     SELECT id FROM projects
--     WHERE org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid())
--   ));

-- NOTE: Uncomment and adjust the above after verifying your current
-- policy names. The pattern is: workgroups.project_id → projects.org_id
-- instead of: workgroups.worksite_id → worksites.project_id → projects.org_id


-- ══════════════════════════════════════════════════════════════
-- PART F: Verification Queries
-- Run after all parts complete. All should return 0.
-- ══════════════════════════════════════════════════════════════

-- Verify 1: All workgroups have project_id
SELECT count(*) as orphans FROM workgroups WHERE project_id IS NULL;
-- Expected: 0

-- Verify 2: project_id matches worksite path (for WGs with worksite set)
SELECT count(*) as mismatches FROM workgroups wg
JOIN worksites ws ON ws.id = wg.worksite_id
WHERE wg.project_id != ws.project_id;
-- Expected: 0

-- Verify 3: All existing workgroups still have worksite_id
-- (backfill preserved values — nothing was nulled out)
SELECT count(*) as newly_null FROM workgroups
WHERE worksite_id IS NULL;
-- Expected: 0 (no existing workgroups should have lost their worksite)

-- Verify 4: Jobs backfilled correctly
SELECT count(*) as jobs_with_site FROM jobs WHERE worksite_id IS NOT NULL;
-- Expected: > 0 (most jobs should have gotten worksite from their workgroup)

-- Verify 5: business_locations table exists
SELECT count(*) FROM information_schema.tables
WHERE table_name = 'business_locations';
-- Expected: 1

-- Verify 6: Consistency trigger works (should FAIL — that's correct)
-- INSERT INTO workgroups (worksite_id, project_id, title)
-- VALUES ('wrong-worksite-id', 'some-project-id', 'Test');
-- Expected: ERROR "Worksite does not belong to project"


-- ══════════════════════════════════════════════════════════════
-- PART G: Rollback SQL (if needed)
-- ══════════════════════════════════════════════════════════════

-- DROP TRIGGER IF EXISTS trg_wg_worksite_project ON workgroups;
-- DROP FUNCTION IF EXISTS check_wg_worksite_project();
-- ALTER TABLE workgroups DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE workgroups ALTER COLUMN worksite_id SET NOT NULL;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS worksite_id;
-- DROP TABLE IF EXISTS business_locations;
-- No data loss — worksite_id values were never removed from workgroups.
