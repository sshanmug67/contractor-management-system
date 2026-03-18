/**
 * Dashboard API Types
 *
 * Matches the shape returned by GET /api/dashboard/owner
 */

export interface DashboardJob {
  id: string;
  title: string;
  description?: string;
  budget: number;
  est_duration_days: number;
  sequence: number;
  status: 'not_started' | 'in_progress' | 'complete' | 'invoiced' | 'paid';
  invoiced: boolean;
  paid: boolean;
  invoice_amount: number;
  depends_on_job_ids: string[];
}

export interface DashboardWorkgroup {
  id: string;
  project_id: string;                    // v3: direct project reference
  worksite_id: string;                   // v3: may be "" for project-level WGs
  title: string;
  trade?: string;
  contractor_id?: string;
  contractor_name: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: string;
  progress_pct: number;
  depends_on_ids: string[];
  paid: number;
  invoiced: number;
  jobs: DashboardJob[];
}

export interface DashboardWorksite {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: string;
  progress_pct: number;
  workgroups: DashboardWorkgroup[];
}

export interface DashboardProject {
  id: string;
  title: string;
  description?: string;
  total_budget: number;
  start_date?: string;
  end_date?: string;
  status: string;
}

export interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  total_invoiced: number;
  remaining: number;
}

export interface DashboardStats {
  worksite_count: number;
  workgroup_count: number;
  wg_active: number;
  wg_pending: number;
  job_count: number;
  jobs_done: number;
  jobs_active: number;
}

export interface OwnerDashboardData {
  project: DashboardProject | null;
  worksites: DashboardWorksite[];
  budget_summary: BudgetSummary;
  stats: DashboardStats;
}
