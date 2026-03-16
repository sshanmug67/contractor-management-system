/**
 * ScenarioPanel v4 — Multi-Workgroup Simulation + Sensitivity Analysis
 *
 * Two modes:
 *   "manual"      — User picks WGs, drags sliders, runs combined what-if
 *   "sensitivity"  — Displays backend-computed sensitivity rankings
 *
 * Sensitivity data comes from:
 *   GET /api/dependencies/sensitivity/{project_id}  (cache-first)
 *   POST /api/dependencies/sensitivity/{project_id}/refresh  (force recompute)
 *
 * Key changes from v3:
 *   ✦ mode toggle between manual simulation and sensitivity view
 *   ✦ Completed WGs allowed in manual simulation
 *   ✦ Per-site impact breakdown in results
 *   ✦ Sensitivity heatmap view with coefficient bars
 *   ✦ "Run Sensitivity Analysis" button triggers backend refresh
 *
 * File: routes/owner/components/ScenarioPanel.tsx
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { P, SC, TI, DEFAULT_TRADE, AlertCI, AlertTI, SparkI, XI, DollarI, MapPinI, CheckI, fmt, fmtFull, fmtDate, type IP } from "./projectConstants";
import ganttService from "@/services/ganttService";
import type { UIGanttData, UIGanttWorkgroup } from "@/hooks/ganttBridge";
import type { ScenarioResult, SensitivityReport, SensitivityEntry, SiteSensitivity } from "@/types/gantt";

export interface SimulationShift {
  entityId: string;
  shiftDays: number;
}

interface DelayEntry {
  workgroupId: string;
  delayDays: number;
}

type PanelMode = "manual" | "sensitivity";

interface ScenarioPanelProps {
  g: UIGanttData;
  workgroupIds: string[];
  onClose: () => void;
  onShiftsChanged?: (shifts: SimulationShift[]) => void;
  initialMode?: PanelMode;
}

/* ═══════════════════ HELPERS ═══════════════════ */

const MAX_SLIDER = 30;
const addDays = (dateStr: string | null, days: number): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const fD = (d: string | null) => (d ? fmtDate(d) : "—");
const SL: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#8C7E6A", textTransform: "uppercase", letterSpacing: "0.06em" };

const SENSITIVITY_COLORS: Record<string, { bg: string; fg: string; ring: string; label: string }> = {
  critical: { bg: "#FEF0ED", fg: "#D44A2E", ring: "#F5C5BA", label: "Critical" },
  high:     { bg: "#FFF8EE", fg: "#C07B1A", ring: "#F0D9A8", label: "High" },
  moderate: { bg: "#EFF5FC", fg: "#2D6DB5", ring: "#BDD4EF", label: "Moderate" },
  resilient:{ bg: "#EDFAF4", fg: "#2E7D5F", ring: "#B5E2CC", label: "Resilient" },
};

/* ═══════════════════ WG SEARCH DROPDOWN ═══════════════════ */

function WgSearchDropdown({ allWg, excludeIds, worksites, onSelect, onCancel }: {
  allWg: UIGanttWorkgroup[]; excludeIds: Set<string>;
  worksites: UIGanttData["worksites"]; onSelect: (id: string) => void; onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const wgSiteMap = useMemo(() => {
    const m = new Map<string, string>();
    worksites.forEach(ws => ws.workgroups.forEach(wg => m.set(wg.id, ws.shortName)));
    return m;
  }, [worksites]);

  const available = allWg.filter(wg =>
    !excludeIds.has(wg.id) &&
    (search === "" ||
      wg.title.toLowerCase().includes(search.toLowerCase()) ||
      wg.contractor.toLowerCase().includes(search.toLowerCase()) ||
      (wgSiteMap.get(wg.id) || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ animation: "scaleIn .15s ease both", border: "1.5px solid rgba(124,58,237,0.25)", borderRadius: 10, background: "#fff", overflow: "hidden", marginBottom: 8 }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #F0EDE8" }}>
        <input ref={inputRef} type="text" placeholder="Search workgroup or contractor..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onCancel(); }}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 12, fontWeight: 600, color: "#3D3529", fontFamily: "'Outfit',sans-serif", background: "transparent", padding: "2px 0" }} />
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {available.length === 0 && <div style={{ padding: "10px 12px", fontSize: 11, color: "#B5A99A", fontStyle: "italic", textAlign: "center" }}>{search ? "No matching workgroups" : "All workgroups already added"}</div>}
        {available.map(wg => {
          const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon;
          const siteName = wgSiteMap.get(wg.id) || "";
          const isDone = wg.status === "complete";
          return (
            <div key={wg.id}
              onClick={() => { if (!isDone) onSelect(wg.id); }}
              onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = "rgba(124,58,237,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", cursor: isDone ? "default" : "pointer", transition: "background .1s", opacity: isDone ? 0.4 : 1, pointerEvents: isDone ? "none" : "auto" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}><TradeIcon size={11} color={ti.c} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isDone ? "#B5A99A" : "#3D3529", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {siteName && <span style={{ color: "#8C7E6A", fontWeight: 500 }}>{siteName} → </span>}{wg.title}
                  {isDone && <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: "#B5A99A", padding: "1px 4px", borderRadius: 3, marginLeft: 5, verticalAlign: "middle" }}>DONE</span>}
                </div>
                <div style={{ fontSize: 10, color: "#9C8E7C" }}>
                  {wg.contractor} · {fmt(wg.budget)}
                  {isDone && <span> · Complete — no schedule impact</span>}
                  {!isDone && wg.floatDays > 0 && <span style={{ color: "#2D6DB5", fontWeight: 600 }}> · {wg.floatDays}d float</span>}
                </div>
              </div>
              {!isDone && <span style={{ fontSize: 9, fontWeight: 700, color: "#7C3AED", opacity: 0.6 }}>+ ADD</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding: "5px 10px", borderTop: "1px solid #F0EDE8", textAlign: "right" }}>
        <button onClick={onCancel} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #ECEAE6", background: "#fff", fontSize: 10, fontWeight: 600, color: "#8C7E6A", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════ DELAY CARD ═══════════════════ */

function DelayCard({ wg, siteName, delayDays, onDelayChange, onRemove, canRemove }: {
  wg: UIGanttWorkgroup; siteName: string; delayDays: number;
  onDelayChange: (days: number) => void; onRemove: () => void; canRemove: boolean;
}) {
  const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon;
  const floatDays = wg.floatDays || 0;
  const exceedsFloat = delayDays > floatDays;
  const isDone = wg.status === "complete";

  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: exceedsFloat ? "rgba(212,74,46,0.03)" : delayDays > 0 ? "rgba(124,58,237,0.03)" : "#FAFAF8", border: `1.5px solid ${exceedsFloat ? "rgba(212,74,46,0.2)" : delayDays > 0 ? "rgba(124,58,237,0.18)" : "#F0EDE8"}`, marginBottom: 6, transition: "all .2s", animation: "scaleIn .2s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}><TradeIcon size={12} color={ti.c} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {siteName && <span style={{ color: "#8C7E6A", fontWeight: 500, fontSize: 11 }}>{siteName} → </span>}{wg.title}
            {isDone && <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: P.done.fg, padding: "1px 4px", borderRadius: 3, marginLeft: 5, verticalAlign: "middle" }}>DONE</span>}
          </div>
          <div style={{ fontSize: 10, color: "#9C8E7C" }}>{wg.contractor} · {fmt(wg.budget)}{floatDays > 0 && <span style={{ color: "#2D6DB5", fontWeight: 600 }}> · {floatDays}d float</span>}{floatDays === 0 && wg.isCritical && <span style={{ color: "#D44A2E", fontWeight: 600 }}> · Critical</span>}</div>
        </div>
        <span style={{ fontSize: 20, fontWeight: 900, color: exceedsFloat ? "#D44A2E" : delayDays > 0 ? "#7C3AED" : "#B5A99A", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, minWidth: 40, textAlign: "right" }}>{delayDays > 0 ? `+${delayDays}d` : "0d"}</span>
        {canRemove && <button onClick={onRemove} style={{ padding: 3, borderRadius: 5, border: "1px solid #ECEAE6", background: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><XI size={10} color="#8C7E6A" /></button>}
      </div>
      <input type="range" min={0} max={MAX_SLIDER} value={delayDays} onChange={e => onDelayChange(Number(e.target.value))} style={{ width: "100%", accentColor: exceedsFloat ? "#D44A2E" : "#7C3AED", cursor: "pointer", height: 5 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
        <span style={{ fontSize: 9, color: "#B5A99A" }}>0</span>
        {floatDays > 0 && floatDays < MAX_SLIDER && <span style={{ fontSize: 9, color: "#2D6DB5", fontWeight: 700 }}>↑ buffer {floatDays}d</span>}
        <span style={{ fontSize: 9, color: "#B5A99A" }}>{MAX_SLIDER}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
        {[3, 7, 14, 21].map(d => <button key={d} onClick={() => onDelayChange(d)} style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", border: delayDays === d ? "1.5px solid #7C3AED" : "1.5px solid #ECEAE6", background: delayDays === d ? "rgba(124,58,237,0.08)" : "#fff", color: delayDays === d ? "#7C3AED" : "#8C7E6A" }}>+{d}d</button>)}
        {floatDays > 0 && <button onClick={() => onDelayChange(floatDays + 1)} style={{ padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", border: "1.5px solid #D44A2E40", background: "#FEF0ED", color: "#D44A2E" }}>Buffer+1 ({floatDays + 1}d)</button>}
      </div>
      {delayDays > 0 && floatDays > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", height: 10, borderRadius: 4, overflow: "hidden", background: "#F0EDE8" }}>
            {Math.min(floatDays, delayDays) > 0 && <div style={{ width: `${(Math.min(floatDays, delayDays) / delayDays) * 100}%`, height: "100%", background: P.done.grad, transition: "width .3s", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 7, fontWeight: 800, color: "#fff" }}>{Math.min(floatDays, delayDays)}d safe</span></div>}
            {delayDays > floatDays && <div style={{ width: `${((delayDays - floatDays) / delayDays) * 100}%`, height: "100%", background: P.crit.grad, transition: "width .3s", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 7, fontWeight: 800, color: "#fff" }}>{delayDays - floatDays}d spills</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ SENSITIVITY VIEW ═══════════════════ */

function SensitivityView({ g, report, loading, onRefresh, onSimulateWg }: {
  g: UIGanttData; report: SensitivityReport | null; loading: boolean;
  onRefresh: () => void; onSimulateWg: (wgId: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 20, height: 20, border: "2.5px solid #ECEAE6", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 12, color: "#8C7E6A", fontWeight: 600 }}>Running sensitivity analysis...</p>
          <p style={{ fontSize: 10, color: "#B5A99A", marginTop: 3 }}>Testing each workgroup with a +3d delay</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>🎯</div>
          <p style={{ fontSize: 13, color: "#8C7E6A", fontWeight: 600 }}>No sensitivity data yet</p>
          <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 4, maxWidth: 240 }}>Run sensitivity analysis to discover which workgroups are most dangerous to delay.</p>
          <button onClick={onRefresh} style={{ marginTop: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7C3AED,#9F7AEA)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Run Analysis</button>
        </div>
      </div>
    );
  }

  const { entries, site_sensitivities, ai_bullets, summary, computed_at, test_delay_days } = report;
  const computedTime = new Date(computed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px" }}>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
        {([
          { v: report.critical_count, l: "Critical", c: SENSITIVITY_COLORS.critical },
          { v: report.high_count, l: "High", c: SENSITIVITY_COLORS.high },
          { v: report.moderate_count, l: "Moderate", c: SENSITIVITY_COLORS.moderate },
          { v: report.resilient_count, l: "Resilient", c: SENSITIVITY_COLORS.resilient },
        ] as const).map(it => (
          <div key={it.l} style={{ padding: "8px 4px", borderRadius: 8, textAlign: "center", background: it.c.bg, border: `1px solid ${it.c.ring}` }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: it.c.fg }}>{it.v}</p>
            <p style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: it.c.fg, opacity: 0.7 }}>{it.l}</p>
          </div>
        ))}
      </div>

      {/* AI bullets */}
      {ai_bullets.length > 0 && (
        <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8" }}>
          {ai_bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0", alignItems: "flex-start" }}>
              <SparkI size={11} color="#8C7E6A" />
              <p style={{ fontSize: 11, color: "#5C5043", lineHeight: 1.4 }}>{b}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-site sensitivity */}
      {site_sensitivities.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <MapPinI size={11} color="#8C7E6A" />Site Risk
          </div>
          {site_sensitivities.map(site => {
            const riskPct = Math.min(site.max_coefficient * 100, 100);
            return (
              <div key={site.worksite_id} style={{ padding: "7px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8", marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3D3529" }}>{site.worksite_name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: site.critical_count > 0 ? "#D44A2E" : site.high_count > 0 ? "#C07B1A" : "#2E7D5F" }}>
                    {site.critical_count > 0 ? `${site.critical_count} critical` : site.high_count > 0 ? `${site.high_count} high` : "Low risk"}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "#F0EDE8", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${riskPct}%`, borderRadius: 3, background: riskPct > 80 ? P.crit.grad : riskPct > 40 ? P.pending.grad : P.done.grad, transition: "width .4s" }} />
                </div>
                <div style={{ fontSize: 9, color: "#8C7E6A", marginTop: 2 }}>
                  {site.workgroup_count} WGs · avg sensitivity {Math.round(site.avg_coefficient * 100)}% · peak {Math.round(site.max_coefficient * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workgroup ranking */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Workgroup Sensitivity ({entries.length})
        </div>
        {entries.map((entry, i) => {
          const sc = SENSITIVITY_COLORS[entry.sensitivity_level] || SENSITIVITY_COLORS.moderate;
          const coeffPct = Math.round(entry.sensitivity_coefficient * 100);
          const ti = TI[entry.trade] || DEFAULT_TRADE;
          const TradeIcon = ti.Icon;
          return (
            <div key={entry.workgroup_id}
              onClick={() => onSimulateWg(entry.workgroup_id)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = sc.fg; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = sc.ring; }}
              style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: sc.bg, border: `1px solid ${sc.ring}`, marginBottom: 4, cursor: "pointer", transition: "border-color .15s", animation: `fu .25s ${i * 25}ms both` }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0, marginTop: 1 }}>
                <TradeIcon size={10} color={ti.c} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.worksite_name && <span style={{ opacity: 0.7, fontWeight: 500 }}>{entry.worksite_name} → </span>}
                    {entry.title}
                  </span>
                  <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: sc.fg, padding: "1px 5px", borderRadius: 3, flexShrink: 0, marginLeft: 4 }}>{sc.label.toUpperCase()}</span>
                </div>
                {/* Sensitivity bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: `${sc.fg}15`, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${coeffPct}%`, borderRadius: 3, background: sc.fg, transition: "width .4s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: sc.fg, fontFamily: "'JetBrains Mono', monospace", minWidth: 28, textAlign: "right" }}>{coeffPct}%</span>
                </div>
                <div style={{ fontSize: 9, color: "#8C7E6A", marginTop: 3 }}>
                  +{entry.test_delay_days}d → +{entry.project_delay_days}d project
                  {entry.float_days > 0 && <span> · {entry.float_days}d buffer</span>}
                  {entry.downstream_count > 0 && <span> · {entry.downstream_count} downstream</span>}
                  {entry.is_on_critical_path && <span style={{ color: "#D44A2E", fontWeight: 600 }}> · Critical path</span>}
                  {entry.is_bottleneck && <span style={{ color: "#7C3AED", fontWeight: 600 }}> · Bottleneck</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Computed timestamp + refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
        <span style={{ fontSize: 9, color: "#B5A99A" }}>Computed {computedTime} · +{test_delay_days}d test</span>
        <button onClick={onRefresh} style={{ padding: "3px 10px", borderRadius: 5, border: "1px solid #ECEAE6", background: "#fff", fontSize: 9, fontWeight: 700, color: "#7C3AED", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>↻ Refresh</button>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN PANEL ═══════════════════ */

export function ScenarioPanel({ g, workgroupIds, onClose, onShiftsChanged, initialMode = "manual" }: ScenarioPanelProps) {
  const [mode, setMode] = useState<PanelMode>(initialMode);

  // ── Manual mode state ──
  const [entries, setEntries] = useState<DelayEntry[]>(() => workgroupIds.map(id => ({ workgroupId: id, delayDays: 5 })));
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sensitivity mode state ──
  const [sensitivityReport, setSensitivityReport] = useState<SensitivityReport | null>(null);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);

  // ── Lookups ──
  const wgSiteMap = useMemo(() => {
    const m = new Map<string, string>();
    g.worksites.forEach(ws => ws.workgroups.forEach(wg => m.set(wg.id, ws.shortName)));
    return m;
  }, [g.worksites]);

  const activeEntries = entries.filter(e => e.delayDays > 0);
  const totalDelayInputDays = activeEntries.reduce((s, e) => s + e.delayDays, 0);
  const sourceIds = new Set(entries.map(e => e.workgroupId));

  // ── Manual: simulation runner ──
  const runSimulation = useCallback(async (currentEntries: DelayEntry[]) => {
    const delays = currentEntries.filter(e => e.delayDays > 0);
    if (!g.graph || delays.length === 0) { setResult(null); if (onShiftsChanged) onShiftsChanged([]); return; }
    setManualLoading(true); setManualError(null);
    try {
      const scenarioName = delays.map(d => { const wg = g.allWg.find(w => w.id === d.workgroupId); return `${wg?.title || "WG"} +${d.delayDays}d`; }).join(" + ");
      const response = await ganttService.runScenarios({
        project_id: g.projectId,
        scenarios: [{ name: scenarioName, delays: delays.map(d => ({ entity_id: d.workgroupId, entity_type: "workgroup" as const, delay_days: d.delayDays })) }],
        graph: g.graph,
      });
      if (response.scenarios?.length > 0) {
        const r = response.scenarios[0]; setResult(r); setSummaryText(response.summary || null);
        if (onShiftsChanged) {
          const shifts: SimulationShift[] = [...delays.map(d => ({ entityId: d.workgroupId, shiftDays: d.delayDays })), ...(r.shifts || []).filter(s => !delays.find(d => d.workgroupId === s.entity_id)).map(s => ({ entityId: s.entity_id, shiftDays: s.shift_days }))];
          onShiftsChanged(shifts);
        }
      }
    } catch (err: any) { setManualError(err?.message || "Simulation failed"); } finally { setManualLoading(false); }
  }, [g.projectId, g.graph, g.allWg, onShiftsChanged]);

  const scheduleRun = useCallback((newEntries: DelayEntry[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulation(newEntries), 250);
  }, [runSimulation]);

  useEffect(() => { if (mode === "manual") runSimulation(entries); }, []); // eslint-disable-line
  useEffect(() => { return () => { if (onShiftsChanged) onShiftsChanged([]); }; }, [onShiftsChanged]);

  // ── Sensitivity: fetch/refresh ──
  const fetchSensitivity = useCallback(async (force = false) => {
    setSensitivityLoading(true);
    try {
      const data = force
        ? await ganttService.refreshSensitivity(g.projectId)
        : await ganttService.getSensitivity(g.projectId);
      setSensitivityReport(data);
    } catch (err) {
      console.error("Sensitivity fetch failed:", err);
    } finally {
      setSensitivityLoading(false);
    }
  }, [g.projectId]);

  useEffect(() => { if (mode === "sensitivity" && !sensitivityReport && !sensitivityLoading) fetchSensitivity(); }, [mode]); // eslint-disable-line

  // ── Entry mutations ──
  const updateDelay = (wgId: string, days: number) => { const u = entries.map(e => e.workgroupId === wgId ? { ...e, delayDays: days } : e); setEntries(u); scheduleRun(u); };
  const addWorkgroup = (wgId: string) => { const u = [...entries, { workgroupId: wgId, delayDays: 5 }]; setEntries(u); setShowAddDropdown(false); scheduleRun(u); };
  const removeWorkgroup = (wgId: string) => { const u = entries.filter(e => e.workgroupId !== wgId); setEntries(u); scheduleRun(u); };
  const resetAll = () => { const u = entries.map(e => ({ ...e, delayDays: 0 })); setEntries(u); setResult(null); if (onShiftsChanged) onShiftsChanged([]); };

  // Switch from sensitivity → manual with a specific WG pre-loaded
  const switchToSimulate = (wgId: string) => {
    setEntries([{ workgroupId: wgId, delayDays: 5 }]);
    setMode("manual");
    setTimeout(() => runSimulation([{ workgroupId: wgId, delayDays: 5 }]), 100);
  };

  // ── Manual: computed results ──
  const projectImpact = result?.delta_days ?? 0;
  const critPathChanged = (result?.critical_path?.length ?? 0) > 0 || projectImpact > 0;
  const shifted = result?.shifts?.filter(s => s.shift_days > 0 && !sourceIds.has(s.entity_id)) || [];
  const plannedEnd = g.projectEndDate;
  const projectedEnd = plannedEnd && projectImpact > 0 ? addDays(plannedEnd, projectImpact) : plannedEnd;
  const allAffectedIds = new Set([...entries.map(e => e.workgroupId), ...shifted.map(s => s.entity_id)]);
  const affectedBudget = g.allWg.filter(w => allAffectedIds.has(w.id)).reduce((sum, w) => sum + (w.budget || 0), 0);
  const downstreamDetails = shifted.map(s => {
    const aw = g.allWg.find(w => w.id === s.entity_id);
    return { ...s, wg: aw, siteName: wgSiteMap.get(s.entity_id) || "", budget: aw?.budget || 0, plannedEnd: aw?.endDate || null, projectedEnd: aw?.endDate ? addDays(aw.endDate, s.shift_days) : null };
  });

  // Per-site impact breakdown for manual results
  const siteImpacts = useMemo(() => {
    if (!result || activeEntries.length === 0) return [];
    const siteMap = new Map<string, { name: string; wgIds: Set<string>; maxShift: number }>();
    g.worksites.forEach(ws => {
      siteMap.set(ws.id, { name: ws.shortName, wgIds: new Set(ws.workgroups.map(w => w.id)), maxShift: 0 });
    });
    // Source WG shifts
    activeEntries.forEach(e => {
      siteMap.forEach(site => { if (site.wgIds.has(e.workgroupId)) site.maxShift = Math.max(site.maxShift, e.delayDays); });
    });
    // Downstream shifts
    shifted.forEach(s => {
      siteMap.forEach(site => { if (site.wgIds.has(s.entity_id)) site.maxShift = Math.max(site.maxShift, s.shift_days); });
    });
    return Array.from(siteMap.entries())
      .map(([id, s]) => ({ id, name: s.name, maxShift: s.maxShift }))
      .filter(s => s.maxShift > 0);
  }, [result, activeEntries, shifted, g.worksites]);

  return (
    <div style={{ width: 460, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, background: "#fff", borderLeft: "1.5px solid #ECEAE6", animation: "drawerIn .25s cubic-bezier(.22,1,.36,1) both" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "10px 16px", borderBottom: "1.5px solid #ECEAE6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(124,58,237,0.06),rgba(124,58,237,0.02))" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {mode === "manual" ? "What-If Simulation" : "Sensitivity Analysis"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1814", marginTop: 2 }}>
            {mode === "manual" ? (
              <>{entries.length} source{entries.length > 1 ? "s" : ""}{activeEntries.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#8C7E6A", marginLeft: 6 }}>· {totalDelayInputDays}d combined</span>}</>
            ) : (
              <>Schedule Risk Map</>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {mode === "manual" && activeEntries.length > 0 && <button onClick={resetAll} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ECEAE6", background: "#fff", fontSize: 10, fontWeight: 700, color: "#8C7E6A", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Reset</button>}
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: "1px solid #ECEAE6", background: "#fff", cursor: "pointer" }}><XI size={14} color="#8C7E6A" /></button>
        </div>
      </div>

      {/* ═══ MODE TOGGLE ═══ */}
      <div style={{ display: "flex", padding: "6px 16px", gap: 4, borderBottom: "1px solid #F0EDE8" }}>
        {([
          { key: "manual" as PanelMode, label: "Simulate", icon: "⏱" },
          { key: "sensitivity" as PanelMode, label: "Sensitivity", icon: "🎯" },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setMode(tab.key)}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: mode === tab.key ? "1.5px solid rgba(124,58,237,0.3)" : "1.5px solid transparent", background: mode === tab.key ? "rgba(124,58,237,0.06)" : "transparent", fontSize: 11, fontWeight: mode === tab.key ? 800 : 600, color: mode === tab.key ? "#7C3AED" : "#8C7E6A", cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all .15s" }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ SENSITIVITY MODE ═══ */}
      {mode === "sensitivity" && (
        <SensitivityView g={g} report={sensitivityReport} loading={sensitivityLoading} onRefresh={() => fetchSensitivity(true)} onSimulateWg={switchToSimulate} />
      )}

      {/* ═══ MANUAL MODE ═══ */}
      {mode === "manual" && (
        <>
          {/* Delay sources */}
          <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid #F0EDE8", maxHeight: entries.length > 3 ? 340 : "none", overflowY: entries.length > 3 ? "auto" : "visible" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em" }}>Delay Sources</span>
              <button onClick={() => setShowAddDropdown(!showAddDropdown)} style={{ padding: "3px 10px", borderRadius: 5, border: "1.5px solid rgba(124,58,237,0.3)", background: showAddDropdown ? "rgba(124,58,237,0.08)" : "transparent", fontSize: 10, fontWeight: 700, color: "#7C3AED", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{showAddDropdown ? "Cancel" : "+ Add Workgroup"}</button>
            </div>
            {showAddDropdown && <WgSearchDropdown allWg={g.allWg} excludeIds={sourceIds} worksites={g.worksites} onSelect={addWorkgroup} onCancel={() => setShowAddDropdown(false)} />}
            {entries.map(entry => { const wg = g.allWg.find(w => w.id === entry.workgroupId); if (!wg) return null; return <DelayCard key={entry.workgroupId} wg={wg} siteName={wgSiteMap.get(entry.workgroupId) || ""} delayDays={entry.delayDays} onDelayChange={days => updateDelay(entry.workgroupId, days)} onRemove={() => removeWorkgroup(entry.workgroupId)} canRemove={entries.length > 1} />; })}
          </div>

          {/* Loading / error */}
          {manualLoading && <div style={{ padding: "6px 16px", display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, border: "2px solid #ECEAE6", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ fontSize: 11, color: "#8C7E6A" }}>Computing combined impact...</span></div>}
          {manualError && <div style={{ margin: "6px 16px", padding: "5px 10px", borderRadius: 8, background: P.crit.bg, fontSize: 11, color: P.crit.fg }}>{manualError}</div>}

          {/* Results */}
          {activeEntries.length > 0 && result && (
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px" }}>

              {/* Combined project impact */}
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: projectImpact > 0 ? "#FEF0ED" : "#EDFAF4", border: `1px solid ${projectImpact > 0 ? "#F5C5BA" : "#B5E2CC"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#1A1814" }}>Combined Project Impact</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: projectImpact > 0 ? "#D44A2E" : "#2E7D5F", fontFamily: "'JetBrains Mono', monospace" }}>{projectImpact > 0 ? `+${projectImpact}d` : "No delay"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 4, alignItems: "center" }}>
                  <div><div style={SL}>Planned end</div><div style={{ fontSize: 14, fontWeight: 800, color: "#3D3529" }}>{fD(plannedEnd)}</div><div style={{ fontSize: 10, color: "#8C7E6A" }}>{result.original_duration_days}d total</div></div>
                  <div style={{ fontSize: 18, color: "#B5A99A" }}>→</div>
                  <div style={{ textAlign: "right" }}><div style={SL}>Projected end</div><div style={{ fontSize: 14, fontWeight: 800, color: projectImpact > 0 ? "#D44A2E" : "#2E7D5F" }}>{fD(projectedEnd)}</div><div style={{ fontSize: 10, color: projectImpact > 0 ? "#D44A2E" : "#8C7E6A" }}>{result.projected_duration_days}d total</div></div>
                </div>
                {activeEntries.length > 1 && <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${projectImpact > 0 ? "rgba(212,74,46,0.15)" : "rgba(46,125,95,0.15)"}`, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {activeEntries.map(e => { const wg = g.allWg.find(w => w.id === e.workgroupId); return <span key={e.workgroupId} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 4, background: "rgba(124,58,237,0.08)", fontSize: 9, fontWeight: 700, color: "#7C3AED" }}>{wg?.title || "WG"} <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{e.delayDays}d</span></span>; })}
                </div>}
              </div>

              {/* Per-site impact breakdown */}
              {siteImpacts.length > 1 && (
                <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <MapPinI size={10} color="#8C7E6A" />Impact by Site
                  </div>
                  {siteImpacts.map(site => (
                    <div key={site.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#3D3529" }}>{site.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: site.maxShift > 0 ? "#D44A2E" : "#2E7D5F", fontFamily: "'JetBrains Mono', monospace" }}>
                        {site.maxShift > 0 ? `+${site.maxShift}d` : "No impact"}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 9, color: "#8C7E6A", marginTop: 3, fontStyle: "italic" }}>
                    Project completes when all sites finish. Delay in one site may not affect others but extends overall project end.
                  </div>
                </div>
              )}

              {/* Cash flow */}
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#FFF8EE", border: "1px solid #F0D9A8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5C3D20", display: "flex", alignItems: "center", gap: 5 }}><DollarI size={13} color="#C07B1A" />Cash Flow Impact</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#C07B1A", fontFamily: "'JetBrains Mono', monospace" }}>{fmtFull(affectedBudget)}</span>
                </div>
                <p style={{ fontSize: 11, color: "#8C7E6A" }}>Payments for {allAffectedIds.size} workgroup{allAffectedIds.size > 1 ? "s" : ""} ({fmtFull(affectedBudget)}) shift {projectImpact > 0 ? `${projectImpact} days later` : "within buffer"}.{projectImpact > 0 && " Project close-out and final payments delayed."}</p>
              </div>

              {/* Affected WGs */}
              {(downstreamDetails.length > 0 || activeEntries.length > 0) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>All Affected ({activeEntries.length + downstreamDetails.length})</div>
                  {activeEntries.map(entry => { const wg = g.allWg.find(w => w.id === entry.workgroupId); if (!wg) return null; const siteName = wgSiteMap.get(entry.workgroupId) || ""; const simEnd = wg.endDate ? addDays(wg.endDate, entry.delayDays) : null; return (
                    <div key={entry.workgroupId} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)", marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>{siteName && <span style={{ opacity: 0.7 }}>{siteName} → </span>}{wg.title}<span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: "#7C3AED", padding: "1px 4px", borderRadius: 3, marginLeft: 5, verticalAlign: "middle" }}>SOURCE</span></span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#7C3AED", fontFamily: "'JetBrains Mono', monospace" }}>+{entry.delayDays}d</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "#8C7E6A" }}><span>Planned: <b style={{ color: "#3D3529" }}>{fD(wg.endDate)}</b></span><span>Projected: <b style={{ color: "#D44A2E" }}>{fD(simEnd)}</b></span></div>
                    </div>); })}
                  {downstreamDetails.map(ad => (
                    <div key={ad.entity_id} style={{ padding: "8px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8", marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3529" }}>{ad.siteName && <span style={{ color: "#8C7E6A", fontWeight: 500 }}>{ad.siteName} → </span>}{ad.title}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: "#D44A2E", fontFamily: "'JetBrains Mono', monospace" }}>+{ad.shift_days}d</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "#8C7E6A" }}><span>Planned: <b style={{ color: "#3D3529" }}>{fD(ad.plannedEnd)}</b> · {fmt(ad.budget)}</span><span>Projected: <b style={{ color: "#D44A2E" }}>{fD(ad.projectedEnd)}</b></span></div>
                    </div>))}
                </div>
              )}

              {critPathChanged && <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 8, background: "#FEF0ED", border: "1px solid #F5C5BA", display: "flex", alignItems: "center", gap: 6 }}><AlertCI size={13} color="#D44A2E" /><span style={{ fontSize: 11, fontWeight: 700, color: "#D44A2E" }}>{entries.length > 1 ? "These combined delays change the critical path" : "This delay changes the critical path"}</span></div>}
              {summaryText && <div style={{ padding: "7px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8" }}><p style={{ fontSize: 11, color: "#5C5043", fontStyle: "italic", lineHeight: 1.4 }}>{summaryText}</p></div>}
            </div>
          )}

          {activeEntries.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>⏱</div>
                <p style={{ fontSize: 13, color: "#8C7E6A", fontWeight: 600 }}>Drag sliders to simulate delays</p>
                <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 4, maxWidth: 240 }}>Add multiple workgroups and see how their combined delays impact the project timeline, budget, and downstream work</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
