/**
 * Scaffold & Template Types
 *
 * Mirrors backend Pydantic models from:
 *   app/models/project_settings.py
 *
 * Naming convention:
 *   - API types (snake_case) — raw shapes from backend
 *   - UI types (camelCase) — what React components consume
 *   - The scaffoldBridge.ts handles the conversion
 *
 * File: src/types/scaffold.ts
 */

// ═══════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════

export type ProjectType = "direct" | "contract";
export type RetainageRelease = "substantial_completion" | "final_completion" | "time_based";
export type DrawFrequency = "monthly" | "milestone" | "manual";
export type ContractorPaymentTerms = 15 | 30 | 45;
export type ClientPaymentTerms = 30 | 45 | 60;
export type TemplateSource = "llm_scaffold" | "from_project" | "manual" | "system";

// ═══════════════════════════════════════════════════════════
// PROJECT SETTINGS (fields on projects table)
// ═══════════════════════════════════════════════════════════

export interface ProjectSettings {
  project_type: ProjectType;
  industry: string | null;
  project_subtype: string | null;
  contractor_payment_terms: ContractorPaymentTerms;
  client_payment_terms: ClientPaymentTerms | null;
  client_name: string | null;
  contract_value: number | null;
  retainage_pct: number;
  retainage_release: RetainageRelease;
  sub_retainage_pct: number;
  draw_frequency: DrawFrequency;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  project_type: "direct",
  industry: null,
  project_subtype: null,
  contractor_payment_terms: 15,
  client_payment_terms: null,
  client_name: null,
  contract_value: null,
  retainage_pct: 0,
  retainage_release: "substantial_completion",
  sub_retainage_pct: 0,
  draw_frequency: "monthly",
};

// ═══════════════════════════════════════════════════════════
// SCAFFOLD MODELS (LLM generation response)
// ═══════════════════════════════════════════════════════════

export interface ScaffoldWorksite {
  name: string;
  address: string;
}

export interface ScaffoldWorkgroup {
  title: string;
  trade: string;
  contractor_type: string;
  worksite_index: number;
  depends_on_indices: number[];
  notes: string;
  budget_pct: number;
}

export interface ScaffoldJob {
  title: string;
  workgroup_index: number;
  sequence: number;
  est_duration_days: number;
  budget_pct: number;
  notes: string;
}

export interface ScaffoldResponse {
  worksites: ScaffoldWorksite[];
  workgroups: ScaffoldWorkgroup[];
  jobs: ScaffoldJob[];
  summary: string;
  estimated_duration_days: number;
  trade_count: number;
}

// ═══════════════════════════════════════════════════════════
// REQUEST MODELS
// ═══════════════════════════════════════════════════════════

export interface ScaffoldRequest {
  description: string;
  project_type: ProjectType;
  industry: string | null;
  budget: number | null;
  target_duration_days: number | null;
  num_worksites: number;
}

export interface RefineRequest {
  current_scaffold: ScaffoldResponse;
  feedback: string;
}

export interface CreateFromScaffoldRequest {
  scaffold: ScaffoldResponse;
  project_settings: ProjectSettings;
  project_name: string;
  project_description: string;
  total_budget: number | null;
  start_date: string | null;
  save_as_template: boolean;
  template_name: string | null;
}

export interface CreateFromTemplateRequest {
  project_settings: ProjectSettings;
  project_name: string;
  project_description: string;
  total_budget: number | null;
  start_date: string | null;
  remove_workgroup_indices: number[];
  remove_job_indices: number[];
}

export interface CreateProjectResult {
  status: string;
  project_id: string;
  worksite_count: number;
  workgroup_count: number;
  job_count: number;
  template_id: string | null;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE MODELS
// ═══════════════════════════════════════════════════════════

export interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  project_subtype: string | null;
  project_type_default: ProjectType;
  is_system: boolean;
  version: number;
  usage_count: number;
  source: TemplateSource;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  workgroup_count: number;
  job_count: number;
}

export interface ProjectTemplate extends TemplateListItem {
  scaffold_data: ScaffoldResponse;
  default_settings: Partial<ProjectSettings> | null;
  created_by: string | null;
  source_project_id: string | null;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  industry?: string;
  project_subtype?: string;
  project_type_default?: ProjectType;
  scaffold_data: ScaffoldResponse;
  default_settings?: Partial<ProjectSettings>;
  tags?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  industry?: string;
  project_subtype?: string;
  scaffold_data?: ScaffoldResponse;
  default_settings?: Partial<ProjectSettings>;
  tags?: string[];
}

export interface CreateFromProjectRequest {
  name: string;
  description?: string;
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════
// QUICK STARTS
// ═══════════════════════════════════════════════════════════

export interface QuickStartTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  prompt: string;
  industry: string;
  project_subtype: string;
}

// ═══════════════════════════════════════════════════════════
// WIZARD STATE (frontend-only)
// ═══════════════════════════════════════════════════════════

export type WizardStep =
  | "basics"
  | "path_choice"
  | "build_plan"
  | "settings"
  | "review";

export type BuildPath = "template" | "ai" | null;

export type GraphMode = "simple" | "interactive";

export interface WizardState {
  step: WizardStep;
  buildPath: BuildPath;
  graphMode: GraphMode;

  // Step 1: Basics
  projectName: string;
  projectType: ProjectType;
  industry: string;
  projectSubtype: string;
  clientName: string;
  contractValue: number | null;
  totalBudget: number | null;
  startDate: string | null;

  // Step 2/3: Build plan
  selectedTemplateId: string | null;
  description: string;
  numWorksites: number;
  targetDuration: string;

  // Scaffold (from template or AI)
  scaffold: ScaffoldResponse | null;
  isGenerating: boolean;
  generateError: string | null;

  // Step 4: Settings
  settings: ProjectSettings;

  // Step 5: Review
  saveAsTemplate: boolean;
  templateName: string;
  isCreating: boolean;
  createError: string | null;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: "basics",
  buildPath: null,
  graphMode: "simple",

  projectName: "",
  projectType: "direct",
  industry: "",
  projectSubtype: "",
  clientName: "",
  contractValue: null,
  totalBudget: null,
  startDate: null,

  selectedTemplateId: null,
  description: "",
  numWorksites: 1,
  targetDuration: "",

  scaffold: null,
  isGenerating: false,
  generateError: null,

  settings: { ...DEFAULT_PROJECT_SETTINGS },

  saveAsTemplate: false,
  templateName: "",
  isCreating: false,
  createError: null,
};

// ═══════════════════════════════════════════════════════════
// INDUSTRY OPTIONS (for dropdowns)
// ═══════════════════════════════════════════════════════════

export const INDUSTRIES = [
  { value: "residential_construction", label: "Residential Construction" },
  { value: "commercial_construction", label: "Commercial Construction" },
  { value: "landscaping", label: "Landscaping" },
  { value: "equipment_maintenance", label: "Equipment Maintenance" },
  { value: "other", label: "Other" },
] as const;

export const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  residential_construction: [
    { value: "kitchen_remodel", label: "Kitchen Remodel" },
    { value: "bathroom_remodel", label: "Bathroom Remodel" },
    { value: "full_home_renovation", label: "Full Home Renovation" },
    { value: "addition", label: "Addition" },
    { value: "multi_site_renovation", label: "Multi-Site Renovation" },
  ],
  commercial_construction: [
    { value: "office_buildout", label: "Office Buildout" },
    { value: "retail_fitout", label: "Retail Fit-Out" },
    { value: "restaurant_buildout", label: "Restaurant Buildout" },
    { value: "warehouse_renovation", label: "Warehouse Renovation" },
  ],
  landscaping: [
    { value: "landscape_install", label: "Landscape Install" },
    { value: "hardscape", label: "Hardscape" },
    { value: "maintenance_program", label: "Maintenance Program" },
  ],
  equipment_maintenance: [
    { value: "fleet_maintenance", label: "Fleet Maintenance" },
    { value: "facility_maintenance", label: "Facility Maintenance" },
  ],
};