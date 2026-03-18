/**
 * Gantt Data Types
 *
 * Matches the backend GanttData Pydantic models from:
 *   backend/app/models/dependency.py
 *
 * These are the RAW API shapes (snake_case).
 * The ganttBridge.ts transforms them into camelCase UI types.
 *
 * Endpoint: GET /api/dependencies/gantt/{project_id}
 * Response: GanttDataResponse (29KB cached, 10min TTL)
 */

// ─── Core entities (superset of Dashboard types) ───

export interface GanttJob {
  id: string;
  title: string;
  budget: number;
  est_duration_days: number;
  sequence: number;
  status: 'not_started' | 'in_progress' | 'complete' | 'invoiced' | 'paid';
  invoiced: boolean;
  paid: boolean;
  invoice_amount: number | null;
  depends_on_job_ids: string[];
  // ── Computed dates from backend ──
  start_date: string | null;   // ISO date, computed from WG start + cumulative sequence
  end_date: string | null;
  // ── DAG analysis enrichments ──
  earliest_start: number;   // days from project start
  earliest_finish: number;
  float_days: number;
  is_critical: boolean;
  criticality_tier: CriticalityTier;
}

export interface GanttWorkgroup {
  id: string;
  project_id: string;                    // v3: direct project reference
  worksite_id: string;                   // v3: may be "" for project-level WGs
  title: string;
  trade: string;
  contractor_id: string | null;
  contractor_name: string;
  budget: number;
  start_date: string | null;   // ISO date
  end_date: string | null;
  status: string;
  progress_pct: number;
  depends_on_ids: string[];
  paid: number;
  invoiced: number;
  jobs: GanttJob[];
  // ── DAG analysis enrichments ──
  earliest_start: number;
  earliest_finish: number;
  latest_start: number;
  latest_finish: number;
  float_days: number;
  is_critical: boolean;
  criticality_tier: CriticalityTier;
  is_bottleneck: boolean;
  downstream_count: number;
  status_message: string;
}

export interface GanttWorksite {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress_pct: number;
  workgroups: GanttWorkgroup[];
}

export interface GanttProject {
  id: string;
  title: string;
  description: string;
  total_budget: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

// ─── Analysis sidebar models (from DependencyService 9 methods) ───

export type CriticalityTier = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AIInsight {
  severity: 'critical' | 'warning' | 'success' | 'info';
  text: string;
}

export interface BottleneckInfo {
  workgroup_id: string;
  title: string;
  downstream_count: number;
}

export interface ResourceConflict {
  contractor: string;
  contractor_id: string;
  workgroups: string[];         // workgroup IDs
  workgroup_titles: string[];
  overlap_days: number;
}

export interface ParallelWork {
  workgroup_id: string;
  title: string;
  contractor: string;
  status: string;
  reason: string;              // why it's idle/available
}

export interface CriticalityRanking {
  workgroup_id: string;
  title: string;
  tier: CriticalityTier;
  float_days: number;
  downstream_count: number;
}

export interface CashFlowMonth {
  month: string;               // "Jan 2026"
  amount: number;
  cumulative: number;
}

export interface CompletionForecast {
  original_end_date: string;
  projected_end_date: string;
  delta_days: number;           // positive = late, negative = early
  correction_factor: number;    // e.g. 1.15 means 15% slower than planned
  confidence: 'high' | 'medium' | 'low';
}

export interface HealthSnapshot {
  status: 'on_track' | 'at_risk' | 'delayed';
  unblocked_workgroups: string[];
  overdue_workgroups: string[];
  critical_path: string[];      // workgroup IDs in order
  status_messages: Record<string, string>;  // wg_id → message
  ai_bullets: string[];
}

// ─── ProjectGraph (for sending back to preview/apply/scenarios endpoints) ───

export interface WorkgroupNode {
  id: string;
  duration: number;
  is_complete: boolean;
}

export interface JobNode {
  id: string;
  workgroup_id: string;
  duration: number;
  is_complete: boolean;
}

export interface DependencyEdge {
  from_id: string;
  to_id: string;
}

export interface ProjectGraph {
  workgroup_nodes: WorkgroupNode[];
  job_nodes: JobNode[];
  workgroup_edges: DependencyEdge[];
  job_edges: DependencyEdge[];
}

// ─── Analysis aggregate ───

export interface GanttAnalysis {
  health: HealthSnapshot;
  critical_path: string[];       // workgroup IDs in critical path order
  project_duration_days: number;
  ai_insights: AIInsight[];
  criticality_ranking: CriticalityRanking[];
  bottlenecks: BottleneckInfo[];
  resource_conflicts: ResourceConflict[];
  parallel_work: ParallelWork[];
  cashflow: CashFlowMonth[];
  forecast: CompletionForecast | null;
}

// ─── Top-level response ───

export interface GanttDataResponse {
  project: GanttProject;
  worksites: GanttWorksite[];
  budget_summary: {
    total_budget: number;
    total_spent: number;
    total_invoiced: number;
  };
  analysis: GanttAnalysis;
  graph: ProjectGraph;           // embedded for preview/scenario round-trips
}

// ─── Preview / Apply / Scenarios request/response types ───

export interface ChangeEdge {
  action: 'add' | 'remove';
  from_id: string;
  to_id: string;
  level: 'workgroup' | 'job';
}

export interface PreviewRequest {
  project_id: string;
  changes: ChangeEdge[];
  graph: ProjectGraph;
}

export interface PreviewResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  impact: {
    critical_path_changed: boolean;
    new_critical_path: string[];
    new_duration_days: number;
    duration_delta: number;
    affected_workgroups: string[];
  };
}

export interface ApplyRequest {
  project_id: string;
  changes: ChangeEdge[];
}

export interface ApplyResponse {
  success: boolean;
  applied_count: number;
  message: string;
}

export interface ScenarioRequest {
  project_id: string;
  scenarios: {
    name: string;
    delays: {
      entity_id: string;
      entity_type: "workgroup" | "job";
      delay_days: number;
    }[];
  }[];
  graph: ProjectGraph;
}

export interface ScenarioResult {
  scenario_name: string;
  original_end_date: string | null;
  projected_end_date: string | null;
  original_duration_days: number;
  projected_duration_days: number;
  delta_days: number;
  critical_path: string[];
  shifts: {
    entity_id: string;
    title: string;
    entity_type: string;
    old_earliest_start: number;
    new_earliest_start: number;
    shift_days: number;
  }[];
  absorbed_by: string[];
  propagated_through: string[];
  cost_impact: number | null;
}

export interface ScenarioResponse {
  scenarios: ScenarioResult[];
  summary?: string;
}

// ─── Sensitivity Analysis ───
 
export type SensitivityLevel = 'critical' | 'high' | 'moderate' | 'resilient';
 
export interface SensitivityEntry {
  workgroup_id: string;
  title: string;
  trade: string;
  contractor_name: string;
  worksite_id: string;
  worksite_name: string;
  status: string;
 
  // Core metrics
  test_delay_days: number;
  project_delay_days: number;
  sensitivity_coefficient: number;     // 0.0 to 1.0
  sensitivity_level: SensitivityLevel;
 
  // Float / buffer
  float_days: number;
  break_even_days: number;
 
  // Downstream
  downstream_count: number;
  affected_workgroup_ids: string[];
  affected_budget: number;
 
  // Flags
  is_on_critical_path: boolean;
  is_bottleneck: boolean;
}
 
export interface SiteSensitivity {
  worksite_id: string;
  worksite_name: string;
  workgroup_count: number;
  critical_count: number;
  high_count: number;
  most_sensitive_wg: SensitivityEntry | null;
  avg_coefficient: number;
  max_coefficient: number;
  site_risk_score: number;
}
 
export interface SensitivityReport {
  project_id: string;
  test_delay_days: number;
  computed_at: string;
 
  entries: SensitivityEntry[];
  site_sensitivities: SiteSensitivity[];
 
  total_workgroups_tested: number;
  critical_count: number;
  high_count: number;
  moderate_count: number;
  resilient_count: number;
 
  top_risks: SensitivityEntry[];
 
  summary: string;
  ai_bullets: string[];
}