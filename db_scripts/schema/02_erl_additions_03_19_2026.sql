-- ============================================================
-- CMS-ERL ADDITIONS — Equipment Rental Logistics
-- Run: AFTER 01_core_schema.sql in Supabase SQL Editor
--
-- This script is PURELY ADDITIVE:
--   1. ALTER existing tables — add ERL columns
--   2. CREATE new ERL tables — equipment, contracts, etc.
--   3. New indexes, views, functions, triggers for ERL
--
-- No drops. No renames. No column removals.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "postgis";

-- ████████████████████████████████████████████████████████████
-- PART 1: ALTER EXISTING CORE TABLES
-- ████████████████████████████████████████████████████████████

-- ── user_profiles: add dispatcher/driver roles ────────────
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'dispatcher', 'driver', 'viewer'));

-- ── projects: add branch link and perpetual type ──────────
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS branch_id UUID;
-- project_type already exists from migration 04 (direct/contract)
-- We expand its CHECK to include 'perpetual'
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
    CHECK (project_type IN ('direct', 'contract', 'perpetual'));

-- ── contractors: add ERL driver fields ────────────────────
ALTER TABLE contractors
    ADD COLUMN IF NOT EXISTS branch_id UUID,
    ADD COLUMN IF NOT EXISTS max_weight_lbs INTEGER DEFAULT 48000,
    ADD COLUMN IF NOT EXISTS license_class TEXT,
    ADD COLUMN IF NOT EXISTS driver_type TEXT DEFAULT 'external'
        CHECK (driver_type IN ('employee', 'external', 'owner_operator'));

-- ── workgroups: add trip fields ───────────────────────────
ALTER TABLE workgroups
    ADD COLUMN IF NOT EXISTS trip_number INTEGER,
    ADD COLUMN IF NOT EXISTS trip_date DATE,
    ADD COLUMN IF NOT EXISTS total_stops INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_weight_lbs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_equipment INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;

-- Expand workgroup statuses for ERL
ALTER TABLE workgroups DROP CONSTRAINT IF EXISTS workgroups_status_check;
ALTER TABLE workgroups ADD CONSTRAINT workgroups_status_check
    CHECK (status IN (
        'draft', 'pending', 'accepted', 'rejected',
        'in_progress', 'review', 'approved',
        'complete', 'disputed',
        'dispatched', 'completed', 'cancelled'
    ));

-- ── jobs: add stop/delivery fields ────────────────────────
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
    ADD COLUMN IF NOT EXISTS org_id UUID,
    ADD COLUMN IF NOT EXISTS transaction_type TEXT,
    ADD COLUMN IF NOT EXISTS work_code TEXT,
    ADD COLUMN IF NOT EXISTS stop_number INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stop_sequence INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS planned_arrival TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS site_type TEXT CHECK (site_type IN ('branch', 'customer_site', 'yard')),
    ADD COLUMN IF NOT EXISTS branch_id UUID,
    ADD COLUMN IF NOT EXISTS customer_site_id UUID,
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS contract_id UUID,
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS signature_path TEXT;

-- Expand job statuses for ERL
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
    CHECK (status IN (
        'not_started', 'in_progress', 'complete', 'invoiced', 'paid',
        'pending', 'en_route', 'arrived', 'completed', 'skipped', 'failed'
    ));

-- ── invoices: add contract/customer billing ───────────────
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS org_id UUID,
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
    ADD COLUMN IF NOT EXISTS contract_id UUID,
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS billing_period_start DATE,
    ADD COLUMN IF NOT EXISTS billing_period_end DATE,
    ADD COLUMN IF NOT EXISTS due_date DATE;

-- ── uploads: add equipment photo tracking ─────────────────
ALTER TABLE uploads
    ADD COLUMN IF NOT EXISTS job_equipment_id UUID,
    ADD COLUMN IF NOT EXISTS upload_type TEXT CHECK (upload_type IN (
        'photo', 'signature', 'pod', 'damage_report', 'inspection', 'other'
    ));

-- ── audit_logs: add org_id ────────────────────────────────
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- ── worksites: add site_type and customer_id ──────────────
ALTER TABLE worksites
    ADD COLUMN IF NOT EXISTS site_type TEXT DEFAULT 'project_site'
        CHECK (site_type IN ('project_site', 'branch', 'customer_site', 'yard', 'warehouse')),
    ADD COLUMN IF NOT EXISTS customer_id UUID;

-- ── worksite_contacts: add direct contact fields ──────────
-- For cases where contact is NOT a business_employee
ALTER TABLE worksite_contacts
    ALTER COLUMN employee_id DROP NOT NULL;
ALTER TABLE worksite_contacts
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT;


-- ████████████████████████████████████████████████████████████
-- PART 2: NEW ERL TABLES
-- ████████████████████████████████████████████████████████████

-- ── Customers ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_code TEXT,
    primary_contact TEXT,
    email TEXT,
    phone TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_zip TEXT,
    credit_status TEXT DEFAULT 'active' CHECK (credit_status IN ('active', 'hold', 'suspended', 'cod')),
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Equipment ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    equipment_code TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year INTEGER,
    serial_number TEXT,
    weight_lbs INTEGER,
    home_branch_id UUID,
    current_branch_id UUID,
    current_worksite_id UUID REFERENCES worksites(id),
    status TEXT DEFAULT 'available' CHECK (status IN (
        'available', 'rented', 'in_transit', 'maintenance',
        'repair', 'retired', 'lost'
    )),
    daily_rate DECIMAL(10,2),
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    replacement_value DECIMAL(12,2),
    hour_meter DECIMAL(10,1),
    last_inspection DATE,
    next_inspection DATE,
    last_service DATE,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, equipment_code)
);

-- ── Contracts (rental agreements) ─────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    contract_number TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    worksite_id UUID REFERENCES worksites(id),
    status TEXT DEFAULT 'active' CHECK (status IN (
        'draft', 'active', 'completed', 'cancelled', 'expired'
    )),
    start_date DATE,
    end_date DATE,
    actual_return_date DATE,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('daily', 'weekly', 'monthly', '28day')),
    daily_rate DECIMAL(10,2),
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    total_value DECIMAL(12,2),
    po_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, contract_number)
);

-- ── Transaction Types (reference table) ───────────────────

CREATE TABLE IF NOT EXISTS transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('outbound', 'inbound', 'transfer', 'internal')),
    description TEXT,
    work_code TEXT,
    work_code_desc TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- ── Job Equipment (line items per stop) ───────────────────

CREATE TABLE IF NOT EXISTS job_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES equipment(id) NOT NULL,
    contract_id UUID REFERENCES contracts(id),
    transaction_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    weight_lbs INTEGER,
    priority INTEGER DEFAULT 0,
    load_sequence INTEGER,
    load_unload_branch_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'loaded', 'delivered', 'picked_up', 'returned', 'confirmed'
    )),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES user_profiles(id),
    condition_on_load TEXT CHECK (condition_on_load IN ('good', 'fair', 'damaged', 'not_inspected')),
    condition_on_delivery TEXT CHECK (condition_on_delivery IN ('good', 'fair', 'damaged', 'not_inspected')),
    condition_notes TEXT,
    photo_paths TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES user_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'dispatch', 'completion', 'alert', 'invoice',
        'system', 'delay', 'equipment', 'contract'
    )),
    entity_type TEXT,
    entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████
-- PART 3: ADD FOREIGN KEYS (deferred refs)
-- ████████████████████████████████████████████████████████████

-- projects.branch_id → business_locations (branch = a business location)
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_branch
    FOREIGN KEY (branch_id) REFERENCES business_locations(id);

-- contractors.branch_id → business_locations
ALTER TABLE contractors
    ADD CONSTRAINT fk_contractors_branch
    FOREIGN KEY (branch_id) REFERENCES business_locations(id);

-- jobs FKs to new tables
ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    ADD CONSTRAINT fk_jobs_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),
    ADD CONSTRAINT fk_jobs_branch FOREIGN KEY (branch_id) REFERENCES business_locations(id),
    ADD CONSTRAINT fk_jobs_customer_site FOREIGN KEY (customer_site_id) REFERENCES worksites(id);

-- invoices FKs to new tables
ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),
    ADD CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- worksites.customer_id → customers
ALTER TABLE worksites
    ADD CONSTRAINT fk_worksites_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- equipment branch FKs → business_locations
ALTER TABLE equipment
    ADD CONSTRAINT fk_equipment_home_branch FOREIGN KEY (home_branch_id) REFERENCES business_locations(id),
    ADD CONSTRAINT fk_equipment_current_branch FOREIGN KEY (current_branch_id) REFERENCES business_locations(id);

-- uploads.job_equipment_id → job_equipment
ALTER TABLE uploads
    ADD CONSTRAINT fk_uploads_job_equipment FOREIGN KEY (job_equipment_id) REFERENCES job_equipment(id);


-- ████████████████████████████████████████████████████████████
-- PART 4: NEW INDEXES
-- ████████████████████████████████████████████████████████████

-- Customers
CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_customers_active ON customers(org_id, is_active);
CREATE INDEX idx_customers_code ON customers(org_id, customer_code);

-- Equipment
CREATE INDEX idx_equipment_org ON equipment(org_id);
CREATE INDEX idx_equipment_code ON equipment(org_id, equipment_code);
CREATE INDEX idx_equipment_home_branch ON equipment(home_branch_id);
CREATE INDEX idx_equipment_current_branch ON equipment(current_branch_id);
CREATE INDEX idx_equipment_status ON equipment(org_id, status);
CREATE INDEX idx_equipment_category ON equipment(org_id, category);
CREATE INDEX idx_equipment_worksite ON equipment(current_worksite_id);

-- Contracts
CREATE INDEX idx_contracts_org ON contracts(org_id);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(org_id, status);
CREATE INDEX idx_contracts_worksite ON contracts(worksite_id);

-- Transaction Types
CREATE INDEX idx_transaction_types_org ON transaction_types(org_id);

-- Job Equipment
CREATE INDEX idx_job_equipment_job ON job_equipment(job_id);
CREATE INDEX idx_job_equipment_equipment ON job_equipment(equipment_id);
CREATE INDEX idx_job_equipment_contract ON job_equipment(contract_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_org ON notifications(org_id);

-- Jobs ERL additions
CREATE INDEX idx_jobs_project ON jobs(project_id);
CREATE INDEX idx_jobs_branch ON jobs(branch_id);
CREATE INDEX idx_jobs_customer_site ON jobs(customer_site_id);
CREATE INDEX idx_jobs_transaction_type ON jobs(transaction_type);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_contract ON jobs(contract_id);
CREATE INDEX idx_jobs_planned_arrival ON jobs(planned_arrival);

-- Workgroups ERL additions
CREATE INDEX idx_workgroups_trip_date ON workgroups(project_id, trip_date);

-- Worksites ERL additions
CREATE INDEX idx_worksites_customer ON worksites(customer_id);
CREATE INDEX idx_worksites_site_type ON worksites(site_type);

-- Projects ERL
CREATE INDEX idx_projects_branch ON projects(branch_id);

-- Audit org
CREATE INDEX idx_audit_org ON audit_logs(org_id);


-- ████████████████████████████████████████████████████████████
-- PART 5: ERL VIEWS
-- ████████████████████████████████████████████████████████████

-- Branch inventory summary
CREATE VIEW v_branch_inventory AS
SELECT
    bl.id AS branch_id,
    bl.name AS branch_name,
    bl.org_id,
    COUNT(e.id) AS total_equipment,
    COUNT(e.id) FILTER (WHERE e.status = 'available') AS available,
    COUNT(e.id) FILTER (WHERE e.status = 'rented') AS rented,
    COUNT(e.id) FILTER (WHERE e.status = 'in_transit') AS in_transit,
    COUNT(e.id) FILTER (WHERE e.status = 'maintenance') AS in_maintenance
FROM business_locations bl
LEFT JOIN equipment e ON bl.id = e.current_branch_id AND e.is_active = TRUE
WHERE bl.location_type = 'branch'
GROUP BY bl.id;

-- Trip detail with driver and stop summary
CREATE VIEW v_trip_detail AS
SELECT
    wg.id AS trip_id,
    wg.title,
    wg.trip_number,
    wg.trip_date,
    wg.status,
    wg.project_id,
    c.company_name AS driver_company,
    c.owner_name AS driver_name,
    wg.total_stops,
    wg.total_weight_lbs,
    wg.total_equipment,
    COUNT(DISTINCT j.id) AS actual_stops,
    COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('completed', 'complete')) AS stops_completed,
    COUNT(DISTINCT je.id) AS equipment_items,
    MIN(j.planned_arrival) AS first_stop_time,
    MAX(j.planned_arrival) AS last_stop_time
FROM workgroups wg
LEFT JOIN contractors c ON wg.contractor_id = c.id
LEFT JOIN jobs j ON wg.id = j.workgroup_id
LEFT JOIN job_equipment je ON j.id = je.job_id
GROUP BY wg.id, c.company_name, c.owner_name;

-- Customer contract summary
CREATE VIEW v_customer_contracts AS
SELECT
    cu.id AS customer_id,
    cu.customer_name,
    cu.org_id,
    COUNT(DISTINCT ct.id) AS total_contracts,
    COUNT(DISTINCT ct.id) FILTER (WHERE ct.status = 'active') AS active_contracts,
    COALESCE(SUM(ct.total_value) FILTER (WHERE ct.status = 'active'), 0) AS active_value,
    COUNT(DISTINCT ws.id) AS site_count
FROM customers cu
LEFT JOIN contracts ct ON cu.id = ct.customer_id
LEFT JOIN worksites ws ON ws.customer_id = cu.id
GROUP BY cu.id;

-- Equipment utilization
CREATE VIEW v_equipment_utilization AS
SELECT
    e.id AS equipment_id,
    e.equipment_code,
    e.category,
    e.description,
    e.status,
    e.org_id,
    bl_home.name AS home_branch,
    bl_curr.name AS current_location,
    ws.name AS current_site,
    COUNT(DISTINCT je.id) AS total_transactions,
    COUNT(DISTINCT je.id) FILTER (WHERE je.created_at > NOW() - INTERVAL '30 days') AS transactions_30d,
    MAX(je.created_at) AS last_moved
FROM equipment e
LEFT JOIN business_locations bl_home ON e.home_branch_id = bl_home.id
LEFT JOIN business_locations bl_curr ON e.current_branch_id = bl_curr.id
LEFT JOIN worksites ws ON e.current_worksite_id = ws.id
LEFT JOIN job_equipment je ON e.id = je.equipment_id
GROUP BY e.id, bl_home.name, bl_curr.name, ws.name;


-- ████████████████████████████████████████████████████████████
-- PART 6: RLS FOR NEW TABLES
-- ████████████████████████████████████████████████████████████

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org customers" ON customers
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org customers" ON customers
    FOR ALL USING (org_id = auth_org_id());

CREATE POLICY "Users see own org equipment" ON equipment
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org equipment" ON equipment
    FOR ALL USING (org_id = auth_org_id());

CREATE POLICY "Users see own org contracts" ON contracts
    FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Users manage own org contracts" ON contracts
    FOR ALL USING (org_id = auth_org_id());

CREATE POLICY "Users see own org transaction types" ON transaction_types
    FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users see own org job equipment" ON job_equipment
    FOR SELECT USING (job_id IN (
        SELECT id FROM jobs WHERE workgroup_id IN (
            SELECT id FROM workgroups WHERE project_id IN (
                SELECT id FROM projects WHERE org_id = auth_org_id()
            )
        )
    ));

CREATE POLICY "Users see own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());


-- ████████████████████████████████████████████████████████████
-- PART 7: REALTIME FOR NEW TABLES
-- ████████████████████████████████████████████████████████████

ALTER PUBLICATION supabase_realtime ADD TABLE job_equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ████████████████████████████████████████████████████████████
-- PART 8: ERL FUNCTIONS & TRIGGERS
-- ████████████████████████████████████████████████████████████

-- Equipment status tracking on job_equipment confirmation
CREATE OR REPLACE FUNCTION fn_update_equipment_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Delivered to customer site
    IF NEW.status = 'delivered' AND NEW.transaction_type IN ('DEL', 'ZDL') THEN
        UPDATE equipment
        SET status = 'rented',
            current_branch_id = NULL,
            current_worksite_id = (SELECT customer_site_id FROM jobs WHERE id = NEW.job_id),
            updated_at = NOW()
        WHERE id = NEW.equipment_id;
    END IF;

    -- Picked up from customer
    IF NEW.status = 'picked_up' AND NEW.transaction_type = 'PU' THEN
        UPDATE equipment
        SET status = 'in_transit',
            current_worksite_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.equipment_id;
    END IF;

    -- Returned to branch
    IF NEW.status IN ('returned', 'confirmed') AND NEW.transaction_type IN ('RTB', 'IMB') THEN
        UPDATE equipment
        SET status = 'available',
            current_branch_id = NEW.load_unload_branch_id,
            current_worksite_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.equipment_id;
    END IF;

    -- Loaded for inter-branch transfer
    IF NEW.status = 'loaded' AND NEW.transaction_type = 'IML' THEN
        UPDATE equipment
        SET status = 'in_transit',
            current_branch_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.equipment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipment_location_on_job_equipment
    AFTER UPDATE OF status ON job_equipment
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_equipment_location();

-- Trip weight/equipment recalculation
CREATE OR REPLACE FUNCTION fn_recalculate_trip_stats(p_workgroup_id UUID)
RETURNS VOID AS $$
DECLARE
    v_weight INTEGER;
    v_count INTEGER;
    v_stops INTEGER;
BEGIN
    SELECT COALESCE(SUM(je.weight_lbs), 0), COUNT(DISTINCT je.equipment_id)
    INTO v_weight, v_count
    FROM job_equipment je
    JOIN jobs j ON je.job_id = j.id
    WHERE j.workgroup_id = p_workgroup_id;

    SELECT COUNT(*) INTO v_stops
    FROM jobs WHERE workgroup_id = p_workgroup_id;

    UPDATE workgroups
    SET total_weight_lbs = v_weight,
        total_equipment = v_count,
        total_stops = v_stops,
        updated_at = NOW()
    WHERE id = p_workgroup_id;
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers for new tables
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_job_equipment_updated_at BEFORE UPDATE ON job_equipment
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- ERL ADDITIONS COMPLETE
--
-- Added columns to: user_profiles, projects, contractors,
--   workgroups, jobs, invoices, uploads, audit_logs,
--   worksites, worksite_contacts
--
-- New tables: customers, equipment, contracts,
--   transaction_types, job_equipment, notifications
--
-- New views: v_branch_inventory, v_trip_detail,
--   v_customer_contracts, v_equipment_utilization
--
-- Next: Run 03_seed_data_erl.sql
-- ============================================================
