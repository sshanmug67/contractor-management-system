-- ============================================================
-- CMS MIGRATION — Project Settings + Template Library
-- Run: AFTER 03_seed_invoices_deps.sql in Supabase SQL Editor
--
-- Adds:
--   1. Project settings fields to projects table
--   2. project_templates table for Template Library
--   3. Indexes for template queries
--   4. RLS policies for templates
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1. ADD PROJECT SETTINGS FIELDS TO PROJECTS TABLE
-- ═══════════════════════════════════════════════════════════

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'direct'
        CHECK (project_type IN ('direct', 'contract')),
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS project_subtype TEXT,
    ADD COLUMN IF NOT EXISTS contractor_payment_terms INTEGER DEFAULT 15
        CHECK (contractor_payment_terms IN (15, 30, 45)),
    ADD COLUMN IF NOT EXISTS client_payment_terms INTEGER
        CHECK (client_payment_terms IS NULL OR client_payment_terms IN (30, 45, 60)),
    ADD COLUMN IF NOT EXISTS client_name TEXT,
    ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS retainage_pct DECIMAL(5,4) DEFAULT 0
        CHECK (retainage_pct >= 0 AND retainage_pct <= 0.20),
    ADD COLUMN IF NOT EXISTS retainage_release TEXT DEFAULT 'substantial_completion'
        CHECK (retainage_release IN ('substantial_completion', 'final_completion', 'time_based')),
    ADD COLUMN IF NOT EXISTS sub_retainage_pct DECIMAL(5,4) DEFAULT 0
        CHECK (sub_retainage_pct >= 0 AND sub_retainage_pct <= 0.20),
    ADD COLUMN IF NOT EXISTS draw_frequency TEXT DEFAULT 'monthly'
        CHECK (draw_frequency IN ('monthly', 'milestone', 'manual')),
    ADD COLUMN IF NOT EXISTS template_id UUID,
    ADD COLUMN IF NOT EXISTS scaffold_prompt TEXT,
    ADD COLUMN IF NOT EXISTS scaffold_metadata JSONB;

-- Index for filtering projects by type
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(org_id, project_type);


-- ═══════════════════════════════════════════════════════════
-- 2. CREATE PROJECT_TEMPLATES TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    project_subtype TEXT,
    project_type_default TEXT DEFAULT 'direct'
        CHECK (project_type_default IN ('direct', 'contract')),

    -- The complete project skeleton as JSONB
    -- Shape: { worksites: [...], workgroups: [...], jobs: [...] }
    -- Same ScaffoldResponse shape used by LLM endpoint
    scaffold_data JSONB NOT NULL,

    -- Default project settings applied when using this template
    default_settings JSONB,

    -- Template metadata
    is_system BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1 NOT NULL,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    created_by UUID,
    source TEXT DEFAULT 'manual'
        CHECK (source IN ('llm_scaffold', 'from_project', 'manual', 'system')),
    source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from projects.template_id to project_templates
ALTER TABLE projects
    ADD CONSTRAINT fk_project_template
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_templates_org ON project_templates(org_id);
CREATE INDEX idx_templates_industry ON project_templates(industry);
CREATE INDEX idx_templates_system ON project_templates(is_system);
CREATE INDEX idx_templates_usage ON project_templates(usage_count DESC);
CREATE INDEX idx_templates_archived ON project_templates(org_id, is_archived);

-- ═══════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org templates and system templates"
    ON project_templates FOR SELECT
    USING (
        org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid())
        OR is_system = TRUE
    );

CREATE POLICY "Users manage own org templates"
    ON project_templates FOR ALL
    USING (
        org_id = (SELECT org_id FROM user_profiles WHERE id = auth.uid())
        AND is_system = FALSE
    );

-- ═══════════════════════════════════════════════════════════
-- 5. UPDATE EXISTING SEED PROJECT WITH DEFAULT SETTINGS
-- ═══════════════════════════════════════════════════════════

UPDATE projects
SET project_type = 'direct',
    industry = 'residential_construction',
    project_subtype = 'multi_site_renovation',
    contractor_payment_terms = 15
WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- ============================================================
-- MIGRATION COMPLETE
--
-- New on projects table:
--   project_type, industry, project_subtype,
--   contractor_payment_terms, client_payment_terms,
--   client_name, contract_value,
--   retainage_pct, retainage_release, sub_retainage_pct,
--   draw_frequency, template_id,
--   scaffold_prompt, scaffold_metadata
--
-- New table: project_templates
--   Stores reusable project skeletons (workgroups, jobs, deps)
--   Same scaffold_data shape as LLM ScaffoldResponse
-- ============================================================
