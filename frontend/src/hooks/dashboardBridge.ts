/**
 * Dashboard Data Bridge
 *
 * Transforms the API response from GET /api/dashboard/owner
 * into the internal shape used by OwnerDashboard UI components.
 *
 * API shape:  { project, worksites: [{ workgroups: [{ jobs }] }], budget_summary, stats }
 * UI shape:   worksites[] with shortName, workgroups[] with contractor/dependsOn/durationDays
 */

import type {
  OwnerDashboardData,
  DashboardWorksite,
  DashboardWorkgroup,
  DashboardJob,
} from '@/types/dashboard';

/* ── UI-side types (matching what the rendering code expects) ── */

export interface UIJob {
  id: string;
  title: string;
  status: 'complete' | 'in_progress' | 'not_started';
  durationDays: number;
  sequence: number;
  budget: number;
  invoiced?: boolean;
  paid?: boolean;
  invoiceAmount?: number;
  dependsOnJobIds: string[];
}

export interface UIWorkgroup {
  id: string;
  projectId: string;             // v3: direct project reference
  worksiteId: string;            // v3: may be "" for project-level WGs
  title: string;
  trade: string;
  contractor: string;
  contractorAddress: string;
  contractorPhone: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  dependsOnIds: string[];
  jobs: UIJob[];
}

export interface UIWorksite {
  name: string;
  shortName: string;
  budget: number;
  workgroups: UIWorkgroup[];
}

export interface UIDashboard {
  projectTitle: string;
  projectStartDate: string;
  projectEndDate: string;
  totalBudget: number;
  worksites: UIWorksite[];
  // Pre-computed aggregates
  allWg: UIWorkgroup[];
  allJobs: UIJob[];
  jDone: number;
  jActive: number;
  jTotal: number;
  wgActiveN: number;
  wgPendingN: number;
  totalSpent: number;
  totalInvoiced: number;
}

/* ── Transform functions ── */

function normalizeJobStatus(status: string): 'complete' | 'in_progress' | 'not_started' {
  if (status === 'complete' || status === 'invoiced' || status === 'paid') return 'complete';
  if (status === 'in_progress') return 'in_progress';
  return 'not_started';
}

function makeShortName(name: string): string {
  // "123 Main St, Austin TX" → "123 Main St"
  const comma = name.indexOf(',');
  return comma > 0 ? name.substring(0, comma).trim() : name;
}

function transformJob(job: DashboardJob): UIJob {
  return {
    id: job.id,
    title: job.title,
    status: normalizeJobStatus(job.status),
    durationDays: job.est_duration_days || 1,
    sequence: job.sequence,
    budget: job.budget,
    invoiced: job.invoiced,
    paid: job.paid,
    invoiceAmount: job.invoice_amount,
    dependsOnJobIds: job.depends_on_job_ids || [],
  };
}

function transformWorkgroup(wg: DashboardWorkgroup): UIWorkgroup {
  return {
    id: wg.id,
    projectId: wg.project_id || '',      // v3
    worksiteId: wg.worksite_id || '',    // v3: may be "" for project-level WGs
    title: wg.title,
    trade: wg.trade || wg.title,
    contractor: wg.contractor_name || 'Unassigned',
    contractorAddress: (wg as any).contractorAddress || '',
    contractorPhone: (wg as any).contractorPhone || '',
    status: wg.status,
    startDate: wg.start_date || '',
    endDate: wg.end_date || '',
    budget: wg.budget,
    dependsOnIds: wg.depends_on_ids || [],
    jobs: wg.jobs.map(transformJob),
  };
}

function transformWorksite(ws: DashboardWorksite): UIWorksite {
  return {
    name: ws.name,
    shortName: makeShortName(ws.name),
    budget: ws.budget,
    workgroups: ws.workgroups.map(transformWorkgroup),
  };
}

/**
 * Main transform: API response → full UI data structure with pre-computed aggregates.
 */
export function transformDashboardData(data: OwnerDashboardData): UIDashboard {
  const worksites = data.worksites.map(transformWorksite);
  const allWg = worksites.flatMap(ws => ws.workgroups);
  const allJobs = allWg.flatMap(wg => wg.jobs);

  return {
    projectTitle: data.project?.title || 'Untitled Project',
    projectStartDate: data.project?.start_date || '',
    projectEndDate: data.project?.end_date || '',
    totalBudget: data.budget_summary.total_budget,
    worksites,
    allWg,
    allJobs,
    jDone: allJobs.filter(j => j.status === 'complete').length,
    jActive: allJobs.filter(j => j.status === 'in_progress').length,
    jTotal: allJobs.length,
    wgActiveN: allWg.filter(wg => wg.status === 'in_progress').length,
    wgPendingN: allWg.filter(wg => wg.status === 'pending').length,
    totalSpent: data.budget_summary.total_spent,
    totalInvoiced: data.budget_summary.total_invoiced,
  };
}
