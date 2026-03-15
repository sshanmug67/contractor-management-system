/**
 * GanttView — Enhanced Timeline Chart
 *
 * Consumes UIGanttData from /api/dependencies/gantt/{projectId}.
 * All DAG intelligence rendered: critical path, float, bottlenecks,
 * dep-drag editing with preview/apply flow.
 *
 * File: routes/owner/components/GanttView.tsx
 */

import { useState, useEffect, useRef } from "react";
import { P, SC, SM, TI, DEFAULT_TRADE, Badge, CheckI, MapPinI, fmt, type IP } from "./projectConstants";
import type { UIGanttData, UIGanttWorkgroup, UIGanttJob } from "@/hooks/ganttBridge";
import type { ChangeEdge, PreviewResponse } from "@/types/gantt";

const LEFT_W = 290;
const ROW_H = 42;
const JOB_ROW_H = 34;
const SITE_ROW_H = 36;

interface GanttViewProps {
  g: UIGanttData;
  previewChanges: (changes: ChangeEdge[]) => Promise<PreviewResponse | null>;
  applyChanges: (changes: ChangeEdge[]) => Promise<boolean>;
}

export function GanttView({ g, previewChanges, applyChanges }: GanttViewProps) {
  const [exp, setExp] = useState<Set<string>>(new Set(g.worksites[0]?.workgroups.slice(0, 2).map(w => w.id) || []));
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; sub?: string; budget?: string; paid?: string; invoiced?: string; progress?: string; floatInfo?: string; critical?: boolean; bottleneck?: string; msg?: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rightW, setRightW] = useState(0);

  // Dep drag-and-drop
  const [depDrag, setDepDrag] = useState<{ fromJobId: string; fromX: number; fromY: number; curX: number; curY: number } | null>(null);
  const [pendingDeps, setPendingDeps] = useState<ChangeEdge[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  // Critical path set for fast lookup
  const criticalPathSet = new Set(g.analysis?.criticalPath || []);
  // WG status lookup (needed for critical arrow check)
  const wgStatusMap = new Map<string, string>();
  g.worksites.forEach(ws => ws.workgroups.forEach(wg => wgStatusMap.set(wg.id, wg.status)));

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setRightW(el.clientWidth - LEFT_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Dynamic date range ── */
  const allDates: number[] = [];
  g.worksites.forEach(ws => ws.workgroups.forEach(wg => {
    if (wg.startDate) allDates.push(new Date(wg.startDate).getTime());
    if (wg.endDate) allDates.push(new Date(wg.endDate).getTime());
    if (wg.endDate && wg.floatDays > 0) allDates.push(new Date(wg.endDate).getTime() + wg.floatDays * 864e5);
  }));
  if (g.projectStartDate) allDates.push(new Date(g.projectStartDate).getTime());
  if (g.projectEndDate) allDates.push(new Date(g.projectEndDate).getTime());
  allDates.push(Date.now());
  const minDate = Math.min(...allDates), maxDate = Math.max(...allDates);
  const padMs = 15 * 864e5;
  const rangeStart = new Date(minDate - padMs); rangeStart.setDate(1);
  const rangeEnd = new Date(maxDate + padMs); rangeEnd.setMonth(rangeEnd.getMonth() + 1, 1);
  const tS = rangeStart.getTime(), tE = rangeEnd.getTime(), tR = tE - tS;
  const d2p = (dt: string | Date): number => { const t = typeof dt === "string" ? new Date(dt).getTime() : dt.getTime(); return Math.max(0, Math.min(100, ((t - tS) / tR) * 100)); };

  const months: { label: string; left: number; width: number }[] = [];
  const cur = new Date(rangeStart);
  while (cur.getTime() < tE) {
    const mStart = cur.getTime();
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const mEnd = Math.min(next.getTime(), tE);
    months.push({ label: cur.toLocaleDateString("en-US", { month: "short", year: "numeric" }), left: ((mStart - tS) / tR) * 100, width: ((mEnd - mStart) / tR) * 100 });
    cur.setMonth(cur.getMonth() + 1);
  }
  const todayPct = d2p(new Date());
  const toggleExp = (id: string) => { setExp(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const fmtD = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ── Pre-compute bar positions + float bars ──
  interface BarPos { left: number; right: number; yCenterPx: number; }
  const wgBarPos = new Map<string, BarPos>();
  const jobBarPos = new Map<string, BarPos>();
  const jobToWgId = new Map<string, string>();
  interface JobDepEdge { fromJobId: string; toJobId: string; }
  const jobDepEdges: JobDepEdge[] = [];
  const floatBars: { wgId: string; endPct: number; floatEndPct: number; y: number; floatDays: number }[] = [];
  const floatEndPctMap = new Map<string, number>(); // wgId → float end %
  let yOff = 0;
  g.worksites.forEach(ws => {
    yOff += SITE_ROW_H;
    ws.workgroups.forEach(wg => {
      const wgYCenter = yOff + ROW_H / 2;
      const wgS = wg.startDate ? d2p(wg.startDate) : 0;
      const wgE = wg.endDate ? d2p(wg.endDate) : wgS + 4;
      wgBarPos.set(wg.id, { left: wgS, right: wgE, yCenterPx: wgYCenter });
      // ★ ENHANCEMENT 2: Float bars
      if (wg.floatDays > 0 && wg.endDate) {
        const floatEndDate = new Date(new Date(wg.endDate).getTime() + wg.floatDays * 864e5);
        const fep = d2p(floatEndDate);
        floatBars.push({ wgId: wg.id, endPct: wgE, floatEndPct: fep, y: yOff, floatDays: wg.floatDays });
        floatEndPctMap.set(wg.id, fep);
      }
      yOff += ROW_H;
      const wStart = wg.startDate ? new Date(wg.startDate).getTime() : tS;
      wg.jobs.forEach((job: UIGanttJob) => {
        jobToWgId.set(job.id, wg.id);
        const dayOff = wg.jobs.slice(0, job.sequence - 1).reduce((a: number, j: UIGanttJob) => a + j.durationDays, 0);
        const jS = new Date(wStart + dayOff * 864e5);
        const jE = new Date(jS.getTime() + job.durationDays * 864e5);
        const jL = d2p(jS), jR = d2p(jE);
        if (exp.has(wg.id)) {
          jobBarPos.set(job.id, { left: jL, right: jR, yCenterPx: yOff + JOB_ROW_H / 2 });
          yOff += JOB_ROW_H;
        } else {
          jobBarPos.set(job.id, { left: jL, right: jR, yCenterPx: wgYCenter });
        }
        (job.dependsOnJobIds || []).forEach(predJobId => { jobDepEdges.push({ fromJobId: predJobId, toJobId: job.id }); });
      });
    });
  });
  const totalContentH = yOff;

  // ── Dependency curves ──
  interface DepCurve { key: string; path: string; x1: number; y1: number; x2: number; y2: number; isCrossWg: boolean; level: string; isCriticalLink: boolean; }
  const depCurves: DepCurve[] = [];
  const CORNER_R = 6, EXIT_GAP = 10;
  function buildPath(x1: number, y1: number, x2: number, y2: number): string {
    const dy = y2 - y1, absDy = Math.abs(dy);
    if (absDy < 2) return `M ${x1},${y1} L ${x2},${y2}`;
    const dir = dy > 0 ? 1 : -1, r = Math.min(CORNER_R, absDy / 2), midX = x1 + EXIT_GAP;
    if (x2 > midX + r * 2) return `M ${x1},${y1} L ${midX},${y1} Q ${midX+r},${y1} ${midX+r},${y1+dir*r} L ${midX+r},${y2-dir*r} Q ${midX+r},${y2} ${midX+2*r},${y2} L ${x2},${y2}`;
    const sX = Math.max(x1 + EXIT_GAP, x2 - EXIT_GAP), cX = sX + r;
    return `M ${x1},${y1} L ${sX},${y1} Q ${cX},${y1} ${cX},${y1+dir*r} L ${cX},${y2-dir*r} Q ${cX},${y2} ${cX+r},${y2} L ${x2},${y2}`;
  }
  const coveredWgPairs = new Set<string>();
  if (rightW > 0) {
    jobDepEdges.forEach(({ fromJobId, toJobId }) => {
      const fromPos = jobBarPos.get(fromJobId), toPos = jobBarPos.get(toJobId);
      if (!fromPos || !toPos) return;
      const x1 = (fromPos.right / 100) * rightW, y1 = fromPos.yCenterPx, x2 = (toPos.left / 100) * rightW, y2 = toPos.yCenterPx;
      const fromWg = jobToWgId.get(fromJobId), toWg = jobToWgId.get(toJobId), isCrossWg = fromWg !== toWg;
      if (isCrossWg && fromWg && toWg) coveredWgPairs.add(`${fromWg}->${toWg}`);
      depCurves.push({ key: `job:${fromJobId}->${toJobId}`, path: buildPath(x1, y1, x2, y2), x1, y1, x2, y2, isCrossWg, level: 'job', isCriticalLink: false });
    });
    g.worksites.forEach(ws => ws.workgroups.forEach(wg => {
      (wg.dependsOnIds || []).forEach(predId => {
        // ★ REFINEMENT: Critical path arrows red only when BOTH are critical AND neither is complete
        const bothCritical = criticalPathSet.has(predId) && criticalPathSet.has(wg.id)
          && wgStatusMap.get(predId) !== "complete" && wg.status !== "complete";
        // Skip WG-level arrow if job-level arrows already cover the pair — UNLESS it's a critical link
        if (!bothCritical && coveredWgPairs.has(`${predId}->${wg.id}`)) return;
        const fromPos = wgBarPos.get(predId), toPos = wgBarPos.get(wg.id);
        if (!fromPos || !toPos) return;
        const x1 = (fromPos.right / 100) * rightW, y1 = fromPos.yCenterPx, x2 = (toPos.left / 100) * rightW, y2 = toPos.yCenterPx;
        depCurves.push({ key: `wg:${predId}->${wg.id}`, path: buildPath(x1, y1, x2, y2), x1, y1, x2, y2, isCrossWg: true, level: 'workgroup', isCriticalLink: bothCritical });
      });
    }));
    // Pending deps from drag-and-drop
    pendingDeps.forEach(dep => {
      const fromPos = jobBarPos.get(dep.from_id), toPos = jobBarPos.get(dep.to_id);
      if (!fromPos || !toPos) return;
      const x1 = (fromPos.right / 100) * rightW, y1 = fromPos.yCenterPx, x2 = (toPos.left / 100) * rightW, y2 = toPos.yCenterPx;
      depCurves.push({ key: `pending:${dep.from_id}->${dep.to_id}`, path: buildPath(x1, y1, x2, y2), x1, y1, x2, y2, isCrossWg: true, level: 'pending', isCriticalLink: false });
    });
  }

  // ── Dep drag handlers ──
  const startDepDrag = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    const pos = jobBarPos.get(jobId);
    if (!rect || !pos) return;
    setDepDrag({ fromJobId: jobId, fromX: (pos.right / 100) * rightW, fromY: pos.yCenterPx, curX: e.clientX - rect.left, curY: e.clientY - rect.top });
  };

  useEffect(() => {
    if (!depDrag) return;
    const onMove = (e: MouseEvent) => { const rect = svgRef.current?.getBoundingClientRect(); if (rect) setDepDrag(prev => prev ? { ...prev, curX: e.clientX - rect.left, curY: e.clientY - rect.top } : null); };
    const onUp = async (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect && depDrag) {
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let closestJob: string | null = null, closestDist = 30;
        jobBarPos.forEach((pos, jobId) => { if (jobId === depDrag.fromJobId) return; const bx = (pos.left / 100) * rightW; const dist = Math.sqrt((mx - bx) ** 2 + (my - pos.yCenterPx) ** 2); if (dist < closestDist) { closestDist = dist; closestJob = jobId; } });
        if (closestJob) {
          const newDep: ChangeEdge = { action: 'add', from_id: depDrag.fromJobId, to_id: closestJob, level: 'job' };
          const updated = [...pendingDeps, newDep];
          setPendingDeps(updated);
          const result = await previewChanges(updated);
          setPreview(result);
        }
      }
      setDepDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [depDrag, jobBarPos, rightW, pendingDeps, previewChanges]);

  const handleApply = async () => { const ok = await applyChanges(pendingDeps); if (ok) { setPendingDeps([]); setPreview(null); } };
  const handleDiscard = () => { setPendingDeps([]); setPreview(null); };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, userSelect: depDrag ? "none" : "auto" }}>

      {/* Pending deps banner */}
      {pendingDeps.length > 0 && (
        <div style={{ flexShrink: 0, padding: "8px 16px", background: "linear-gradient(135deg,rgba(124,58,237,0.06),rgba(124,58,237,0.03))", borderBottom: "1.5px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>{pendingDeps.length} new dep{pendingDeps.length > 1 ? 's' : ''} pending</span>
          {preview && <span style={{ fontSize: 11, color: preview.valid ? "#2E7D5F" : "#D44A2E", fontWeight: 600 }}>{preview.valid ? `✓ Valid — ${preview.impact.duration_delta >= 0 ? '+' : ''}${preview.impact.duration_delta}d impact` : `✗ ${preview.errors[0] || 'Invalid'}`}{preview.impact?.critical_path_changed ? ' · Critical path changed' : ''}</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={handleDiscard} style={{ padding: "4px 12px", borderRadius: 6, border: "1.5px solid rgba(212,74,46,0.3)", background: "transparent", color: "#D44A2E", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Discard</button>
            {preview?.valid && <button onClick={handleApply} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7C3AED,#9F7AEA)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Apply Changes</button>}
          </div>
        </div>
      )}

      {/* Month header */}
      <div style={{ flexShrink: 0, display: "flex", borderBottom: "2px solid #C4B5A2" }}>
        <div style={{ width: LEFT_W, flexShrink: 0, padding: "10px 14px", background: "#1A1814", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Site / Trade / Job</span>
        </div>
        <div style={{ flex: 1, display: "flex", position: "relative", background: "#FAF9F6" }}>
          {months.map((m, i) => (<div key={i} style={{ position: "absolute", left: `${m.left}%`, width: `${m.width}%`, padding: "10px 0", textAlign: "center", borderLeft: i > 0 ? "1px solid #ECEAE6" : "none" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#6B5F4F", letterSpacing: "0.04em" }}>{m.label}</span></div>))}
          <div style={{ position: "absolute", top: 0, bottom: -2, width: 2, zIndex: 20, left: `${todayPct}%`, background: "#D44A2E" }}><div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 900, color: "#fff", background: "#D44A2E", padding: "2px 8px", borderRadius: "0 0 5px 5px", letterSpacing: "0.06em" }}>TODAY</div></div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div ref={contentRef} style={{ paddingBottom: 35, background: "#fff", minHeight: "100%", position: "relative" }}>

          {/* SVG overlay */}
          {rightW > 0 && (
            <svg ref={svgRef} style={{ position: "absolute", top: 0, left: LEFT_W, width: `calc(100% - ${LEFT_W}px)`, height: Math.max(totalContentH, 1), pointerEvents: "none", zIndex: 15, overflow: "visible" }}>
              <defs>
                <marker id="arr-cross" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L6,3.5 L1,6" fill="none" stroke="#C07B1A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></marker>
                <marker id="arr-intra" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L6,3.5 L1,6" fill="none" stroke="#9C8E7C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></marker>
                <marker id="arr-crit" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L6,3.5 L1,6" fill="none" stroke="#D44A2E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></marker>
                <marker id="arr-pending" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L7,4 L1,7" fill="none" stroke="#7C3AED" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></marker>
              </defs>

              {/* ★ ENHANCEMENT 2: Float bars */}
              {floatBars.map(fb => {
                const barLeft = (fb.endPct / 100) * rightW, barWidth = ((fb.floatEndPct - fb.endPct) / 100) * rightW;
                if (barWidth < 3) return null;
                return (<g key={`float-${fb.wgId}`}>
                  <rect x={barLeft} y={fb.y + ROW_H/2 - 12} width={barWidth} height={24} rx={8}
                    fill="rgba(45,109,181,0.06)" stroke="rgba(45,109,181,0.25)" strokeWidth="1" strokeDasharray="4,3"
                    style={{ animation: "floatBreath 3s ease-in-out infinite" }} />
                  <text x={barLeft + barWidth/2} y={fb.y + ROW_H/2 + 3} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill="#2D6DB5" fontFamily="'Outfit',sans-serif" opacity="0.7">
                    {fb.floatDays}d slack
                  </text>
                </g>);
              })}

              {/* Dep arrows — ★ ENHANCEMENT 1: Critical links are red */}
              {depCurves.map(dep => {
                const isPending = dep.level === 'pending';
                const color = isPending ? "#7C3AED" : dep.isCriticalLink ? "#D44A2E" : dep.isCrossWg ? "#C07B1A" : "#9C8E7C";
                const markerId = isPending ? "arr-pending" : dep.isCriticalLink ? "arr-crit" : dep.isCrossWg ? "arr-cross" : "arr-intra";
                return (<path key={dep.key} d={dep.path} fill="none" stroke={color}
                  strokeWidth={isPending ? 2 : dep.isCriticalLink ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={isPending ? "6,4" : dep.isCriticalLink ? "6,3" : "none"}
                  markerEnd={`url(#${markerId})`} opacity={isPending ? 0.9 : dep.isCriticalLink ? 0.8 : 0.7} />);
              })}

              {/* Live drag line */}
              {depDrag && <line x1={depDrag.fromX} y1={depDrag.fromY} x2={depDrag.curX} y2={depDrag.curY} stroke="#7C3AED" strokeWidth="2" strokeDasharray="6,4" opacity="0.8" pointerEvents="none" />}
            </svg>
          )}

          {/* Rows */}
          {g.worksites.map((ws, wi) => {
            const sc = SC[wi % SC.length];
            return (
              <div key={ws.id} style={{ animation: `fu .32s ${wi * 70}ms both` }}>
                {/* Site header */}
                <div style={{ display: "flex", alignItems: "stretch", height: SITE_ROW_H, borderBottom: "1.5px solid #C4B5A2", position: "sticky", top: 0, zIndex: 10 }}>
                  <div style={{ width: LEFT_W, flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, background: sc.gradient }}>
                    <MapPinI size={12} color="#fff" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{ws.shortName}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{ws.workgroups.length} trades · {ws.workgroups.flatMap(w => w.jobs).length} jobs</span>
                  </div>
                  <div style={{ flex: 1, background: sc.bg, position: "relative" }}>
                    {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.04)" }} /> : null)}
                  </div>
                </div>

                {/* Workgroup rows */}
                {ws.workgroups.map((wg, wgi) => {
                  const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon;
                  const sm = SM[wg.status] || SM.draft;
                  const isE = exp.has(wg.id), isH = hovered === wg.id;
                  const dn = wg.jobs.filter((j: UIGanttJob) => j.status === "complete" || j.status === "paid").length;
                  const pc = wg.jobs.length > 0 ? (dn / wg.jobs.length) * 100 : 0;
                  const s = wg.startDate ? d2p(wg.startDate) : 0;
                  const e = wg.endDate ? d2p(wg.endDate) : s + 4;
                  const w = Math.max(e - s, 2);
                  const isCrit = wg.isCritical;
                  const isDone = wg.status === "complete";
                  // ★ REFINEMENT 1: Completed critical WGs get green treatment, not red
                  const isCritActive = isCrit && !isDone;
                  const isBlocked = wg.dependsOnIds.length > 0 && wg.status !== "complete" && wg.status !== "in_progress";
                  // Completion label position: after float bar if float exists
                  const labelPct = floatEndPctMap.has(wg.id) ? floatEndPctMap.get(wg.id)! + 0.5 : s + w + 0.8;

                  return (
                    <div key={wg.id} style={{ animation: `si .3s ${wi * 70 + wgi * 45 + 60}ms both` }}>
                      <div className="gantt-wg-row" onClick={() => toggleExp(wg.id)} onMouseEnter={() => setHovered(wg.id)} onMouseLeave={() => setHovered(null)}
                        style={{ display: "flex", alignItems: "center", height: ROW_H, borderBottom: `1px solid ${isE ? "#C4B5A2" : "#ECEAE6"}`, cursor: "pointer", background: isH ? "#FAF9F6" : isE ? "#FAFAF8" : "transparent", transition: "background .15s" }}>
                        <div style={{ width: LEFT_W, flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "#9C8E7C", width: 12, textAlign: "center", flexShrink: 0, transition: "transform .2s", transform: isE ? "rotate(90deg)" : "none" }}>▶</span>
                          <div style={{ width: 3, height: 26, borderRadius: 2, background: isCritActive ? P.crit.grad : sm.p.grad, flexShrink: 0 }} />
                          <div style={{ width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}><TradeIcon size={14} color={ti.c} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wg.title}</span>
                              <Badge status={wg.status} />
                              {isCritActive && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, fontWeight: 800, letterSpacing: "0.04em", background: "#D44A2E", color: "#fff" }}>CRIT</span>}
                              {/* ★ ENHANCEMENT 5: Bottleneck badge with downstream count */}
                              {wg.isBottleneck && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, fontWeight: 800, background: "#7C3AED", color: "#fff" }}>⚠ BTL ×{wg.downstreamCount}</span>}
                            </div>
                            <p style={{ fontSize: 10, color: "#9C8E7C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {wg.contractor} · {dn}/{wg.jobs.length} jobs · {fmt(wg.budget)}
                              {wg.floatDays > 0 && <span style={{ color: "#2D6DB5", fontWeight: 600 }}> · {wg.floatDays}d float</span>}
                            </p>
                          </div>
                        </div>
                        <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
                          {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.04)" }} /> : null)}

                          {/* ★ ENHANCEMENT 1: Critical path red border + glow on WG bars */}
                          <div
                            onMouseEnter={(ev) => setTooltip({ x: ev.clientX, y: ev.clientY, title: wg.title, sub: `${wg.contractor} · ${wg.startDate ? fmtD(wg.startDate) : '?'} → ${wg.endDate ? fmtD(wg.endDate) : '?'}`, budget: fmt(wg.budget), paid: fmt(wg.totalPaid), invoiced: fmt(wg.totalInvoiced), progress: `${Math.round(pc)}% (${dn}/${wg.jobs.length})`, floatInfo: wg.floatDays > 0 ? `${wg.floatDays} days slack` : undefined, critical: isCritActive, bottleneck: wg.isBottleneck ? `Bottleneck: ${wg.downstreamCount} downstream depend on this` : undefined, msg: wg.statusMessage })}
                            onMouseMove={(ev) => setTooltip(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              position: "absolute", height: 24, borderRadius: 8, overflow: "hidden",
                              left: `${s}%`, width: `${w}%`,
                              background: isBlocked ? "transparent" : "rgba(0,0,0,0.04)",
                              // ★ Critical takes priority: critical+blocked = red dashed, critical+active = red solid
                              border: isCritActive && isBlocked ? `2px dashed #D44A2E`
                                : isCritActive ? `1.5px solid #D44A2E`
                                : isBlocked ? `2px dashed ${P.pending.fg}`
                                : `1.5px solid ${sm.p.ring}`,
                              transition: "box-shadow .2s",
                              boxShadow: isCritActive
                                ? `0 0 0 2px rgba(212,74,46,0.15), 0 0 12px rgba(212,74,46,0.2)`
                                : isH ? `0 2px 10px ${sm.p.fg}20` : "none",
                              animation: isCritActive ? "critPulse 2.5s ease-in-out infinite" : undefined,
                              zIndex: 6,
                            }}>
                            <div style={{ height: "100%", width: `${pc}%`, background: isCritActive ? P.crit.grad : sm.p.grad, borderRadius: 7, transition: "width .7s ease" }} />
                            {wg.status === "in_progress" && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.25) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 2s infinite" }} />}
                          </div>
                          {/* ★ REFINEMENT 4: Completion label positioned AFTER float bar end */}
                          <span style={{ position: "absolute", fontSize: 11, fontWeight: 800, zIndex: 10, left: `${Math.min(labelPct, 96)}%`, color: isCritActive ? P.crit.fg : sm.p.fg }}>{dn}/{wg.jobs.length}</span>
                          {wg.status === "complete" && <div style={{ position: "absolute", zIndex: 10, left: `${e}%`, top: "50%", transform: "translate(-50%, -50%) rotate(45deg)", width: 10, height: 10, background: sm.p.fg, border: "2px solid #fff", boxShadow: `0 0 0 1px ${sm.p.fg}` }} />}
                        </div>
                      </div>

                      {/* Expanded job rows */}
                      {isE && wg.jobs.map((job: UIGanttJob, ji: number) => {
                        const jSm = SM[job.status] || SM.not_started;
                        const isDone = job.status === "complete" || job.status === "paid";
                        const isAct = job.status === "in_progress";
                        const isNotStarted = job.status === "not_started";
                        const jobPos = jobBarPos.get(job.id);
                        if (!jobPos) return null;
                        const jL = jobPos.left, jR = jobPos.right, jW = Math.max(jR - jL, 1);
                        const isJobH = hovered === job.id;

                        return (
                          <div key={job.id} className="gantt-job-row" onMouseEnter={() => setHovered(job.id)} onMouseLeave={() => setHovered(null)}
                            style={{ display: "flex", alignItems: "center", height: JOB_ROW_H, borderBottom: "1px solid #F0EDE8", animation: `fu .25s ${ji * 30}ms both`, background: isJobH ? "#FAF9F6" : "transparent", transition: "background .12s" }}>
                            <div style={{ width: LEFT_W, flexShrink: 0, paddingLeft: 56, paddingRight: 12, display: "flex", alignItems: "center", gap: 7 }}>
                              {isDone ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckI size={8} color="#fff" sw={3} /></div>
                                : isAct ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.active.grad, flexShrink: 0, animation: "pg 2s ease-in-out infinite" }} />
                                : <div style={{ width: 16, height: 16, borderRadius: 8, border: "1.5px solid #C4B5A2", background: "#fff", flexShrink: 0 }} />}
                              <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isDone ? "#9C8E7C" : "#3D3529", fontWeight: isDone ? 500 : 600, textDecoration: isDone ? "line-through" : "none" }}>{job.title}</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9C8E7C", flexShrink: 0, fontWeight: 600 }}>{job.durationDays}d</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8C7E6A", flexShrink: 0, fontWeight: 700 }}>{fmt(job.budget)}</span>
                            </div>
                            <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
                              {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.03)" }} /> : null)}
                              <div
                                onMouseEnter={(ev) => setTooltip({ x: ev.clientX, y: ev.clientY, title: job.title, sub: `${job.durationDays} days · ${fmt(job.budget)}`, paid: job.paid ? "Paid" : undefined, invoiced: job.invoiced && !job.paid ? "Invoiced" : undefined, floatInfo: job.floatDays > 0 ? `${job.floatDays}d float` : undefined })}
                                onMouseMove={(ev) => setTooltip(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)}
                                onMouseLeave={() => setTooltip(null)}
                                style={{
                                  position: "absolute", height: 16, borderRadius: 6,
                                  left: `${jL}%`, width: `${jW}%`,
                                  // ★ REFINEMENT 3: Not-started = dotted outline, no fill. No critical styling on jobs.
                                  background: isNotStarted ? "none" : jSm.p.grad,
                                  border: isNotStarted ? "1px dashed #8C7E6A" : "none",
                                  opacity: 1,
                                  boxShadow: isJobH && !isNotStarted ? `0 2px 8px ${jSm.p.fg}25` : "none",
                                  transition: "box-shadow .15s",
                                }}>
                                {isAct && <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.25) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 2s infinite" }} />}
                              </div>

                              {/* ★ ENHANCEMENT 3: Dep drag handle on ALL job bars */}
                              <div className="dep-handle" onMouseDown={(e) => startDepDrag(e, job.id)} style={{ position: "absolute", left: `${jR}%`, top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: "#7C3AED", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", zIndex: 20, pointerEvents: "auto", cursor: "crosshair" }} />

                              {(job.paid || job.invoiced) && <span style={{ position: "absolute", fontSize: 9, fontWeight: 700, left: `${Math.min(jL + jW + 0.5, 95)}%`, color: job.paid ? "#2E7D5F" : "#C07B1A", zIndex: 8 }}>{job.paid ? "Paid" : "Inv'd"}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ position: "sticky", bottom: 0, height: 0, zIndex: 5, pointerEvents: "none" }}><div style={{ position: "absolute", bottom: 0, top: -9999, width: 2, left: `calc(${LEFT_W}px + (100% - ${LEFT_W}px) * ${todayPct / 100})`, background: "rgba(212,74,46,0.15)" }} /></div>
        </div>
      </div>

      {/* Rich tooltip with bottleneck info */}
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, padding: "10px 14px", borderRadius: 12, background: "#1A1814", color: "#fff", fontSize: 12, fontWeight: 600, boxShadow: "0 12px 32px rgba(0,0,0,0.3)", zIndex: 1000, pointerEvents: "none", maxWidth: 320, minWidth: 180 }}>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>{tooltip.title}</div>
          {tooltip.sub && <div style={{ fontSize: 11, color: "#9C8E7C", marginBottom: 6 }}>{tooltip.sub}</div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {tooltip.budget && <div><div style={{ fontSize: 8, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget</div><div style={{ fontSize: 12, fontWeight: 800 }}>{tooltip.budget}</div></div>}
            {tooltip.paid && <div><div style={{ fontSize: 8, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Paid</div><div style={{ fontSize: 12, fontWeight: 800, color: "#86EFAC" }}>{tooltip.paid}</div></div>}
            {tooltip.invoiced && <div><div style={{ fontSize: 8, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Invoiced</div><div style={{ fontSize: 12, fontWeight: 800, color: "#FDE68A" }}>{tooltip.invoiced}</div></div>}
            {tooltip.progress && <div><div style={{ fontSize: 8, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</div><div style={{ fontSize: 12, fontWeight: 800 }}>{tooltip.progress}</div></div>}
          </div>
          {tooltip.floatInfo && <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: "#93C5FD" }}>◇ {tooltip.floatInfo}</div>}
          {tooltip.critical && <div style={{ marginTop: 3, fontSize: 10, fontWeight: 800, color: "#FCA5A5" }}>⚠ Critical Path</div>}
          {tooltip.bottleneck && <div style={{ marginTop: 3, fontSize: 10, fontWeight: 700, color: "#C4B5FF" }}>⚠ {tooltip.bottleneck}</div>}
          {tooltip.msg && <div style={{ marginTop: 3, fontSize: 10, color: "#a8a29e", fontStyle: "italic" }}>{tooltip.msg}</div>}
        </div>
      )}
    </div>
  );
}
