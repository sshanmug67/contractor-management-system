/**
 * Gantt Data Bridge + Hook
 *
 * Transforms the API response from GET /api/dependencies/gantt/{project_id}
 * into the internal shape used by GanttView UI components.
 *
 * API shape:  GanttDataResponse (snake_case, from backend/app/models/dependency.py)
 * UI shape:   UIGanttData (camelCase, with pre-computed aggregates)
 *
 * This is the ONLY data source for the Timeline tab.
 * The Overview and Budget tabs continue using useDashboard + dashboardBridge.
 *
 * Pattern: Same as dashboardBridge.ts — pure transforms, no logic.
 */

import { useState, useEffect, useCallback } from 'react';
import ganttService from '@/services/ganttService';
import type {
  GanttDataResponse,
  GanttWorksite,
  GanttWorkgroup,
  GanttJob,
  GanttAnalysis,
  ProjectGraph,
  CriticalityTier,
  AIInsight,
  BottleneckInfo,
  ResourceConflict,
  ParallelWork,
  CriticalityRanking,
  CashFlowMonth,
  CompletionForecast,
  HealthSnapshot,
  PreviewRequest,
  PreviewResponse,
  ChangeEdge,
} from '@/types/gantt';

/* ══════════════════════════════════════════════════
   UI-SIDE TYPES (camelCase for React components)
   ══════════════════════════════════════════════════ */

export interface UIGanttJob {
  id: string;
  title: string;
  budget: number;
  durationDays: number;
  sequence: number;
  status: 'not_started' | 'in_progress' | 'complete' | 'invoiced' | 'paid';
  invoiced: boolean;
  paid: boolean;
  invoiceAmount: number | null;
  dependsOnJobIds: string[];
  // DAG enrichments
  earliestStart: number;
  earliestFinish: number;
  floatDays: number;
  isCritical: boolean;
  criticalityTier: CriticalityTier;
}

export interface UIGanttWorkgroup {
  id: string;
  worksiteId: string;
  title: string;
  trade: string;
  contractorId: string | null;
  contractor: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  progressPct: number;
  dependsOnIds: string[];
  totalPaid: number;
  totalInvoiced: number;
  jobs: UIGanttJob[];
  // DAG enrichments
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  floatDays: number;
  isCritical: boolean;
  criticalityTier: CriticalityTier;
  isBottleneck: boolean;
  downstreamCount: number;
  statusMessage: string;
}

export interface UIGanttWorksite {
  id: string;
  name: string;
  shortName: string;
  addressLine1: string;
  city: string;
  state: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  progressPct: number;
  workgroups: UIGanttWorkgroup[];
}

export interface UIGanttAnalysis {
  criticalPath: string[];
  criticalPathDetails: any[];
  projectDurationDays: number;
  aiInsights: { severity: string; text: string }[];
  criticalityRanking: any[];
  bottlenecks: { workgroup_id: string; title: string; downstream_count: number; direct_successors: number; bottleneck_score: number; message: string }[];
  resourceConflicts: { contractor: string; contractor_id: string; workgroups: string[]; workgroup_titles: string[]; overlap_days: number; severity: string; message: string }[];
  parallelWork: any;
  cashflow: any;
  forecast: { correction_factor: number; confidence: string; trend: string; message: string; per_workgroup: any[] } | null;
  newlyUnblockedWorkgroups: any[];
  newlyUnblockedJobs: any[];
  overdueEntities: any[];
  approachingDeadlines: any[];
}

export interface UIGanttData {
  // Project header
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  projectStartDate: string | null;
  projectEndDate: string | null;
  projectStatus: string;
  totalBudget: number;
  totalSpent: number;
  totalInvoiced: number;

  // Hierarchy
  worksites: UIGanttWorksite[];

  // Analysis (all 9 methods pre-computed)
  analysis: UIGanttAnalysis;

  // Graph (for sending back to preview/apply/scenarios)
  graph: ProjectGraph;

  // Pre-computed aggregates (convenience for header/summary)
  allWg: UIGanttWorkgroup[];
  allJobs: UIGanttJob[];
  jDone: number;
  jActive: number;
  jTotal: number;
  wgActiveN: number;
  wgPendingN: number;
  wgCompleteN: number;
  criticalWgCount: number;
  bottleneckWgCount: number;
}


/* ══════════════════════════════════════════════════
   TRANSFORM FUNCTIONS — pure, no side effects
   ══════════════════════════════════════════════════ */

function makeShortName(name: string): string {
  const comma = name.indexOf(',');
  return comma > 0 ? name.substring(0, comma).trim() : name;
}

function transformJob(job: GanttJob): UIGanttJob {
  return {
    id: job.id,
    title: job.title,
    budget: job.budget,
    durationDays: job.est_duration_days || 1,
    sequence: job.sequence,
    status: job.status,
    invoiced: job.invoiced,
    paid: job.paid,
    invoiceAmount: job.invoice_amount,
    dependsOnJobIds: job.depends_on_job_ids || [],
    earliestStart: job.earliest_start ?? 0,
    earliestFinish: job.earliest_finish ?? 0,
    floatDays: job.float_days ?? 0,
    isCritical: job.is_critical ?? false,
    criticalityTier: job.criticality_tier || 'Low',
  };
}

function transformWorkgroup(wg: GanttWorkgroup): UIGanttWorkgroup {
  const jobs = wg.jobs.map(transformJob);

  return {
    id: wg.id,
    worksiteId: wg.worksite_id,
    title: wg.title,
    trade: wg.trade || wg.title,
    contractorId: wg.contractor_id,
    contractor: wg.contractor_name || 'Unassigned',
    budget: wg.budget,
    startDate: wg.start_date,
    endDate: wg.end_date,  // ★ Backend computes this from start_date + sum(job durations)
    status: wg.status,
    progressPct: wg.progress_pct,
    dependsOnIds: wg.depends_on_ids || [],
    totalPaid: wg.paid ?? 0,
    totalInvoiced: wg.invoiced ?? 0,
    jobs,
    earliestStart: wg.earliest_start ?? 0,
    earliestFinish: wg.earliest_finish ?? 0,
    latestStart: wg.latest_start ?? 0,
    latestFinish: wg.latest_finish ?? 0,
    floatDays: wg.float_days ?? 0,
    isCritical: wg.is_critical ?? false,
    criticalityTier: wg.criticality_tier || 'Low',
    isBottleneck: wg.is_bottleneck ?? false,
    downstreamCount: wg.downstream_count ?? 0,
    statusMessage: wg.status_message || '',
  };
}

function transformWorksite(ws: GanttWorksite): UIGanttWorksite {
  return {
    id: ws.id,
    name: ws.name,
    shortName: makeShortName(ws.name),
    addressLine1: ws.address_line1,
    city: ws.city,
    state: ws.state,
    budget: ws.budget,
    startDate: ws.start_date,
    endDate: ws.end_date,
    status: ws.status,
    progressPct: ws.progress_pct,
    workgroups: ws.workgroups.map(transformWorkgroup),
  };
}

function transformAnalysis(raw: any): UIGanttAnalysis {
  // The backend response has a different shape than a single nested object.
  // critical_path and ai_insight_bullets are at TOP LEVEL of the response,
  // while analysis contains the detailed breakdowns.
  // This function receives the FULL response and assembles the UI shape.
  // Called from transformGanttData which passes the whole response.

  const analysis = raw.analysis || {};
  const bottlenecksRaw = analysis.bottlenecks || [];
  const conflictsRaw = analysis.resource_conflicts || [];
  const forecastRaw = analysis.forecast || {};

  return {
    // These come from TOP LEVEL of response (not inside analysis)
    criticalPath: raw.critical_path || [],
    criticalPathDetails: raw.critical_path_details || [],
    projectDurationDays: raw.project?.project_duration_days || 0,
    aiInsights: (raw.ai_insight_bullets || []).map((text: string) => ({
      severity: text.toLowerCase().includes('overdue') ? 'warning' as const
        : text.toLowerCase().includes('complete') ? 'success' as const
        : 'info' as const,
      text,
    })),

    // These come from INSIDE analysis
    criticalityRanking: analysis.criticality_rankings || [],
    bottlenecks: bottlenecksRaw.map((b: any) => ({
      workgroup_id: b.entity_id || b.workgroup_id || '',
      title: b.title || '',
      downstream_count: b.total_downstream || b.downstream_count || 0,
      direct_successors: b.direct_successors || 0,
      bottleneck_score: b.bottleneck_score || 0,
      message: b.message || '',
    })),
    resourceConflicts: conflictsRaw.map((c: any) => ({
      contractor: c.contractor_name || c.contractor || '',
      contractor_id: c.contractor_id || '',
      workgroups: (c.workgroups || []).map((w: any) => w.id || w),
      workgroup_titles: (c.workgroups || []).map((w: any) => w.title || w),
      overlap_days: c.overlap_days || 0,
      severity: c.severity || 'potential',
      message: c.message || '',
    })),
    parallelWork: analysis.parallel_work || { runnable: [], active: [], idle: [], idle_count: 0, message: '' },
    cashflow: analysis.cashflow || { monthly: [], cumulative: [], peak_month: '', total_remaining: 0 },
    forecast: forecastRaw.correction_factor ? {
      correction_factor: forecastRaw.correction_factor,
      confidence: forecastRaw.confidence || 'low',
      trend: forecastRaw.trend || 'stable',
      message: forecastRaw.message || '',
      per_workgroup: forecastRaw.per_workgroup || [],
    } : null,

    // Unblocked / overdue (from analysis)
    newlyUnblockedWorkgroups: analysis.newly_unblocked_workgroups || [],
    newlyUnblockedJobs: analysis.newly_unblocked_jobs || [],
    overdueEntities: analysis.overdue_entities || [],
    approachingDeadlines: analysis.approaching_deadlines || [],
  };
}

/**
 * Main transform: GanttDataResponse → UIGanttData with pre-computed aggregates.
 */
export function transformGanttData(data: any): UIGanttData {
  const worksites = (data.worksites || []).map(transformWorksite);
  const allWg = worksites.flatMap((ws: any) => ws.workgroups);
  const allJobs = allWg.flatMap((wg: any) => wg.jobs);

  const isDone = (s: string) => s === 'complete' || s === 'invoiced' || s === 'paid';
  const project = data.project || {};
  const budget = data.budget_summary || {};

  return {
    projectId: project.id || '',
    projectTitle: project.title || 'Untitled Project',
    projectDescription: project.description || '',
    projectStartDate: project.start_date,
    projectEndDate: project.end_date,
    projectStatus: project.status || '',
    totalBudget: budget.total_budget || 0,
    totalSpent: budget.total_spent || 0,
    totalInvoiced: budget.total_invoiced || 0,
    worksites,
    analysis: transformAnalysis(data),  // Pass full response — critical_path is top-level
    graph: data.graph || { workgroups: [], jobs: [], wg_edges: [], job_edges: [] },
    allWg,
    allJobs,
    jDone: allJobs.filter((j: any) => isDone(j.status)).length,
    jActive: allJobs.filter((j: any) => j.status === 'in_progress').length,
    jTotal: allJobs.length,
    wgActiveN: allWg.filter((wg: any) => wg.status === 'in_progress').length,
    wgPendingN: allWg.filter((wg: any) => wg.status === 'pending').length,
    wgCompleteN: allWg.filter((wg: any) => wg.status === 'complete').length,
    criticalWgCount: allWg.filter((wg: any) => wg.isCritical).length,
    bottleneckWgCount: allWg.filter((wg: any) => wg.isBottleneck).length,
  };
}


/* ══════════════════════════════════════════════════
   REACT HOOK — useGanttData
   ══════════════════════════════════════════════════ */

interface UseGanttDataReturn {
  data: UIGanttData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Preview dependency changes before applying */
  previewChanges: (changes: ChangeEdge[]) => Promise<PreviewResponse | null>;
  /** Apply dependency changes (invalidates cache, fires worker) */
  applyChanges: (changes: ChangeEdge[]) => Promise<boolean>;
}

export function useGanttData(projectId?: string): UseGanttDataReturn {
  const [data, setData] = useState<UIGanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGantt = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ganttService.getGanttData(projectId);
      setData(transformGanttData(result));
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to load Gantt data';
      setError(message);
      console.error('Gantt fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGantt();
  }, [fetchGantt]);

  /**
   * Preview changes: sends proposed edits + the embedded ProjectGraph
   * to POST /api/dependencies/preview. Returns impact analysis.
   */
  const previewChanges = useCallback(async (changes: ChangeEdge[]): Promise<PreviewResponse | null> => {
    if (!data || !projectId) return null;
    try {
      const request: PreviewRequest = {
        project_id: projectId,
        changes,
        graph: data.graph,
      };
      return await ganttService.previewChanges(request);
    } catch (err: any) {
      console.error('Preview error:', err);
      return null;
    }
  }, [data, projectId]);

  /**
   * Apply changes: commits to DB, invalidates cache, fires refresh worker.
   * Automatically refreshes Gantt data after success.
   */
  const applyChanges = useCallback(async (changes: ChangeEdge[]): Promise<boolean> => {
    if (!projectId) return false;
    try {
      const result = await ganttService.applyChanges({
        project_id: projectId,
        changes,
      });
      if (result.success) {
        // Re-fetch fresh data (worker will have refreshed cache)
        await fetchGantt();
      }
      return result.success;
    } catch (err: any) {
      console.error('Apply error:', err);
      return false;
    }
  }, [projectId, fetchGantt]);

  return { data, loading, error, refresh: fetchGantt, previewChanges, applyChanges };
}
