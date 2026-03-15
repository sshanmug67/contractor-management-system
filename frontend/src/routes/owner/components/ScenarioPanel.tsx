/**
 * ScenarioPanel v2 — Business-Focused What-If Simulator
 *
 * Designed around what the business owner needs to decide:
 *   1. How many days is the project delayed? What are the new dates?
 *   2. What's the cash flow impact on affected workgroups?
 *   3. Which workgroups are affected? When will they finish vs plan?
 *   4. Gantt chart reflects the delay visually (ghost bars via onShiftsChanged)
 *
 * File: routes/owner/components/ScenarioPanel.tsx
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { P, AlertCI, XI, DollarI, fmt, fmtFull, fmtDate, type IP } from "./projectConstants";
import ganttService from "@/services/ganttService";
import type { UIGanttData } from "@/hooks/ganttBridge";
import type { ScenarioResult } from "@/types/gantt";

export interface SimulationShift {
  entityId: string;
  shiftDays: number;
}

interface ScenarioPanelProps {
  g: UIGanttData;
  workgroupId: string;
  onClose: () => void;
  onShiftsChanged?: (shifts: SimulationShift[]) => void;
}

export function ScenarioPanel({ g, workgroupId, onClose, onShiftsChanged }: ScenarioPanelProps) {
  const [delayDays, setDelayDays] = useState(5);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wg = g.allWg.find(w => w.id === workgroupId);
  const siteName = (() => { for (const ws of g.worksites) { if (ws.workgroups.find(w => w.id === workgroupId)) return ws.shortName; } return ""; })();

  const addDays = (dateStr: string | null, days: number): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const fD = (d: string | null) => d ? fmtDate(d) : "—";

  const runSimulation = useCallback(async (days: number) => {
    if (!g.graph || days === 0) {
      setResult(null);
      if (onShiftsChanged) onShiftsChanged([]);
      return;
    }
    setLoading(true); setError(null);
    try {
      const response = await ganttService.runScenarios({
        project_id: g.projectId,
        scenarios: [{ name: `${wg?.title || 'WG'} +${days}d`, delays: [{ entity_id: workgroupId, entity_type: "workgroup" as const, delay_days: days }] }],
        graph: g.graph,
      });
      if (response.scenarios?.length > 0) {
        const r = response.scenarios[0];
        setResult(r); setSummaryText(response.summary || null);
        if (onShiftsChanged) onShiftsChanged([{ entityId: workgroupId, shiftDays: days }, ...(r.shifts || []).map(s => ({ entityId: s.entity_id, shiftDays: s.shift_days }))]);
      }
    } catch (err: any) { setError(err?.message || "Simulation failed"); } finally { setLoading(false); }
  }, [g.projectId, g.graph, workgroupId, wg?.title, onShiftsChanged]);

  const onSliderChange = useCallback((value: number) => {
    setDelayDays(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulation(value), 200);
  }, [runSimulation]);

  useEffect(() => { runSimulation(delayDays); }, []);  // eslint-disable-line
  useEffect(() => { return () => { if (onShiftsChanged) onShiftsChanged([]); }; }, [onShiftsChanged]);

  if (!wg) return null;

  const floatDays = wg.floatDays || 0;
  const absorbed = Math.min(floatDays, delayDays);
  const spillover = Math.max(0, delayDays - floatDays);
  const projectImpact = result?.delta_days ?? 0;
  const critPathChanged = (result?.critical_path?.length ?? 0) > 0 || projectImpact > 0;
  const shifted = result?.shifts?.filter(s => s.shift_days > 0 && s.entity_id !== workgroupId) || [];
  const maxSlider = 30;

  const plannedEnd = g.projectEndDate;
  // Projected end = planned end + delay impact (delta_days is the actual project slip)
  const projectedEnd = plannedEnd && projectImpact > 0 ? addDays(plannedEnd, projectImpact) : plannedEnd;

  const affectedWgIds = new Set([workgroupId, ...(shifted.map(s => s.entity_id))]);
  const affectedBudget = g.allWg.filter(w => affectedWgIds.has(w.id)).reduce((sum, w) => sum + (w.budget || 0), 0);

  const affectedDetails = shifted.map(s => {
    const aw = g.allWg.find(w => w.id === s.entity_id);
    const awSite = (() => { for (const ws of g.worksites) { if (ws.workgroups.find(w => w.id === s.entity_id)) return ws.shortName; } return ""; })();
    return { ...s, wg: aw, siteName: awSite, budget: aw?.budget || 0, plannedEnd: aw?.endDate || null, projectedEnd: aw?.endDate ? addDays(aw.endDate, s.shift_days) : null };
  });

  const simWgProjectedEnd = wg.endDate ? addDays(wg.endDate, delayDays) : null;
  const SL = { fontSize: 10, fontWeight: 700 as const, color: "#8C7E6A", textTransform: "uppercase" as const, letterSpacing: "0.06em" };

  return (
    <div style={{ width: 450, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, background: "#fff", borderLeft: "1.5px solid #ECEAE6", animation: "drawerIn .25s cubic-bezier(.22,1,.36,1) both" }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: "1.5px solid #ECEAE6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(124,58,237,0.06),rgba(124,58,237,0.02))" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em" }}>What-If Simulation</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1814", marginTop: 1 }}>
            {siteName && <span style={{ fontWeight: 600, color: "#8C7E6A" }}>{siteName} → </span>}{wg.title}
          </div>
          <div style={{ fontSize: 11, color: "#8C7E6A", marginTop: 1 }}>{wg.contractor} · {fmt(wg.budget)} · {floatDays > 0 ? `${floatDays}d float` : "No float (critical)"}</div>
        </div>
        <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: "1px solid #ECEAE6", background: "#fff", cursor: "pointer" }}><XI size={14} color="#8C7E6A" /></button>
      </div>

      {/* Slider + presets */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #F0EDE8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5C5043" }}>Simulate delay</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: delayDays > floatDays ? "#D44A2E" : delayDays > 0 ? "#7C3AED" : "#8C7E6A", fontFamily: "'JetBrains Mono', monospace" }}>{delayDays}d</span>
        </div>
        <input type="range" min={0} max={maxSlider} value={delayDays} onChange={(e) => onSliderChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: delayDays > floatDays ? "#D44A2E" : "#7C3AED", cursor: "pointer", height: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 9, color: "#B5A99A" }}>0</span>
          {floatDays > 0 && floatDays < maxSlider && <span style={{ fontSize: 9, color: "#2D6DB5", fontWeight: 700 }}>↑ buffer {floatDays}d</span>}
          <span style={{ fontSize: 9, color: "#B5A99A" }}>{maxSlider}</span>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
          {[3, 7, 14, 21].map(d => (
            <button key={d} onClick={() => onSliderChange(d)} style={{
              padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif",
              border: delayDays === d ? "1.5px solid #7C3AED" : "1.5px solid #ECEAE6",
              background: delayDays === d ? "rgba(124,58,237,0.08)" : "#fff", color: delayDays === d ? "#7C3AED" : "#8C7E6A",
            }}>+{d}d</button>
          ))}
          {floatDays > 0 && <button onClick={() => onSliderChange(floatDays + 1)} style={{
            padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif",
            border: "1.5px solid #D44A2E40", background: "#FEF0ED", color: "#D44A2E",
          }}>Buffer+1 ({floatDays + 1}d)</button>}
        </div>
      </div>

      {loading && <div style={{ padding: "6px 16px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 12, height: 12, border: "2px solid #ECEAE6", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 11, color: "#8C7E6A" }}>Computing...</span>
      </div>}
      {error && <div style={{ margin: "6px 16px", padding: "5px 10px", borderRadius: 8, background: P.crit.bg, fontSize: 11, color: P.crit.fg }}>{error}</div>}

      {/* ═══ RESULTS ═══ */}
      {delayDays > 0 && result && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px" }}>

          {/* 1. PROJECT TIMELINE */}
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: projectImpact > 0 ? "#FEF0ED" : "#EDFAF4", border: `1px solid ${projectImpact > 0 ? "#F5C5BA" : "#B5E2CC"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#1A1814" }}>Project Timeline</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: projectImpact > 0 ? "#D44A2E" : "#2E7D5F", fontFamily: "'JetBrains Mono', monospace" }}>
                {projectImpact > 0 ? `+${projectImpact}d` : "No delay"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 4, alignItems: "center" }}>
              <div>
                <div style={SL}>Planned end</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#3D3529" }}>{fD(plannedEnd)}</div>
                <div style={{ fontSize: 10, color: "#8C7E6A" }}>{result.original_duration_days}d total</div>
              </div>
              <div style={{ fontSize: 18, color: "#B5A99A" }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={SL}>Projected end</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: projectImpact > 0 ? "#D44A2E" : "#2E7D5F" }}>{fD(projectedEnd)}</div>
                <div style={{ fontSize: 10, color: projectImpact > 0 ? "#D44A2E" : "#8C7E6A" }}>{result.projected_duration_days}d total</div>
              </div>
            </div>
          </div>

          {/* 2. CASH FLOW IMPACT */}
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#FFF8EE", border: "1px solid #F0D9A8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#5C3D20", display: "flex", alignItems: "center", gap: 5 }}>
                <DollarI size={13} color="#C07B1A" />Cash Flow Impact
              </span>
              <span style={{ fontSize: 15, fontWeight: 900, color: "#C07B1A", fontFamily: "'JetBrains Mono', monospace" }}>{fmtFull(affectedBudget)}</span>
            </div>
            <p style={{ fontSize: 11, color: "#8C7E6A" }}>
              Payments for {affectedWgIds.size} workgroup{affectedWgIds.size > 1 ? "s" : ""} ({fmtFull(affectedBudget)}) shift{" "}
              {projectImpact > 0 ? `${projectImpact} days later` : "within buffer"}.
              {projectImpact > 0 && " Project close-out and final payments delayed."}
            </p>
          </div>

          {/* 3. AFFECTED WORKGROUPS */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Affected Workgroups ({affectedDetails.length + 1})
            </div>

            {/* The delayed WG */}
            <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)", marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>
                  {siteName && <span style={{ opacity: 0.7 }}>{siteName} → </span>}{wg.title}
                  <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: "#7C3AED", padding: "1px 4px", borderRadius: 3, marginLeft: 5, verticalAlign: "middle" }}>SOURCE</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#7C3AED", fontFamily: "'JetBrains Mono', monospace" }}>+{delayDays}d</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "#8C7E6A" }}>
                <span>Planned: <b style={{ color: "#3D3529" }}>{fD(wg.endDate)}</b></span>
                <span>Projected: <b style={{ color: "#D44A2E" }}>{fD(simWgProjectedEnd)}</b></span>
              </div>
            </div>

            {/* Downstream */}
            {affectedDetails.map(ad => (
              <div key={ad.entity_id} style={{ padding: "8px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8", marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3529" }}>
                    {ad.siteName && <span style={{ color: "#8C7E6A", fontWeight: 500 }}>{ad.siteName} → </span>}{ad.title}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#D44A2E", fontFamily: "'JetBrains Mono', monospace" }}>+{ad.shift_days}d</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "#8C7E6A" }}>
                  <span>Planned: <b style={{ color: "#3D3529" }}>{fD(ad.plannedEnd)}</b> · {fmt(ad.budget)}</span>
                  <span>Projected: <b style={{ color: "#D44A2E" }}>{fD(ad.projectedEnd)}</b></span>
                </div>
              </div>
            ))}
          </div>

          {/* 4. FLOAT ABSORPTION */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1A1814", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Float Buffer</div>
            <div style={{ display: "flex", height: 16, borderRadius: 5, overflow: "hidden", background: "#F0EDE8" }}>
              {absorbed > 0 && <div style={{ width: `${(absorbed / delayDays) * 100}%`, height: "100%", background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", transition: "width .3s" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>{absorbed}d safe</span>
              </div>}
              {spillover > 0 && <div style={{ width: `${(spillover / delayDays) * 100}%`, height: "100%", background: P.crit.grad, display: "flex", alignItems: "center", justifyContent: "center", transition: "width .3s" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>{spillover}d spills</span>
              </div>}
            </div>
            <div style={{ fontSize: 10, color: "#8C7E6A", marginTop: 2 }}>
              {floatDays > 0 ? `${absorbed} of ${delayDays} days absorbed by ${floatDays}d buffer. ` : "No buffer — "}
              {spillover > 0 ? `${spillover} day${spillover > 1 ? 's' : ''} push the project end date.` : "Project end unchanged."}
            </div>
          </div>

          {/* 5. CRITICAL PATH ALERT */}
          {critPathChanged && <div style={{ marginBottom: 12, padding: "7px 10px", borderRadius: 8, background: "#FEF0ED", border: "1px solid #F5C5BA", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCI size={13} color="#D44A2E" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#D44A2E" }}>This delay changes the critical path</span>
          </div>}

          {/* 6. SUMMARY */}
          {summaryText && <div style={{ padding: "7px 10px", borderRadius: 8, background: "#FAF9F6", border: "1px solid #F0EDE8" }}>
            <p style={{ fontSize: 11, color: "#5C5043", fontStyle: "italic", lineHeight: 1.4 }}>{summaryText}</p>
          </div>}
        </div>
      )}

      {delayDays === 0 && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#8C7E6A", fontWeight: 600 }}>Drag the slider to simulate a delay</p>
          <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 4 }}>See how it impacts timeline, budget, and downstream work</p>
        </div>
      </div>}
    </div>
  );
}
