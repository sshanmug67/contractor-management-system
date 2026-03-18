-- ============================================================
-- Phase 4 Migration — Business Location Verification Columns
--
-- Prerequisites: Phase 1 migration already applied
--   (business_locations table, project_id on workgroups,
--    worksite_id on jobs all exist)
--
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Add verification columns to business_locations ──────

ALTER TABLE business_locations
    ADD COLUMN IF NOT EXISTS google_place_id TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified'
        CHECK (verification_status IN ('verified', 'unverified', 'failed'));

-- Index for place_id lookups (dedup when same place picked twice)
CREATE INDEX IF NOT EXISTS idx_biz_loc_place_id
    ON business_locations(org_id, google_place_id)
    WHERE google_place_id IS NOT NULL;

-- ── 2. Add location_type CHECK constraint if missing ───────
-- (Table may already have this from Phase 1, safe to skip if so)

DO $$
BEGIN
    -- Only add if no check constraint exists on location_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%location_type%'
    ) THEN
        ALTER TABLE business_locations
            ADD CONSTRAINT chk_location_type
            CHECK (location_type IN (
                'office', 'warehouse', 'client_site',
                'residential', 'commercial', 'industrial', 'other'
            ));
    END IF;
END $$;

-- ── 3. Add business_location_id to worksites ───────────────
-- Links a worksite back to the business location it was created from.
-- This enables: "show me all projects at this client site"

ALTER TABLE worksites
    ADD COLUMN IF NOT EXISTS business_location_id UUID REFERENCES business_locations(id);

CREATE INDEX IF NOT EXISTS idx_worksites_biz_loc
    ON worksites(business_location_id)
    WHERE business_location_id IS NOT NULL;

-- ── 4. Updated_at trigger for business_locations ───────────

CREATE OR REPLACE TRIGGER trg_business_locations_updated_at
    BEFORE UPDATE ON business_locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


ALTER TABLE business_locations DROP CONSTRAINT business_locations_location_type_check;

ALTER TABLE business_locations ADD CONSTRAINT business_locations_location_type_check
    CHECK (location_type IN (
        'office', 'warehouse', 'yard', 'shop', 'storage', 'branch',
        'client_site', 'residential', 'commercial', 'industrial', 'other'
    ));

-- ── 5. RLS for INSERT/UPDATE/DELETE (Phase 1 only had SELECT + ALL) ──
-- Verify existing policies cover mutations. The "ALL" policy should
-- handle this, but let's ensure it's correct:

-- (No change needed — the "Users manage own org locations" ALL policy
--  from Phase 1 covers INSERT, UPDATE, DELETE, SELECT.)


-- ============================================================
-- VERIFICATION QUERY — Run after migration
-- ============================================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'business_locations'
ORDER BY ordinal_position;


