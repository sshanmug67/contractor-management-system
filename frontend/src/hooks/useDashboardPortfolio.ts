// hooks/useDashboardPortfolio.ts
// ─────────────────────────────────────────────────────────
// Thin React hook for the Owner Dashboard landing page.
//
// All computation happens on the backend:
//   Celery worker → Redis cache → FastAPI router → this hook
//
// This hook only does:
//   1. Call the API
//   2. Map snake_case → camelCase for the React components
//   3. Format timestamps for display
//
// No aggregation, no insight generation, no stat computation.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  fetchPortfolioDashboard,
  type PortfolioDashboardDTO,
  type PortfolioProjectDTO,
  type PendingInvoiceDTO,
  type AIInsightDTO,
} from "@/services/portfolioService";

/* ═══════════════════ UI TYPES ═══════════════════ */
// camelCase versions of the backend DTOs for React components.

export interface UIProject {
  id: string;
  title: string;
  status: string;
  totalBudget: number;
  totalSpent: number;
  totalInvoiced: number;
  progressPct: number;
  startDate: string | null;
  endDate: string | null;
  sitesCount: number;
  workgroupsCount: number;
  jobsCount: number;
  jobsDone: number;
}

export interface UIPendingInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  submittedAt: string | null;
  contractorName: string;
  jobTitle: string;
  projectTitle: string;
  worksiteName: string;
}

export interface UIInsight {
  id: string;
  text: string;
  severity: "critical" | "warning" | "success" | "info";
}

export interface UIActivity {
  id: string;
  text: string;
  time: string;
  site: string;
  type: "success" | "warning" | "info" | "neutral";
}

export interface UIStats {
  activeProjects: number;
  onTrack: number;
  delayed: number;
  totalBudget: number;
  totalSpent: number;
  totalInvoiced: number;
  totalJobs: number;
  totalJobsDone: number;
  pendingWorkgroups: number;
  pendingInvoices: number;
}

export interface UIPortfolio {
  projects: UIProject[];
  stats: UIStats;
  pendingInvoices: UIPendingInvoice[];
  activity: UIActivity[];
  insights: UIInsight[];
}

/* ═══════════════════ MAPPERS ═══════════════════ */
// Pure transforms — snake_case → camelCase, no logic.

function mapProject(dto: PortfolioProjectDTO): UIProject {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    totalBudget: dto.total_budget,
    totalSpent: dto.total_paid,
    totalInvoiced: dto.total_invoiced,
    progressPct: dto.progress_pct,
    startDate: dto.start_date,
    endDate: dto.end_date,
    sitesCount: dto.worksite_count,
    workgroupsCount: dto.workgroup_count,
    jobsCount: dto.job_count,
    jobsDone: dto.jobs_complete,
  };
}

function mapInvoice(dto: PendingInvoiceDTO): UIPendingInvoice {
  return {
    id: dto.id,
    invoiceNumber: dto.invoice_number,
    amount: dto.amount,
    status: dto.status,
    submittedAt: dto.submitted_at,
    contractorName: dto.contractor_name,
    jobTitle: dto.job_title || dto.project_title,
    projectTitle: dto.project_title,
    worksiteName: dto.worksite_name,
  };
}

function mapInsight(dto: AIInsightDTO): UIInsight {
  return {
    id: dto.id,
    text: dto.text,
    severity: dto.severity === "info" ? "warning" : dto.severity,
  };
}

function mapActivity(dto: {
  id: string;
  entity_type: string;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}): UIActivity {
  const changes = dto.changes || {};
  // The backend should ideally return a pre-formatted text field.
  // For now we construct from the raw audit_log shape.
  const text = (changes as any).display_text || `${dto.action} on ${dto.entity_type}`;
  const site = (changes as any).worksite_name || "";

  let type: UIActivity["type"] = "neutral";
  if (dto.action.includes("complete")) type = "success";
  else if (dto.action.includes("submit") || dto.action.includes("invoice")) type = "warning";
  else if (dto.action.includes("accept") || dto.action.includes("start")) type = "info";

  return {
    id: dto.id,
    text,
    time: formatTimeAgo(dto.created_at),
    site,
    type,
  };
}

function mapStats(dto: PortfolioDashboardDTO["stats"]): UIStats {
  return {
    activeProjects: dto.active_projects,
    onTrack: dto.on_track,
    delayed: dto.delayed,
    totalBudget: dto.total_budget,
    totalSpent: dto.total_spent,
    totalInvoiced: dto.total_invoiced,
    totalJobs: dto.total_jobs,
    totalJobsDone: dto.total_jobs_done,
    pendingWorkgroups: dto.pending_workgroups,
    pendingInvoices: dto.pending_invoices,
  };
}

/** Simple relative time formatter */
function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ═══════════════════ HOOK ═══════════════════ */

export function useDashboardPortfolio() {
  const [data, setData] = useState<UIPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Single API call — backend returns everything pre-computed
      const dto: PortfolioDashboardDTO = await fetchPortfolioDashboard();

      // Map to UI shapes (snake_case → camelCase, formatting only)
      const portfolio: UIPortfolio = {
        projects: dto.projects.map(mapProject),
        stats: mapStats(dto.stats),
        pendingInvoices: dto.pending_invoices.map(mapInvoice),
        activity: dto.recent_activity.map(mapActivity),
        insights: dto.ai_insights.map(mapInsight),
      };

      setData(portfolio);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
