/**
 * ProjectOutlook — Overview sidebar
 *
 * Shows on the Overview (landing) tab:
 * - Critical Path
 * - AI Insights
 * - ★ Sensitivity Analysis (from ganttData, optional)
 * - Needs Attention
 * - Site Presence
 *
 * File: routes/owner/components/ProjectOutlook.tsx
 */
import { P, SC, SM, TI, DEFAULT_TRADE, CheckI, ClockI, AlertCI, AlertTI, SparkI, RadioI, UsersI, MapPinI, fmt, type IP } from "./projectConstants";
import type { UIDashboard } from "@/hooks/dashboardBridge";
import type { SensitivityReport } from "@/types/gantt";

const SENS_COLORS: Record<string, { bg: string; fg: string; ring: string; label: string }> = {
  critical:  { bg: "#FEF0ED", fg: "#D44A2E", ring: "#F5C5BA", label: "Critical" },
  high:      { bg: "#FFF8EE", fg: "#C07B1A", ring: "#F0D9A8", label: "High" },
  moderate:  { bg: "#EFF5FC", fg: "#2D6DB5", ring: "#BDD4EF", label: "Moderate" },
  resilient: { bg: "#EDFAF4", fg: "#2E7D5F", ring: "#B5E2CC", label: "Resilient" },
};

interface ProjectOutlookProps {
  d: UIDashboard;
  /** Optional sensitivity report — passed from ganttData when available */
  sensitivity?: SensitivityReport | null;
}

export function ProjectOutlook({ d, sensitivity }: ProjectOutlookProps) {
  // Extract sensitivity fields defensively (handles both snake_case and camelCase)
  const sensEntries: any[] = sensitivity?.entries || [];
  const sensSites: any[] = (sensitivity as any)?.site_sensitivities || (sensitivity as any)?.siteSensitivities || [];
  const sensBullets: string[] = (sensitivity as any)?.ai_bullets || (sensitivity as any)?.aiBullets || [];
  const sensTopRisks: any[] = (sensitivity as any)?.top_risks || (sensitivity as any)?.topRisks || [];
  const hasSensitivity = sensitivity && sensEntries.length > 0;

  return (
    <div style={{ width: 390, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "#fff", borderLeft: "1.5px solid #ECEAE6" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #ECEAE6", background: "#fff" }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: "#1A1814", letterSpacing: "-0.01em" }}>Project Outlook</h2>
      </div>

      {/* ── Critical Path ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: P.crit.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertCI size={12} color="#fff" /></div>Critical Path
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[{ s: "123 Main", ch: "Plumbing → Painting", sv: "high", dt: "Pending 18h. Painting delayed ~3 wks." },
            { s: "456 Oak", ch: "HVAC → Electrical", sv: "med", dt: "HVAC pending 12h. Electrical blocked." },
            { s: "789 Elm", ch: "Flooring → Painting", sv: "med", dt: "Flooring pending 6h. Painting blocked." }
          ].map((cp) => { const h = cp.sv === "high"; const c = h ? P.crit : P.pending; return (
            <div key={cp.ch} style={{ display: "flex", gap: 8, padding: "9px 10px", borderRadius: 12, background: c.bg, border: `1px solid ${c.ring}`, cursor: "pointer" }}>
              <ClockI size={16} color={c.fg} />
              <div><p style={{ fontSize: 13, fontWeight: 700, color: c.fg }}>{cp.s}: {cp.ch}</p><p style={{ fontSize: 12, marginTop: 2, color: h ? "#D44A2E" : "#C07B1A" }}>{cp.dt}</p></div>
            </div>
          ); })}
        </div>
      </div>

      {/* ── AI Insights ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#3D6B5E,#5AAE8F)", display: "flex", alignItems: "center", justifyContent: "center" }}><SparkI size={12} color="#fff" /></div>AI Insights
          </h3>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, background: P.done.grad, padding: "3px 10px", borderRadius: 12, color: "#fff" }}><RadioI size={10} color="#fff" />Live</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[{ t: "success", text: `${d.jDone} jobs complete. ${d.jActive} in progress across ${d.worksites.length} sites.`, IconC: CheckI },
            { t: "warning", text: `${d.wgPendingN} workgroups pending contractor response.`, IconC: AlertTI },
            { t: "info", text: "No GPS check-ins yet. Workers must check in on-site.", IconC: MapPinI }
          ].map((ins, i) => { const c = ins.t === "success" ? P.done : ins.t === "warning" ? P.pending : P.active; return (
            <div key={i} style={{ display: "flex", gap: 8, padding: "7px 8px", borderRadius: 10, cursor: "pointer", border: "1px solid transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.bg; e.currentTarget.style.borderColor = c.ring; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: c.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ins.IconC size={12} color="#fff" /></div>
              <p style={{ fontSize: 13, color: "#5C5043", lineHeight: 1.4 }}>{ins.text}</p>
            </div>
          ); })}
        </div>
      </div>

      {/* ── ★ Sensitivity Analysis ── */}
      {hasSensitivity && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#7C3AED,#9F7AEA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>🎯</span>
            </div>
            Schedule Sensitivity
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: (sensitivity!.critical_count ?? (sensitivity as any)?.criticalCount ?? 0) > 0 ? "#D44A2E" : "#2E7D5F" }}>
              {sensitivity!.critical_count ?? (sensitivity as any)?.criticalCount ?? 0} critical
            </span>
          </h3>

          {/* Summary stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
            {([
              { v: sensitivity!.critical_count ?? (sensitivity as any)?.criticalCount ?? 0, l: "Crit", c: SENS_COLORS.critical },
              { v: sensitivity!.high_count ?? (sensitivity as any)?.highCount ?? 0, l: "High", c: SENS_COLORS.high },
              { v: sensitivity!.moderate_count ?? (sensitivity as any)?.moderateCount ?? 0, l: "Med", c: SENS_COLORS.moderate },
              { v: sensitivity!.resilient_count ?? (sensitivity as any)?.resilientCount ?? 0, l: "Safe", c: SENS_COLORS.resilient },
            ] as const).map(it => (
              <div key={it.l} style={{ padding: "5px 2px", borderRadius: 6, textAlign: "center", background: it.c.bg, border: `1px solid ${it.c.ring}` }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: it.c.fg }}>{it.v}</p>
                <p style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: it.c.fg, opacity: 0.7 }}>{it.l}</p>
              </div>
            ))}
          </div>

          {/* Top risks (max 3 for overview — keep it compact) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sensTopRisks.slice(0, 3).map((entry: any) => {
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
                    {/* Coefficient bar */}
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

          {/* AI bullet (just the top one for overview brevity) */}
          {sensBullets.length > 0 && (
            <div style={{ marginTop: 6, padding: "5px 8px", borderRadius: 6, background: "#FAF9F6" }}>
              <p style={{ fontSize: 10, color: "#5C5043", lineHeight: 1.4 }}>
                <SparkI size={9} color="#8C7E6A" /> {sensBullets[0]}
              </p>
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
          {[{ v: d.wgPendingN, l: "Pending", p: P.pending }, { v: 0, l: "Invoices", p: P.draft }, { v: 0, l: "GPS Today", p: P.crit }, { v: d.wgActiveN, l: "Active", p: P.active }].map((it) => (
            <div key={it.l} style={{ padding: "10px 8px", borderRadius: 12, textAlign: "center" as const, background: it.p.bg, border: `1px solid ${it.p.ring}` }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: it.p.fg }}>{it.v}</p>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: it.p.fg, opacity: 0.6 }}>{it.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Site Presence ── */}
      <div style={{ padding: "12px 16px" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1A1814", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><UsersI size={14} color="#8C7E6A" />Site Presence</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.worksites.map((ws, wi) => { const ac = ws.workgroups.filter((wg) => wg.status === "in_progress").length; const sc2 = SC[wi % SC.length]; return (
            <div key={ws.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, border: `1px solid ${sc2.ring}`, background: sc2.bg }}>
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
