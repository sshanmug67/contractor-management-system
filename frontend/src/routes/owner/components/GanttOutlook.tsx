/**
 * GanttOutlook — Timeline Sidebar
 *
 * Shows real analysis data from the DAG engine:
 * - Critical path with site details
 * - AI insights
 * - Bottlenecks
 * - ★ Sensitivity Analysis (NEW — schedule risk heatmap)
 * - Needs Attention counters
 * - Completion Forecast
 * - Site Presence
 *
 * File: routes/owner/components/GanttOutlook.tsx
 */

import { P, SC, SM, TI, DEFAULT_TRADE, CheckI, ClockI, AlertCI, AlertTI, SparkI, RadioI, UsersI, MapPinI, fmt, type IP } from "./projectConstants";
import type { UIGanttData, UIGanttWorkgroup } from "@/hooks/ganttBridge";

const SENS_COLORS: Record<string, { bg: string; fg: string; ring: string; label: string }> = {
  critical:  { bg: "#FEF0ED", fg: "#D44A2E", ring: "#F5C5BA", label: "Critical" },
  high:      { bg: "#FFF8EE", fg: "#C07B1A", ring: "#F0D9A8", label: "High" },
  moderate:  { bg: "#EFF5FC", fg: "#2D6DB5", ring: "#BDD4EF", label: "Moderate" },
  resilient: { bg: "#EDFAF4", fg: "#2E7D5F", ring: "#B5E2CC", label: "Resilient" },
};

export function GanttOutlook({ g }: { g: UIGanttData }) {
  const a = g.analysis || {} as any;
  const criticalPath: string[] = a.criticalPath || [];
  const aiInsights: { severity: string; text: string }[] = a.aiInsights || [];
  const bottlenecks: any[] = a.bottlenecks || [];
  const resourceConflicts = (a.resourceConflicts || []).filter((rc: any) => rc.overlap_days > 0);

  // Sensitivity data from backend (embedded in GanttData.analysis.sensitivity)
  const sensitivity: any = a.sensitivity || null;
  const sensEntries: any[] = sensitivity?.entries || [];
  const sensSites: any[] = sensitivity?.site_sensitivities || sensitivity?.siteSensitivities || [];
  const sensBullets: string[] = sensitivity?.ai_bullets || sensitivity?.aiBullets || [];
  const sensTopRisks: any[] = sensitivity?.top_risks || sensitivity?.topRisks || [];

  // Build workgroup → worksite lookup for site context
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
          {criticalPath.map(wgId => {
            const wg = g.allWg.find(w => w.id === wgId);
            if (!wg) return null;
            if (wg.status === "complete") return null;
            const isActive = wg.status === "in_progress";
            const c = isActive ? P.crit : P.pending;
            const siteName = wgToSite.get(wgId) || "";
            const dn = wg.jobs.filter(j => j.status === "complete" || j.status === "paid").length;

            return (
              <div key={wgId} style={{ display: "flex", gap: 8, padding: "9px 10px", borderRadius: 10, background: c.bg, border: `1px solid ${c.ring}`, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.fg; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.ring; }}>
                <ClockI size={14} color={c.fg} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: c.fg }}>
                    {siteName && <span style={{ opacity: 0.7 }}>{siteName} → </span>}
                    {wg.title}
                  </p>
                  <p style={{ fontSize: 11, color: isActive ? "#D44A2E" : "#8C7E6A", marginTop: 1 }}>
                    {wg.contractor} · {wg.statusMessage || (isActive ? "In progress" : "Waiting")}
                  </p>
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

      {/* ── ★ Sensitivity Analysis ── */}
      {sensitivity && sensEntries.length > 0 && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#7C3AED,#9F7AEA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>🎯</span>
            </div>
            Schedule Sensitivity
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: (sensitivity.critical_count || sensitivity.criticalCount || 0) > 0 ? "#D44A2E" : "#2E7D5F" }}>
              {sensitivity.critical_count || sensitivity.criticalCount || 0} critical
            </span>
          </h3>

          {/* Summary stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
            {([
              { v: sensitivity.critical_count ?? sensitivity.criticalCount ?? 0, l: "Crit", c: SENS_COLORS.critical },
              { v: sensitivity.high_count ?? sensitivity.highCount ?? 0, l: "High", c: SENS_COLORS.high },
              { v: sensitivity.moderate_count ?? sensitivity.moderateCount ?? 0, l: "Med", c: SENS_COLORS.moderate },
              { v: sensitivity.resilient_count ?? sensitivity.resilientCount ?? 0, l: "Safe", c: SENS_COLORS.resilient },
            ] as const).map(it => (
              <div key={it.l} style={{ padding: "5px 2px", borderRadius: 6, textAlign: "center", background: it.c.bg, border: `1px solid ${it.c.ring}` }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: it.c.fg }}>{it.v}</p>
                <p style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: it.c.fg, opacity: 0.7 }}>{it.l}</p>
              </div>
            ))}
          </div>

          {/* Top risks (max 4) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sensTopRisks.slice(0, 4).map((entry: any) => {
              const level = entry.sensitivity_level || entry.sensitivityLevel || "moderate";
              const sc = SENS_COLORS[level] || SENS_COLORS.moderate;
              const coeff = entry.sensitivity_coefficient ?? entry.sensitivityCoefficient ?? 0;
              const coeffPct = Math.round(coeff * 100);
              const trade = entry.trade || "";
              const ti = TI[trade] || DEFAULT_TRADE;
              const TradeIcon = ti.Icon;
              const wsName = entry.worksite_name || entry.worksiteName || "";
              const floatDays = entry.float_days ?? entry.floatDays ?? 0;
              const downstream = entry.downstream_count ?? entry.downstreamCount ?? 0;
              const isCritPath = entry.is_on_critical_path ?? entry.isOnCriticalPath ?? false;

              return (
                <div key={entry.workgroup_id || entry.workgroupId} style={{ display: "flex", gap: 7, padding: "7px 9px", borderRadius: 8, background: sc.bg, border: `1px solid ${sc.ring}` }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0, marginTop: 1 }}>
                    <TradeIcon size={10} color={ti.c} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {wsName && <span style={{ opacity: 0.7, fontWeight: 500 }}>{wsName} → </span>}
                        {entry.title}
                      </span>
                      <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: sc.fg, padding: "1px 4px", borderRadius: 3, flexShrink: 0, marginLeft: 4 }}>{sc.label.toUpperCase()}</span>
                    </div>
                    {/* Sensitivity coefficient bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${sc.fg}15`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${coeffPct}%`, borderRadius: 2, background: sc.fg, transition: "width .4s" }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 800, color: sc.fg, fontFamily: "'JetBrains Mono', monospace", minWidth: 24, textAlign: "right" }}>{coeffPct}%</span>
                    </div>
                    <p style={{ fontSize: 9, color: "#8C7E6A", marginTop: 2 }}>
                      +3d → +{entry.project_delay_days ?? entry.projectDelayDays ?? 0}d project
                      {floatDays > 0 && <span> · {floatDays}d buffer</span>}
                      {downstream > 0 && <span> · {downstream} downstream</span>}
                      {isCritPath && <span style={{ color: "#D44A2E", fontWeight: 600 }}> · Crit path</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI insight bullets for sensitivity */}
          {sensBullets.length > 0 && (
            <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 6, background: "#FAF9F6" }}>
              {sensBullets.slice(0, 2).map((b, i) => (
                <p key={i} style={{ fontSize: 10, color: "#5C5043", lineHeight: 1.4, marginBottom: i < sensBullets.length - 1 ? 3 : 0 }}>
                  <SparkI size={9} color="#8C7E6A" /> {b}
                </p>
              ))}
            </div>
          )}

          {/* Per-site risk (if multiple sites) */}
          {sensSites.length > 1 && (
            <div style={{ marginTop: 8 }}>
              {sensSites.map((site: any) => {
                const maxCoeff = site.max_coefficient ?? site.maxCoefficient ?? 0;
                const critCount = site.critical_count ?? site.criticalCount ?? 0;
                const riskPct = Math.min(maxCoeff * 100, 100);
                return (
                  <div key={site.worksite_id || site.worksiteId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#3D3529", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {site.worksite_name || site.worksiteName}
                    </span>
                    <div style={{ width: 50, height: 4, borderRadius: 2, background: "#F0EDE8", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${riskPct}%`, borderRadius: 2, background: riskPct > 80 ? P.crit.fg : riskPct > 40 ? P.pending.fg : P.done.fg }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: critCount > 0 ? "#D44A2E" : "#2E7D5F", minWidth: 42, textAlign: "right" }}>
                      {critCount > 0 ? `${critCount} crit` : "Low"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
