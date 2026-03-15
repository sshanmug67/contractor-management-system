/**
 * GanttOutlook — Timeline Sidebar
 *
 * Shows real analysis data from the DAG engine:
 * - Critical path with site details (Enhancement #4)
 * - AI insights
 * - Bottlenecks
 * - Needs Attention counters
 * - Completion Forecast
 * - Site Presence
 *
 * File: routes/owner/components/GanttOutlook.tsx
 */

import { P, SC, SM, CheckI, ClockI, AlertCI, AlertTI, SparkI, RadioI, UsersI, fmt } from "./projectConstants";
import type { UIGanttData, UIGanttWorkgroup } from "@/hooks/ganttBridge";

export function GanttOutlook({ g }: { g: UIGanttData }) {
  const a = g.analysis || {} as any;
  const criticalPath: string[] = a.criticalPath || [];
  const aiInsights: { severity: string; text: string }[] = a.aiInsights || [];
  const bottlenecks: any[] = a.bottlenecks || [];
  const resourceConflicts = (a.resourceConflicts || []).filter((rc: any) => rc.overlap_days > 0);

  // ★ ENHANCEMENT 4: Build workgroup → worksite lookup for site context
  const wgToSite = new Map<string, string>();
  g.worksites.forEach(ws => {
    ws.workgroups.forEach(wg => {
      wgToSite.set(wg.id, ws.shortName);
    });
  });

  return (
    <div style={{ width: 390, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "#fff", borderLeft: "1.5px solid #ECEAE6" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: "#1A1814", letterSpacing: "-0.01em" }}>Project Outlook</h2>
      </div>

      {/* ── Critical Path with site details ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: P.crit.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertCI size={12} color="#fff" /></div>
          Critical Path
          {(() => {
            const completedCount = criticalPath.filter(id => { const w = g.allWg.find(x => x.id === id); return w && w.status === "complete"; }).length;
            const remaining = criticalPath.length - completedCount;
            return <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#D44A2E" }}>{remaining} remaining{completedCount > 0 ? ` · ${completedCount} done` : ''}</span>;
          })()}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* ★ REFINEMENT 5: Only show non-complete critical path nodes */}
          {criticalPath.map(wgId => {
            const wg = g.allWg.find(w => w.id === wgId);
            if (!wg) return null;
            if (wg.status === "complete") return null; // Hide completed
            const isActive = wg.status === "in_progress";
            const isDone = false; // already filtered out above
            const c = isActive ? P.crit : P.pending;
            const siteName = wgToSite.get(wgId) || "";
            const dn = wg.jobs.filter(j => j.status === "complete" || j.status === "paid").length;

            return (
              <div key={wgId} style={{ display: "flex", gap: 8, padding: "9px 10px", borderRadius: 10, background: c.bg, border: `1px solid ${c.ring}`, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.fg; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.ring; }}>
                <ClockI size={14} color={c.fg} />
                <div style={{ flex: 1 }}>
                  {/* ★ ENHANCEMENT 4: Show "Site → Workgroup" format */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: c.fg }}>
                    {siteName && <span style={{ opacity: 0.7 }}>{siteName} → </span>}
                    {wg.title}
                  </p>
                  {/* Contractor + status message */}
                  <p style={{ fontSize: 11, color: isActive ? "#D44A2E" : "#8C7E6A", marginTop: 1 }}>
                    {wg.contractor} · {wg.statusMessage || (isDone ? "Complete" : "Waiting")}
                  </p>
                  {/* Job count + budget */}
                  <p style={{ fontSize: 10, color: "#B5A99A", marginTop: 2 }}>
                    {dn}/{wg.jobs.length} jobs done · {fmt(wg.budget)}
                    {wg.floatDays > 0 && <span style={{ color: "#2D6DB5", fontWeight: 600 }}> · {wg.floatDays}d float</span>}
                  </p>
                </div>
              </div>
            );
          })}
          {criticalPath.length === 0 && <p style={{ fontSize: 12, color: "#9C8E7C", fontStyle: "italic" }}>No critical path computed yet.</p>}
        </div>
      </div>

      {/* ── AI Insights ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><SparkI size={12} color="#fff" /></div>
            AI Insights
          </h3>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, background: P.done.grad, padding: "3px 10px", borderRadius: 12, color: "#fff" }}><RadioI size={10} color="#fff" />Live</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {aiInsights.map((ins, i) => {
            const c = ins.severity === "success" ? P.done : ins.severity === "warning" ? P.pending : ins.severity === "critical" ? P.crit : P.active;
            const IconC = ins.severity === "success" ? CheckI : ins.severity === "warning" ? AlertTI : ins.severity === "critical" ? AlertCI : SparkI;
            return (
              <div key={i} style={{ display: "flex", gap: 8, padding: "7px 8px", borderRadius: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: c.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconC size={12} color="#fff" /></div>
                <p style={{ fontSize: 13, color: "#5C5043", lineHeight: 1.4 }}>{ins.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottlenecks ── */}
      {bottlenecks.length > 0 && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", marginBottom: 10 }}>Bottlenecks</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {bottlenecks.map((bn: any) => {
              const siteName = wgToSite.get(bn.workgroup_id) || "";
              return (
                <div key={bn.workgroup_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: "#F5F0FF", border: "1px solid #E0D4F0" }}>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#7C3AED", color: "#fff", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>⚠ BTL ×{bn.downstream_count}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3058" }}>
                      {siteName && <span style={{ opacity: 0.7 }}>{siteName} → </span>}
                      {bn.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Needs Attention ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", marginBottom: 10 }}>Needs Attention</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { v: g.wgPendingN, l: "Pending", p: P.pending },
            { v: g.criticalWgCount, l: "Critical", p: P.crit },
            { v: g.bottleneckWgCount, l: "Bottleneck", p: { bg: "#F5F0FF", fg: "#7C3AED", ring: "#E0D4F0", grad: "linear-gradient(135deg,#7C3AED,#9F7AEA)" } },
            { v: g.wgActiveN, l: "Active", p: P.active },
          ].map(it => (
            <div key={it.l} style={{ padding: "10px 8px", borderRadius: 12, textAlign: "center" as const, background: it.p.bg, border: `1px solid ${it.p.ring}` }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: it.p.fg }}>{it.v}</p>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: it.p.fg, opacity: 0.6 }}>{it.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Completion Forecast ── */}
      {a.forecast && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", marginBottom: 10 }}>Completion Forecast</h3>
          <div style={{ padding: "10px 12px", borderRadius: 12, background: a.forecast.correction_factor > 1.05 ? P.crit.bg : P.done.bg, border: `1px solid ${a.forecast.correction_factor > 1.05 ? P.crit.ring : P.done.ring}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "#8C7E6A" }}>Pace</span><span style={{ fontSize: 12, fontWeight: 700, color: a.forecast.correction_factor > 1.05 ? P.crit.fg : P.done.fg }}>{a.forecast.correction_factor}x vs estimates</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: "#8C7E6A" }}>Confidence</span><span style={{ fontSize: 12, fontWeight: 700, color: "#5C5043", textTransform: "capitalize" }}>{a.forecast.confidence}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: "#8C7E6A" }}>Trend</span><span style={{ fontSize: 12, fontWeight: 700, color: a.forecast.trend === "improving" ? P.done.fg : a.forecast.trend === "worsening" ? P.crit.fg : "#8C7E6A", textTransform: "capitalize" }}>{a.forecast.trend}</span></div>
            {a.forecast.message && <p style={{ fontSize: 11, color: "#8C7E6A", marginTop: 6, fontStyle: "italic" }}>{a.forecast.message}</p>}
          </div>
        </div>
      )}

      {/* ── Site Presence ── */}
      <div style={{ padding: "12px 16px" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><UsersI size={14} color="#8C7E6A" />Site Presence</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {g.worksites.map((ws, wi) => { const ac = ws.workgroups.filter(wg => wg.status === "in_progress").length; const sc2 = SC[wi % SC.length]; return (
            <div key={ws.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, border: `1px solid ${sc2.ring}`, background: sc2.bg }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: ac > 0 ? P.done.grad : "#C4B5A2" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: sc2.text, flex: 1 }}>{ws.shortName}</span>
              <span style={{ fontSize: 12, color: sc2.accent, fontWeight: 600 }}>{ac > 0 ? `${ac} active` : "Idle"}</span>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}
