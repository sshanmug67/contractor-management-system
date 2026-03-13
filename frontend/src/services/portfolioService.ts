// services/portfolioService.ts
// ─────────────────────────────────────────────────────────
// Calls the FastAPI backend for dashboard data.
// The endpoint path depends on how dashboard.py router is mounted.
// If mounted as: app.include_router(dashboard_router, prefix="/api/dashboard")
// Then the full path is: /api/dashboard/owner/portfolio
//
// Adjust the path below to match your router mount prefix.
// ─────────────────────────────────────────────────────────

import api from "@/services/api";

/* ═══════════════════ RESPONSE TYPES ═══════════════════ */

export interface PortfolioProjectDTO {
  id: string;
  title: string;
  status: string;
  total_budget: number;
  total_paid: number;
  total_invoiced: number;
  progress_pct: number;
  start_date: string | null;
  end_date: string | null;
  worksite_count: number;
  workgroup_count: number;
  job_count: number;
  jobs_complete: number;
}

export interface PendingInvoiceDTO {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  submitted_at: string | null;
  contractor_name: string;
  job_title: string | null;
  project_title: string;
  worksite_name: string;
}

export interface AIInsightDTO {
  id: string;
  text: string;
  severity: "critical" | "warning" | "success" | "info";
}

export interface PortfolioDashboardDTO {
  projects: PortfolioProjectDTO[];
  stats: {
    active_projects: number;
    on_track: number;
    delayed: number;
    total_budget: number;
    total_spent: number;
    total_invoiced: number;
    total_jobs: number;
    total_jobs_done: number;
    pending_workgroups: number;
    pending_invoices: number;
  };
  pending_invoices: PendingInvoiceDTO[];
  pending_workgroups: Array<{
    id: string;
    title: string;
    trade: string;
    contractor_name: string;
    worksite_name: string;
    status: string;
  }>;
  recent_activity: Array<{
    id: string;
    entity_type: string;
    action: string;
    changes: Record<string, unknown> | null;
    created_at: string;
  }>;
  ai_insights: AIInsightDTO[];
}

/* ═══════════════════ API CALLS ═══════════════════ */

// Adjust this if your router mount prefix is different
const DASHBOARD_PREFIX = "/dashboard";

/**
 * GET /api/dashboard/owner/portfolio
 *
 * Backend serves from Redis L2 cache (~2ms) or falls through
 * to ProviderRegistry → Supabase (~300ms) on cache miss.
 * Celery worker refreshes cache every 5 min.
 */
export async function fetchPortfolioDashboard(): Promise<PortfolioDashboardDTO> {
  const response = await api.get(`${DASHBOARD_PREFIX}/owner/portfolio`);
  return response.data;
}

/**
 * GET /api/dashboard/owner
 *
 * Existing single-project dashboard for ProjectDetailPage.
 * Optionally filtered by project_id.
 */
export async function fetchProjectDashboard(projectId?: string): Promise<unknown> {
  const params = projectId ? { project_id: projectId } : {};
  const response = await api.get(`${DASHBOARD_PREFIX}/owner`, { params });
  return response.data;
}

/**
 * GET /api/dashboard/owner/budget
 *
 * Budget summary for the Budget & Expenses tab.
 */
export async function fetchBudgetSummary(): Promise<unknown> {
  const response = await api.get(`${DASHBOARD_PREFIX}/owner/budget`);
  return response.data;
}
