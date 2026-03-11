-- ============================================================
-- CMS DATABASE SCHEMA — Functions
-- Run: After 001_tables.sql
--
-- Server-side functions for operations that benefit from
-- running inside the database (atomic updates, cascading).
-- ============================================================

-- ── Recalculate workgroup progress from job statuses ──────
-- Called: after any job status change

CREATE OR REPLACE FUNCTION fn_recalculate_workgroup_progress(p_workgroup_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_total INTEGER;
    v_done INTEGER;
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status IN ('complete', 'invoiced', 'paid'))
    INTO v_total, v_done
    FROM jobs WHERE workgroup_id = p_workgroup_id;

    IF v_total = 0 THEN
        v_pct := 0;
    ELSE
        v_pct := ROUND((v_done::DECIMAL / v_total) * 100, 2);
    END IF;

    UPDATE workgroups
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_workgroup_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;


-- ── Recalculate worksite progress from workgroup progresses ─
-- Called: after workgroup progress changes

CREATE OR REPLACE FUNCTION fn_recalculate_worksite_progress(p_worksite_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0)
    INTO v_pct
    FROM workgroups WHERE worksite_id = p_worksite_id;

    UPDATE worksites
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_worksite_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;


-- ── Recalculate project progress from worksite progresses ───
-- Called: after worksite progress changes

CREATE OR REPLACE FUNCTION fn_recalculate_project_progress(p_project_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_pct DECIMAL(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(progress_pct), 2), 0)
    INTO v_pct
    FROM worksites WHERE project_id = p_project_id;

    UPDATE projects
    SET progress_pct = v_pct, updated_at = NOW()
    WHERE id = p_project_id;

    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;


-- ── Full cascade: job status changed → recalc up the chain ─
-- Called: from app after any job status update

CREATE OR REPLACE FUNCTION fn_cascade_progress(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_workgroup_id UUID;
    v_worksite_id UUID;
    v_project_id UUID;
BEGIN
    -- Get the chain: job → workgroup → worksite → project
    SELECT wg.id, wg.worksite_id, ws.project_id
    INTO v_workgroup_id, v_worksite_id, v_project_id
    FROM jobs j
    JOIN workgroups wg ON j.workgroup_id = wg.id
    JOIN worksites ws ON wg.worksite_id = ws.id
    WHERE j.id = p_job_id;

    -- Cascade upward
    PERFORM fn_recalculate_workgroup_progress(v_workgroup_id);
    PERFORM fn_recalculate_worksite_progress(v_worksite_id);
    PERFORM fn_recalculate_project_progress(v_project_id);
END;
$$ LANGUAGE plpgsql;


-- ── Check if all workgroup jobs are invoiced+paid ─────────
-- Returns TRUE if workgroup should be marked complete

CREATE OR REPLACE FUNCTION fn_is_workgroup_fully_paid(p_workgroup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total INTEGER;
    v_paid INTEGER;
BEGIN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status = 'paid')
    INTO v_total, v_paid
    FROM jobs WHERE workgroup_id = p_workgroup_id;

    RETURN v_total > 0 AND v_total = v_paid;
END;
$$ LANGUAGE plpgsql;


-- ── Validate no double-billing on invoice submission ──────
-- Returns array of job_ids that are already on another invoice

CREATE OR REPLACE FUNCTION fn_check_double_billing(
    p_workgroup_id UUID,
    p_job_ids UUID[]
)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT j.id
        FROM jobs j
        WHERE j.id = ANY(p_job_ids)
          AND j.workgroup_id = p_workgroup_id
          AND j.invoice_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;


-- ── Updated_at auto-trigger ───────────────────────────────
-- Attach to any table that has updated_at

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_worksites_updated_at BEFORE UPDATE ON worksites
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_workgroups_updated_at BEFORE UPDATE ON workgroups
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contractors_updated_at BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contractor_workers_updated_at BEFORE UPDATE ON contractor_workers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_business_employees_updated_at BEFORE UPDATE ON business_employees
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
