/**
 * ProjectDetailPage — Orchestrator
 *
 * Manages tab routing, page header, and both data hooks.
 * All rendering delegated to sub-components.
 *
 * Data architecture:
 *   useDashboard(projectId)  → feeds Overview tab, Budget tab, header
 *   useGanttData(projectId)  → feeds Timeline tab only (GanttData from DAG engine)
 *
 * File: routes/owner/ProjectDetailPage.tsx
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { transformDashboardData } from "@/hooks/dashboardBridge";
import type { UIDashboard, UIWorkgroup } from "@/hooks/dashboardBridge";
import { useGanttData } from "@/hooks/ganttBridge";

import { P, css, CalI, ChevLI, BellI, GridI, GanttI, DollarI, TabButton, fmt } from "./components/projectConstants";
import { GanttView } from "./components/GanttView";
import { GanttOutlook } from "./components/GanttOutlook";
import { CardView } from "./components/CardView";
import { ProjectOutlook } from "./components/ProjectOutlook";
import { BudgetExpensesView } from "./components/BudgetExpensesView";
import { WorkgroupDrawer } from "./components/WorkgroupDrawer";

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "budget">("overview");
  const [drawerWg, setDrawerWg] = useState<UIWorkgroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  const { projectId } = useParams<{ projectId: string }>();

  // Dashboard data — feeds Overview tab, Budget tab, and header
  const { data, loading, error, refresh } = useDashboard(projectId);
  const d = data ? transformDashboardData(data) : null;

  // Gantt data — feeds Timeline tab only (superset of dashboard + all DAG analysis)
  const {
    data: ganttData,
    loading: ganttLoading,
    error: ganttError,
    refresh: ganttRefresh,
    previewChanges,
    applyChanges,
  } = useGanttData(projectId);

  if (loading || !d) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#8C7E6A", fontWeight: 600 }}>Loading project...</p>
      </div>
    </div>
  ); }

  if (error) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center", padding: 32, background: "#fef2f2", borderRadius: 16, maxWidth: 420 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#D44A2E", marginBottom: 8 }}>Failed to load project</p>
        <p style={{ fontSize: 13, color: "#D44A2E", marginBottom: 16 }}>{error}</p>
        <button onClick={refresh} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: P.crit.grad, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  ); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Outfit',system-ui,sans-serif", opacity: ready ? 1 : 0, transition: "opacity .3s" }}>
      <style>{css}</style>

      {/* ── Header with breadcrumb ── */}
      <div style={{ padding: "9px 16px", background: "#fff", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span onClick={() => navigate("/dashboard")} style={{ fontSize: 12, color: "#8C7E6A", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#9C8E7C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6B5F4F"; }}>
            <ChevLI size={12} color="#8C7E6A" />Dashboard
          </span>
          <span style={{ fontSize: 12, color: "#5C5043" }}>/</span>
          <span style={{ fontSize: 12, color: "#9C8E7C" }}>{d.projectTitle}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>{d.projectTitle}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              {d.projectStartDate && <span style={{ fontSize: 13, color: "#8C7E6A", display: "flex", alignItems: "center", gap: 3 }}><CalI size={12} color="#8C7E6A" />{new Date(d.projectStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {d.projectEndDate ? new Date(d.projectEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}</span>}
              <span style={{ fontSize: 13, color: "#5C5043" }}>·</span><span style={{ fontSize: 13, color: "#9C8E7C", fontWeight: 700 }}>{fmt(d.totalBudget)}</span>
              <span style={{ fontSize: 13, color: "#5C5043" }}>·</span><span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D5F" }}>{d.jDone}/{d.jTotal} done ({d.jTotal > 0 ? Math.round(d.jDone / d.jTotal * 100) : 0}%)</span>
              {d.jActive > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#2D6DB5" }}>{d.jActive} active</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[{ v: d.wgActiveN, l: "Active", p: P.active }, { v: d.wgPendingN, l: "Pending", p: P.pending }, { v: d.allWg.length - d.wgActiveN - d.wgPendingN, l: "Draft", p: P.draft }].map((s) =>
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: s.p.grad }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{s.v}</span><span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{s.l}</span>
              </div>
            )}
            <button onClick={() => { refresh(); ganttRefresh(); }} title="Refresh" style={{ padding: 7, borderRadius: 8, border: "1px solid #ECEAE6", background: "#FAFAF8", cursor: "pointer" }}>
              <BellI size={14} color="#9C8E7C" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #ECEAE6", background: "#fff", flexShrink: 0, padding: "0 16px" }}>
        <TabButton label="Overview" icon={GridI} isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <TabButton label="Timeline" icon={GanttI} isActive={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} />
        <TabButton label="Budget & Expenses" icon={DollarI} isActive={activeTab === "budget"} onClick={() => setActiveTab("budget")} />

        {/* Gantt legend */}
        {activeTab === "timeline" && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
          {[{ l: "Done", g: P.done.grad }, { l: "Active", g: P.active.grad }, { l: "Queued", g: P.ns.grad }].map((x) =>
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 6, borderRadius: 3, background: x.g }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>{x.l}</span></div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 6, borderRadius: 3, background: P.crit.grad, border: "1px solid #D44A2E" }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>Critical</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, transform: "rotate(45deg)", background: P.done.fg, border: "1px solid #fff", boxShadow: `0 0 0 0.5px ${P.done.fg}` }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>Milestone</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><svg width="20" height="10"><path d="M1,5 L19,5" stroke="#D44A2E" strokeWidth="1.5" strokeDasharray="4,3" /><path d="M16,2 L20,5 L16,8" fill="none" stroke="#D44A2E" strokeWidth="1.2" /></svg><span style={{ fontSize: 10, color: "#8C7E6A" }}>Crit dep</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><svg width="20" height="10"><path d="M1,5 L19,5" stroke="#C07B1A" strokeWidth="1.5" /><path d="M16,2 L20,5 L16,8" fill="none" stroke="#C07B1A" strokeWidth="1.2" /></svg><span style={{ fontSize: 10, color: "#8C7E6A" }}>Cross dep</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 6, borderRadius: 3, background: "rgba(45,109,181,0.15)", border: "1px dashed rgba(45,109,181,0.4)" }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>Float</span></div>
        </div>}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#F7F6F3" }}>
        {activeTab === "overview" && <CardView onOpenDrawer={setDrawerWg} d={d} />}

        {activeTab === "timeline" && (
          ganttData
            ? <GanttView g={ganttData} previewChanges={previewChanges} applyChanges={applyChanges} />
            : ganttLoading
              ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, color: "#8C7E6A" }}>Loading timeline analysis...</p>
                  </div>
                </div>
              : ganttError
                ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center", padding: 24 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#D44A2E", marginBottom: 8 }}>Failed to load timeline</p>
                      <p style={{ fontSize: 12, color: "#8C7E6A", marginBottom: 12 }}>{ganttError}</p>
                      <button onClick={ganttRefresh} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: P.crit.grad, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Retry</button>
                    </div>
                  </div>
                : null
        )}

        {activeTab === "budget" && <BudgetExpensesView d={d} />}

        {/* Sidebars */}
        {activeTab === "overview" && <ProjectOutlook d={d} />}
        {activeTab === "timeline" && ganttData && <GanttOutlook g={ganttData} />}
      </div>

      {/* Drawer */}
      {drawerWg && <WorkgroupDrawer wg={drawerWg} allWg={d.allWg} onClose={() => setDrawerWg(null)} />}
    </div>
  );
}

export default ProjectDetailPage;
