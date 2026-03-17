/**
 * ScaffoldEditor — Premium cards + dual-mode dependency graph
 *
 * Left panel: Workgroup cards with jobs, CRUD actions, micro-bars
 * Right panel: Toggle between Simple (SVG) and Interactive (Canvas) graph
 *
 * Simple mode: Clean SVG, click-to-scroll, hover sync
 * Interactive mode: Canvas 60fps, energy streams, drag nodes,
 *                   drag-to-connect, double-click cascade ripple
 *
 * File: src/components/scaffold/ScaffoldEditor.tsx
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";
import type { GraphMode, ScaffoldWorkgroup, ScaffoldJob } from "@/types/scaffold";

interface Props {
  wizard: ScaffoldWizardHook;
}

// ═══════════════════════════════════════════════════════════
// TRADE CONFIG
// ═══════════════════════════════════════════════════════════

const TRADES: Record<
  string,
  { ico: string; bg: string; ring: string; c: string; fill: string; glow: string }
> = {
  Demo: { ico: "🔨", bg: "linear-gradient(135deg,#FAF9F6,#ECEAE6)", ring: "#DDD7CC", c: "#8C7E6A", fill: "#C4B5A2", glow: "rgba(180,169,154," },
  Framing: { ico: "🏗️", bg: "linear-gradient(135deg,#FFF8EE,#F0D9A8)", ring: "#E5A63B", c: "#C07B1A", fill: "#E5A63B", glow: "rgba(229,166,59," },
  Electrical: { ico: "⚡", bg: "linear-gradient(135deg,#EFF5FC,#BDD4EF)", ring: "#5A9AD5", c: "#2D6DB5", fill: "#5A9AD5", glow: "rgba(90,154,213," },
  Plumbing: { ico: "🔧", bg: "linear-gradient(135deg,#E0F0F7,#B8DDE8)", ring: "#4AA0C0", c: "#2D7D9E", fill: "#4AA0C0", glow: "rgba(74,160,192," },
  HVAC: { ico: "💨", bg: "linear-gradient(135deg,#EDFAF4,#B5E2CC)", ring: "#3D8B6E", c: "#2E7D5F", fill: "#3D8B6E", glow: "rgba(61,139,110," },
  Drywall: { ico: "🧱", bg: "linear-gradient(135deg,#F8F4FC,#E0D4F0)", ring: "#8B7AAE", c: "#7B5EA7", fill: "#8B7AAE", glow: "rgba(139,122,174," },
  Painting: { ico: "🎨", bg: "linear-gradient(135deg,#FCF0F4,#F5D5E0)", ring: "#E090A8", c: "#C05A7A", fill: "#E090A8", glow: "rgba(224,144,168," },
  Flooring: { ico: "🏢", bg: "linear-gradient(135deg,#FEF5F0,#F0C5B0)", ring: "#C4785A", c: "#9E5A3C", fill: "#C4785A", glow: "rgba(196,120,90," },
};

const DEFAULT_TRADE = TRADES.Demo;

function getTrade(name: string) {
  return TRADES[name] || DEFAULT_TRADE;
}

// ═══════════════════════════════════════════════════════════
// GRAPH HELPERS
// ═══════════════════════════════════════════════════════════

interface WgData {
  index: number;
  title: string;
  trade: string;
  deps: number[];
  jobs: { title: string; days: number }[];
  totalDays: number;
}

function buildWgData(wizard: ScaffoldWizardHook): WgData[] {
  const s = wizard.state.scaffold;
  if (!s) return [];
  return s.workgroups.map((wg, i) => {
    const jobs = s.jobs
      .filter((j) => j.workgroup_index === i)
      .map((j) => ({ title: j.title, days: j.est_duration_days }));
    return {
      index: i,
      title: wg.title,
      trade: wg.trade,
      deps: wg.depends_on_indices,
      jobs,
      totalDays: jobs.reduce((a, j) => a + j.days, 0),
    };
  });
}

function assignLevels(wgs: WgData[]): Record<number, number> {
  const lv: Record<number, number> = {};
  const idxSet = new Set(wgs.map((w) => w.index));
  function go(idx: number): number {
    if (lv[idx] !== undefined) return lv[idx];
    const wg = wgs.find((w) => w.index === idx);
    if (!wg || !wg.deps.length) { lv[idx] = 0; return 0; }
    lv[idx] = Math.max(...wg.deps.filter((d) => idxSet.has(d)).map(go)) + 1;
    return lv[idx];
  }
  wgs.forEach((w) => go(w.index));
  return lv;
}

interface CritPath {
  days: number;
  path: number[];
  ends: Record<number, number>;
}

function calcCritPath(wgs: WgData[]): CritPath {
  if (!wgs.length) return { days: 0, path: [], ends: {} };
  const ends: Record<number, number> = {};
  const prev: Record<number, number | null> = {};
  const idxSet = new Set(wgs.map((w) => w.index));
  // Topological sort
  const topo: number[] = [];
  const visited = new Set<number>();
  const tmp = new Set<number>();
  function visit(idx: number) {
    if (tmp.has(idx) || visited.has(idx)) return;
    tmp.add(idx);
    const wg = wgs.find((w) => w.index === idx);
    if (wg) wg.deps.forEach((d) => { if (idxSet.has(d)) visit(d); });
    tmp.delete(idx);
    visited.add(idx);
    topo.push(idx);
  }
  wgs.forEach((w) => visit(w.index));
  topo.forEach((idx) => {
    const wg = wgs.find((w) => w.index === idx);
    if (!wg) return;
    const validDeps = wg.deps.filter((d) => ends[d] !== undefined);
    const depMax = validDeps.length ? Math.max(...validDeps.map((d) => ends[d])) : 0;
    ends[idx] = depMax + wg.totalDays;
    prev[idx] = validDeps.length
      ? validDeps.reduce((best, d) => ((ends[d] || 0) > (ends[best] || 0) ? d : best), validDeps[0])
      : null;
  });
  const maxEnd = Math.max(...Object.values(ends), 0);
  const cp: number[] = [];
  if (Object.keys(ends).length) {
    let cur: number | null = Object.entries(ends).reduce(
      (a, b) => (b[1] > a[1] ? b : a)
    )[0] as any;
    cur = Number(cur);
    while (cur !== null && cur !== undefined) {
      cp.unshift(cur);
      cur = prev[cur] ?? null;
    }
  }
  return { days: maxEnd, path: cp, ends };
}

// ═══════════════════════════════════════════════════════════
// MODAL TYPES
// ═══════════════════════════════════════════════════════════

type ModalState =
  | { type: "editWg"; index: number }
  | { type: "deps"; index: number }
  | { type: "editJob"; wgIndex: number; jobIdx: number }
  | { type: "refine" }
  | null;

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ScaffoldEditor({ wizard }: Props) {
  const { state } = wizard;
  const [expanded, setExpanded] = useState<Set<number>>(
    new Set(state.scaffold?.workgroups.map((_, i) => i) || [])
  );
  const [hlWg, setHlWg] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const cardListRef = useRef<HTMLDivElement>(null);

  const wgs = buildWgData(wizard);
  const cp = calcCritPath(wgs);
  const maxDur = Math.max(...wgs.map((w) => w.totalDays), 1);

  const toggle = (idx: number) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const scrollToCard = (idx: number) => {
    setHlWg(idx);
    setExpanded((s) => new Set(s).add(idx));
    setTimeout(() => {
      const el = document.getElementById(`wg-card-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // ═══ Handlers that delegate to wizard hook ═══

  const handleDeleteWg = (idx: number) => {
    wizard.removeWorkgroup(idx);
    setExpanded((s) => {
      const next = new Set<number>();
      s.forEach((v) => {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      });
      return next;
    });
  };

  const handleDuplicateWg = (idx: number) => {
    wizard.duplicateWorkgroup(idx);
    const newIdx = wgs.length;
    setExpanded((s) => new Set(s).add(newIdx));
  };

  const handleAddWg = () => {
    wizard.addWorkgroup({
      title: "New Workgroup",
      trade: "Demo",
      contractor_type: "",
      worksite_index: 0,
      depends_on_indices: [],
      notes: "",
      budget_pct: 0,
    });
    const newIdx = wgs.length;
    setExpanded((s) => new Set(s).add(newIdx));
  };

  const handleAddJob = (wgIdx: number) => {
    wizard.addJob({
      title: "New job",
      workgroup_index: wgIdx,
      sequence: (state.scaffold?.jobs.filter((j) => j.workgroup_index === wgIdx).length || 0) + 1,
      est_duration_days: 1,
      budget_pct: 0,
      notes: "",
    });
    setExpanded((s) => new Set(s).add(wgIdx));
  };

  const handleDeleteJob = (wgIdx: number, jobLocalIdx: number) => {
    // Find the global job index
    const s = state.scaffold;
    if (!s) return;
    let globalIdx = -1;
    let count = 0;
    for (let i = 0; i < s.jobs.length; i++) {
      if (s.jobs[i].workgroup_index === wgIdx) {
        if (count === jobLocalIdx) { globalIdx = i; break; }
        count++;
      }
    }
    if (globalIdx >= 0) wizard.removeJob(globalIdx);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        background: "#fff", padding: "10px 16px",
        borderBottom: "1px solid #ECEAE6",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1814" }}>
            Edit project plan
          </div>
          <span style={{ fontSize: 11, color: "#8C7E6A" }}>
            {wgs.length} workgroups · {state.scaffold?.jobs.length || 0} jobs · ~{cp.days}d critical path
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setModal({ type: "refine" })}
            style={{
              padding: "5px 11px", borderRadius: 7,
              border: "1.5px solid #B5E2CC", background: "#EDFAF4",
              fontSize: 11, fontWeight: 700, color: "#2E7D5F",
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}
          >
            ✨ Refine with AI
          </button>
          <button
            onClick={handleAddWg}
            style={{
              padding: "5px 11px", borderRadius: 7,
              border: "1.5px solid #ECEAE6", background: "#fff",
              fontSize: 11, fontWeight: 700, color: "#6B5F4F",
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}
          >
            + Workgroup
          </button>
        </div>
      </div>

      {/* Split panel */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ═══ LEFT: Cards ═══ */}
        <div
          ref={cardListRef}
          style={{
            width: 350, overflowY: "auto", padding: 10,
            borderRight: "1px solid #ECEAE6", background: "#F7F6F3",
          }}
        >
          {/* Summary stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6, marginBottom: 10,
          }}>
            {[
              { v: wgs.length, l: "Workgroups", c: "#1A1814" },
              { v: state.scaffold?.jobs.length || 0, l: "Jobs", c: "#2D6DB5" },
              { v: `${cp.days}d`, l: "Crit. path", c: "#D44A2E" },
              { v: new Set(wgs.map((w) => w.trade).filter(Boolean)).size, l: "Trades", c: "#C07B1A" },
            ].map((s) => (
              <div key={s.l} style={{
                background: "#fff", borderRadius: 8, padding: 7,
                textAlign: "center", border: "1px solid #ECEAE6",
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 800, color: s.c,
                }}>
                  {s.v}
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 600, color: "#9C8E7C",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1,
                }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Workgroup cards */}
          {wgs.map((wg) => {
            const tr = getTrade(wg.trade);
            const onCrit = cp.path.includes(wg.index);
            const isHl = hlWg === wg.index;
            const durPct = Math.round((wg.totalDays / maxDur) * 100);

            return (
              <div
                key={wg.index}
                id={`wg-card-${wg.index}`}
                onMouseEnter={() => setHlWg(wg.index)}
                onMouseLeave={() => setHlWg(null)}
                style={{
                  background: "#fff", borderRadius: 12,
                  border: `1.5px solid ${isHl ? "#3D6B5E" : "#ECEAE6"}`,
                  marginBottom: 7, overflow: "hidden",
                  transition: "all .25s",
                  boxShadow: isHl
                    ? "0 0 0 2px rgba(61,107,94,0.18), 0 4px 16px rgba(61,107,94,0.08)"
                    : "0 2px 10px rgba(0,0,0,0.02)",
                }}
              >
                {/* Header */}
                <div
                  onClick={() => toggle(wg.index)}
                  style={{
                    padding: "10px 12px", display: "flex",
                    alignItems: "center", gap: 8, cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: tr.bg, border: `1.5px solid ${tr.ring}`,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14,
                    position: "relative",
                  }}>
                    {tr.ico}
                    {isHl && (
                      <div style={{
                        position: "absolute", inset: -2, borderRadius: 10,
                        border: `2px solid ${tr.ring}`,
                        transition: "border-color .25s",
                      }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814" }}>
                        {wg.title}
                      </span>
                      {onCrit && (
                        <span
                          title="Critical path"
                          style={{
                            width: 6, height: 6, borderRadius: 3,
                            background: "#D44A2E", flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      marginTop: 3, flexWrap: "wrap",
                    }}>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 6px",
                        borderRadius: 4, background: tr.bg, color: tr.c,
                        border: `1px solid ${tr.ring}`,
                      }}>
                        {wg.trade}
                      </span>
                      <span style={{ fontSize: 9, color: "#8C7E6A", fontWeight: 600 }}>
                        {wg.jobs.length} jobs · {wg.totalDays}d
                      </span>
                      {wg.deps.map((depIdx) => {
                        const dep = wgs.find((w) => w.index === depIdx);
                        return dep ? (
                          <span key={depIdx} style={{
                            padding: "1px 6px", borderRadius: 4,
                            fontSize: 8, fontWeight: 700,
                            background: "#EFF5FC", color: "#2D6DB5",
                          }}>
                            ← {dep.title.split(" ")[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div style={{
                      height: 3, borderRadius: 2, background: "#ECEAE6",
                      overflow: "hidden", marginTop: 4,
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${durPct}%`,
                        background: onCrit
                          ? "linear-gradient(90deg, #D44A2E, #E8705A)"
                          : `linear-gradient(90deg, ${tr.fill}, ${tr.ring})`,
                        transition: "width .4s",
                      }} />
                    </div>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div style={{
                    display: "flex", gap: 3, opacity: isHl ? 1 : 0,
                    transition: "opacity .15s",
                  }}>
                    {[
                      { label: "✎", title: "Edit", onClick: () => setModal({ type: "editWg", index: wg.index }) },
                      { label: "🔗", title: "Dependencies", onClick: () => setModal({ type: "deps", index: wg.index }) },
                      { label: "⧉", title: "Duplicate", onClick: () => handleDuplicateWg(wg.index) },
                    ].map((a) => (
                      <button
                        key={a.title}
                        title={a.title}
                        onClick={(e) => { e.stopPropagation(); a.onClick(); }}
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          border: "1px solid #ECEAE6", background: "#fff",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", cursor: "pointer",
                          fontSize: 10, color: "#8C7E6A", transition: "all .15s",
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteWg(wg.index); }}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        border: "1px solid #ECEAE6", background: "#fff",
                        display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer",
                        fontSize: 10, color: "#8C7E6A", transition: "all .15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#D44A2E";
                        e.currentTarget.style.color = "#D44A2E";
                        e.currentTarget.style.background = "#FEF0ED";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#ECEAE6";
                        e.currentTarget.style.color = "#8C7E6A";
                        e.currentTarget.style.background = "#fff";
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <span style={{
                    color: "#C4B5A2", fontSize: 10,
                    transform: `rotate(${expanded.has(wg.index) ? "0" : "-90"}deg)`,
                    display: "inline-block", transition: "transform .15s",
                  }}>
                    ▼
                  </span>
                </div>

                {/* Jobs (collapsed/expanded) */}
                {expanded.has(wg.index) && (
                  <div style={{
                    borderTop: "1px solid #F0EDE8",
                    padding: "4px 10px 8px", background: "#FDFCFA",
                  }}>
                    {wg.jobs.map((job, ji) => (
                      <div
                        key={ji}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "4px 6px", borderRadius: 6,
                          transition: "all .15s", margin: "1px 0",
                          fontSize: 11,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F3EF")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: tr.bg, color: tr.c,
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 8,
                          fontWeight: 800, flexShrink: 0,
                        }}>
                          {ji + 1}
                        </div>
                        <div style={{ fontWeight: 600, color: "#1A1814", flex: 1 }}>
                          {job.title}
                        </div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9, fontWeight: 700, color: "#8C7E6A",
                          background: "#F5F3EF", padding: "2px 7px",
                          borderRadius: 4,
                        }}>
                          {job.days}d
                        </div>
                        {/* TODO: Job edit/delete on hover (implement with same pattern) */}
                      </div>
                    ))}
                    <div
                      onClick={() => handleAddJob(wg.index)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 6px", borderRadius: 5,
                        fontSize: 10, fontWeight: 600, color: "#B5A99A",
                        cursor: "pointer", marginTop: 3,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#EDFAF4";
                        e.currentTarget.style.color = "#3D6B5E";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#B5A99A";
                      }}
                    >
                      + Add job
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add workgroup ghost */}
          <div
            onClick={handleAddWg}
            style={{
              borderRadius: 12, border: "1.5px dashed #DDD7CC",
              background: "#FAF9F6", textAlign: "center",
              padding: 12, cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3D6B5E")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#DDD7CC")}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "#B5A99A" }}>
              + Add workgroup
            </span>
          </div>
        </div>

        {/* ═══ RIGHT: Graph Panel ═══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FDFCFA" }}>
          {/* Graph header with toggle */}
          <div style={{
            padding: "8px 14px", borderBottom: "1px solid #ECEAE6",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#6B5F4F",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>Dependency graph</span>
              <span style={{
                background: "#EDFAF4", color: "#2E7D5F",
                fontSize: 8, fontWeight: 800, padding: "2px 6px",
                borderRadius: 4,
              }}>
                LIVE
              </span>
            </div>
            <div style={{
              display: "flex", borderRadius: 6, overflow: "hidden",
              border: "1.5px solid #ECEAE6",
            }}>
              {(["simple", "interactive"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => wizard.setGraphMode(m)}
                  style={{
                    padding: "4px 12px", fontSize: 10, fontWeight: 700,
                    cursor: "pointer", border: "none",
                    fontFamily: "'Outfit', sans-serif", transition: "all .15s",
                    background:
                      state.graphMode === m
                        ? "linear-gradient(135deg, #3D6B5E, #5AAE8F)"
                        : "#FAF9F6",
                    color: state.graphMode === m ? "#fff" : "#8C7E6A",
                  }}
                >
                  {m === "simple" ? "Simple" : "Interactive"}
                </button>
              ))}
            </div>
          </div>

          {/* Graph body */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {state.graphMode === "simple" ? (
              <SimpleGraph
                wgs={wgs}
                cp={cp}
                hlWg={hlWg}
                onHover={setHlWg}
                onClickNode={scrollToCard}
              />
            ) : (
              <InteractiveGraph
                wgs={wgs}
                cp={cp}
                hlWg={hlWg}
                onHover={setHlWg}
                onClickNode={scrollToCard}
                onAddDep={wizard.addDependency}
              />
            )}
          </div>

          {/* Graph footer */}
          <div style={{
            padding: "6px 14px", borderTop: "1px solid #ECEAE6",
            background: "#fff", display: "flex", gap: 14,
            alignItems: "center", fontSize: 10, flexWrap: "wrap",
          }}>
            <GraphFooterItem color="#D44A2E" label={`Critical: ${cp.days}d`} />
            {state.graphMode === "interactive" && (
              <>
                <GraphFooterItem color="#3D6B5E" label="Drag to connect" />
                <GraphFooterItem color="#2D6DB5" label="Double-click: cascade" />
                <GraphFooterItem color="#C4B5A2" label="Drag nodes" />
              </>
            )}
            {state.graphMode === "simple" && (
              <GraphFooterItem color="#3D6B5E" label="Click node to focus" />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: "#fff", borderTop: "1px solid #ECEAE6",
        padding: "8px 16px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          onClick={wizard.prevStep}
          style={{
            padding: "7px 18px", borderRadius: 8,
            border: "1.5px solid #ECEAE6", background: "#fff",
            color: "#6B5F4F", fontWeight: 700, fontSize: 11,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}
        >
          ← Back
        </button>
        <button
          onClick={wizard.nextStep}
          style={{
            padding: "7px 18px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
            color: "#fff", fontWeight: 700, fontSize: 11,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}
        >
          Continue to settings →
        </button>
      </div>

      {/* ═══ MODALS ═══ */}
      {modal && (
        <ModalOverlay onClose={() => setModal(null)}>
          {modal.type === "editWg" && (
            <EditWgModal
              wg={wgs.find((w) => w.index === modal.index)!}
              onSave={(title, trade) => {
                wizard.updateWorkgroup(modal.index, { title, trade });
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === "deps" && (
            <DepsModal
              wg={wgs.find((w) => w.index === modal.index)!}
              allWgs={wgs}
              onToggle={(depIdx) => {
                const wg = wgs.find((w) => w.index === modal.index);
                if (!wg) return;
                if (wg.deps.includes(depIdx)) {
                  wizard.removeDependency(modal.index, depIdx);
                } else {
                  wizard.addDependency(modal.index, depIdx);
                }
              }}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === "refine" && (
            <RefineModal
              onApply={async (feedback) => {
                await wizard.refineScaffold(feedback);
                setModal(null);
              }}
              isLoading={state.isGenerating}
              onClose={() => setModal(null)}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIMPLE SVG GRAPH
// ═══════════════════════════════════════════════════════════

function SimpleGraph({
  wgs, cp, hlWg, onHover, onClickNode,
}: {
  wgs: WgData[]; cp: CritPath; hlWg: number | null;
  onHover: (idx: number | null) => void;
  onClickNode: (idx: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.clientWidth);
    const obs = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const levels = assignLevels(wgs);
  const maxLv = Math.max(...Object.values(levels), 0);
  const nw = 100, nh = 36, gapY = 32, pad = 20;
  const totalH = (maxLv + 1) * (nh + gapY) + pad * 2;

  const groups: Record<number, WgData[]> = {};
  wgs.forEach((w) => {
    const l = levels[w.index] || 0;
    if (!groups[l]) groups[l] = [];
    groups[l].push(w);
  });

  const pos: Record<number, { x: number; y: number }> = {};
  for (let l = 0; l <= maxLv; l++) {
    const grp = groups[l] || [];
    const cols = grp.length;
    const sp = cols > 1 ? Math.min((width - pad * 2 - nw) / (cols - 1), nw + 14) : 0;
    const sx = cols > 1
      ? pad + (width - pad * 2 - nw - (cols - 1) * sp) / 2
      : pad + (width - pad * 2 - nw) / 2;
    grp.forEach((w, ci) => {
      pos[w.index] = { x: sx + ci * sp, y: pad + l * (nh + gapY) };
    });
  }

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${Math.max(totalH, 200)}`} style={{ display: "block" }}>
        {/* Edges */}
        {wgs.map((w) =>
          w.deps.map((depIdx) => {
            const f = pos[depIdx];
            const t = pos[w.index];
            if (!f || !t) return null;
            const onC = cp.path.includes(w.index) && cp.path.includes(depIdx);
            const hl = hlWg === depIdx || hlWg === w.index;
            const op = hlWg !== null ? (hl ? 1 : 0.15) : 1;
            const fx = f.x + nw / 2, fy = f.y + nh;
            const tx = t.x + nw / 2, ty = t.y;
            const my = (fy + ty) / 2;
            return (
              <g key={`${depIdx}-${w.index}`} opacity={op} style={{ transition: "opacity .2s" }}>
                <path
                  d={`M${fx} ${fy}C${fx} ${my} ${tx} ${my} ${tx} ${ty}`}
                  fill="none"
                  stroke={onC ? "#D44A2E" : "#C4B5A2"}
                  strokeWidth={onC ? (hl ? 2.5 : 2) : (hl ? 1.5 : 1)}
                  strokeDasharray={onC ? undefined : "4 3"}
                />
                <polygon
                  points={`${tx - 3},${ty - 6} ${tx + 3},${ty - 6} ${tx},${ty - 1}`}
                  fill={onC ? "#D44A2E" : "#C4B5A2"}
                />
              </g>
            );
          })
        )}

        {/* Nodes */}
        {wgs.map((w) => {
          const p = pos[w.index];
          if (!p) return null;
          const tr = getTrade(w.trade);
          const onC = cp.path.includes(w.index);
          const hl = hlWg === w.index;
          const op = hlWg !== null ? (hl ? 1 : 0.3) : 1;
          return (
            <g
              key={w.index}
              style={{ cursor: "pointer", opacity: op, transition: "opacity .25s" }}
              onMouseEnter={() => onHover(w.index)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onClickNode(w.index)}
            >
              <rect
                x={p.x} y={p.y} width={nw} height={nh} rx={6}
                fill={hl ? "#EDFAF4" : "#fff"}
                stroke={onC ? "#D44A2E" : hl ? "#3D6B5E" : "#DDD7CC"}
                strokeWidth={onC || hl ? 1.5 : 0.75}
                style={{ transition: "all .2s" }}
              />
              <text
                x={p.x + 6} y={p.y + 14}
                fontFamily="Outfit, sans-serif" fontSize={10}
                fontWeight={700}
                fill={hl ? "#2B5248" : "#1A1814"}
              >
                {w.title.length > 12 ? w.title.slice(0, 11) + "…" : w.title}
              </text>
              <text
                x={p.x + 6} y={p.y + 26}
                fontFamily="'JetBrains Mono', monospace" fontSize={9}
                fontWeight={600} fill={tr.c}
              >
                {w.trade} · {w.totalDays}d
              </text>
              {onC && (
                <circle cx={p.x + nw - 8} cy={p.y + 8} r={3} fill="#D44A2E" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INTERACTIVE CANVAS GRAPH
// ═══════════════════════════════════════════════════════════

function InteractiveGraph({
  wgs, cp, hlWg, onHover, onClickNode, onAddDep,
}: {
  wgs: WgData[]; cp: CritPath; hlWg: number | null;
  onHover: (idx: number | null) => void;
  onClickNode: (idx: number) => void;
  onAddDep: (toIdx: number, fromIdx: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const nodesRef = useRef<Record<number, { x: number; y: number; pinned: boolean }>>({});
  const draggingRef = useRef<{ idx: number; offX: number; offY: number } | null>(null);
  const connectingRef = useRef<{ fromIdx: number; mx: number; my: number } | null>(null);
  const cascadeRef = useRef<Set<number>>(new Set());
  const ripplesRef = useRef<{ idx: number; t: number; col: string }[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const NW = 124, NH = 50;

  // Layout nodes on mount / when wgs change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    sizeRef.current = { w, h, dpr: window.devicePixelRatio || 1 };

    const levels = assignLevels(wgs);
    const maxLv = Math.max(...Object.values(levels), 0);
    const groups: Record<number, WgData[]> = {};
    wgs.forEach((wg) => {
      const l = levels[wg.index] || 0;
      if (!groups[l]) groups[l] = [];
      groups[l].push(wg);
    });

    const nd = nodesRef.current;
    for (let l = 0; l <= maxLv; l++) {
      const grp = groups[l] || [];
      const cols = grp.length;
      const tw = cols * NW + (cols - 1) * 24;
      const sx = (w - tw) / 2;
      grp.forEach((wg, ci) => {
        if (!nd[wg.index] || !nd[wg.index].pinned) {
          nd[wg.index] = { x: sx + ci * (NW + 24), y: 30 + l * (NH + 56), pinned: false };
        }
      });
    }
    // Clean removed nodes
    Object.keys(nd).forEach((k) => {
      if (!wgs.find((w) => w.index === Number(k))) delete nd[Number(k)];
    });
  }, [wgs]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      sizeRef.current = { w, h, dpr };
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      timeRef.current += 0.016;
      draw();
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  });

  function bz(t: number, a: number, b: number, c: number, d: number) {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    const time = timeRef.current;
    const nd = nodesRef.current;
    const cascade = cascadeRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#C4B5A2";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();

    // Edges + energy
    wgs.forEach((wg) => {
      wg.deps.forEach((depIdx) => {
        const f = nd[depIdx];
        const t = nd[wg.index];
        if (!f || !t) return;
        const onC = cp.path.includes(wg.index) && cp.path.includes(depIdx);
        const hl = hlWg === depIdx || hlWg === wg.index;
        const casc = cascade.has(wg.index) && cascade.has(depIdx);
        const op = hlWg !== null ? (hl || casc ? 0.85 : 0.06) : (casc ? 0.9 : 0.25);
        const fx = f.x + NW / 2, fy = f.y + NH, tx = t.x + NW / 2, ty = t.y;
        const my = (fy + ty) / 2;

        ctx.save();
        ctx.globalAlpha = op;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.bezierCurveTo(fx, my, tx, my, tx, ty);
        ctx.strokeStyle = onC ? "#D44A2E" : casc ? "#2D6DB5" : "#C4B5A2";
        ctx.lineWidth = onC ? 2.5 : (casc || hl ? 2 : 1);
        if (!onC && !casc) ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tx - 4, ty - 7);
        ctx.lineTo(tx + 4, ty - 7);
        ctx.lineTo(tx, ty - 1);
        ctx.closePath();
        ctx.fillStyle = onC ? "#D44A2E" : casc ? "#2D6DB5" : "#C4B5A2";
        ctx.fill();
        ctx.restore();

        // Energy streams
        if (onC || casc || hl) {
          const sp = onC ? 0.38 : 0.28;
          const ct = onC ? 4 : 2;
          for (let i = 0; i < ct; i++) {
            const ph = (time * sp + i / ct) % 1;
            for (let s = 0; s < 14; s++) {
              const tp = Math.max(0, ph - s * 0.004);
              const sx = bz(tp, fx, fx, tx, tx);
              const sy = bz(tp, fy, my, my, ty);
              const a = (1 - s / 14) * 0.85;
              const r = onC ? (3.5 - s * 0.2) : (2.5 - s * 0.14);
              if (r > 0.3) {
                ctx.save();
                ctx.globalAlpha = a * (hlWg !== null && !hl && !casc ? 0.1 : 0.7);
                if (s === 0) {
                  ctx.shadowColor = onC ? "rgba(212,74,46,.6)" : casc ? "rgba(45,109,181,.6)" : "rgba(61,107,94,.5)";
                  ctx.shadowBlur = 10;
                }
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(r, 0.5), 0, Math.PI * 2);
                ctx.fillStyle = onC ? "#D44A2E" : casc ? "#2D6DB5" : "#3D6B5E";
                ctx.fill();
                if (s === 0) {
                  ctx.shadowBlur = 0;
                  ctx.beginPath();
                  ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
                  ctx.fillStyle = "#fff";
                  ctx.fill();
                }
                ctx.restore();
              }
            }
          }
        }
      });
    });

    // Ripples
    ripplesRef.current = ripplesRef.current.filter((r) => r.t < 1);
    ripplesRef.current.forEach((r) => {
      r.t += 0.018;
      const n = nd[r.idx];
      if (!n) return;
      ctx.save();
      ctx.globalAlpha = (1 - r.t) * 0.35;
      ctx.beginPath();
      ctx.arc(n.x + NW / 2, n.y + NH / 2, r.t * 55, 0, Math.PI * 2);
      ctx.strokeStyle = r.col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    // Nodes
    wgs.forEach((wg) => {
      const n = nd[wg.index];
      if (!n) return;
      const tr = getTrade(wg.trade);
      const onC = cp.path.includes(wg.index);
      const hl = hlWg === wg.index;
      const casc = cascade.has(wg.index);
      const op = hlWg !== null ? (hl || casc ? 1 : 0.3) : 1;

      ctx.save();
      ctx.globalAlpha = op;
      if (hl) { ctx.shadowColor = tr.glow + "0.35)"; ctx.shadowBlur = 20; }
      else if (onC) { ctx.shadowColor = "rgba(212,74,46,.2)"; ctx.shadowBlur = 12; }

      ctx.beginPath();
      roundRect(ctx, n.x, n.y, NW, NH, 10);
      ctx.fillStyle = hl ? "#EDFAF4" : "#fff";
      ctx.fill();
      ctx.strokeStyle = onC ? "#D44A2E" : hl ? "#3D6B5E" : casc ? "#2D6DB5" : "#DDD7CC";
      ctx.lineWidth = onC || hl || casc ? 2 : 0.75;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Critical pulse
      if (onC) {
        const pulse = Math.sin(time * 3) * 0.25 + 0.75;
        ctx.save();
        ctx.globalAlpha = pulse * 0.12;
        ctx.beginPath();
        roundRect(ctx, n.x - 3, n.y - 3, NW + 6, NH + 6, 13);
        ctx.strokeStyle = "#D44A2E";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.font = "700 11px Outfit, sans-serif";
      ctx.fillStyle = "#1A1814";
      ctx.textBaseline = "middle";
      ctx.fillText(wg.title.length > 14 ? wg.title.slice(0, 13) + "…" : wg.title, n.x + 8, n.y + 16);
      ctx.font = "600 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = tr.c;
      ctx.fillText(`${tr.ico} ${wg.trade} · ${wg.totalDays}d`, n.x + 8, n.y + 30);

      // Progress bar
      const bx = n.x + 8, by = n.y + NH - 8, bw = NW - 16;
      ctx.beginPath();
      roundRect(ctx, bx, by, bw, 3, 2);
      ctx.fillStyle = "#ECEAE6";
      ctx.fill();
      const pct = cp.ends[wg.index] ? cp.ends[wg.index] / (cp.days || 1) : 0;
      ctx.beginPath();
      roundRect(ctx, bx, by, bw * pct, 3, 2);
      ctx.fillStyle = onC ? "#D44A2E" : tr.fill;
      ctx.fill();

      if (onC) {
        ctx.beginPath();
        ctx.arc(n.x + NW - 10, n.y + 10, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#D44A2E";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x + NW - 10, n.y + 10, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }

      // Connection point
      if (hl) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(n.x + NW / 2, n.y + NH + 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#3D6B5E";
        ctx.fill();
      }
      ctx.restore();
    });

    // Connecting line
    const conn = connectingRef.current;
    if (conn) {
      const fn = nd[conn.fromIdx];
      if (fn) {
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#3D6B5E";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(fn.x + NW / 2, fn.y + NH);
        ctx.lineTo(conn.mx, conn.my);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function hitTest(mx: number, my: number): number | null {
    const nd = nodesRef.current;
    for (let i = wgs.length - 1; i >= 0; i--) {
      const n = nd[wgs[i].index];
      if (n && mx >= n.x && mx <= n.x + NW && my >= n.y && my <= n.y + NH) {
        return wgs[i].index;
      }
    }
    return null;
  }

  function getDownstream(idx: number): Set<number> {
    const ds = new Set([idx]);
    let changed = true;
    while (changed) {
      changed = false;
      wgs.forEach((w) => {
        if (!ds.has(w.index) && w.deps.some((d) => ds.has(d))) {
          ds.add(w.index);
          changed = true;
        }
      });
    }
    return ds;
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitTest(mx, my);
    if (hit !== null) {
      const n = nodesRef.current[hit];
      if (my > n.y + NH - 14 && Math.abs(mx - (n.x + NW / 2)) < 20) {
        connectingRef.current = { fromIdx: hit, mx, my };
        return;
      }
      draggingRef.current = { idx: hit, offX: mx - n.x, offY: my - n.y };
      nodesRef.current[hit].pinned = true;
    }
  }, [wgs]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (draggingRef.current) {
      const { idx, offX, offY } = draggingRef.current;
      nodesRef.current[idx].x = mx - offX;
      nodesRef.current[idx].y = my - offY;
      return;
    }
    if (connectingRef.current) {
      connectingRef.current.mx = mx;
      connectingRef.current.my = my;
      return;
    }
    const hit = hitTest(mx, my);
    if (hit !== hlWg) onHover(hit);
  }, [wgs, hlWg, onHover]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (connectingRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit !== null && hit !== connectingRef.current.fromIdx) {
        onAddDep(hit, connectingRef.current.fromIdx);
        ripplesRef.current.push({ idx: connectingRef.current.fromIdx, t: 0, col: "#3D6B5E" });
        ripplesRef.current.push({ idx: hit, t: 0, col: "#3D6B5E" });
      }
      connectingRef.current = null;
    }
    draggingRef.current = null;
  }, [wgs, onAddDep]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit !== null) {
      const ds = getDownstream(hit);
      cascadeRef.current = ds;
      const tr = getTrade(wgs.find((w) => w.index === hit)?.trade || "Demo");
      ripplesRef.current.push({ idx: hit, t: 0, col: tr.fill });
      let delay = 0;
      ds.forEach((idx) => {
        if (idx !== hit) {
          setTimeout(() => {
            ripplesRef.current.push({ idx, t: 0, col: "#2D6DB5" });
          }, (delay += 120));
        }
      });
      setTimeout(() => { cascadeRef.current = new Set(); }, 3000);
    }
  }, [wgs]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ display: "block", cursor: "default" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════

function GraphFooterItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#8C7E6A", fontWeight: 600 }}>
      <div style={{ width: 7, height: 7, borderRadius: 4, background: color }} />
      {label}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,24,20,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: 20,
        width: 340, boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        {children}
      </div>
    </div>
  );
}

function EditWgModal({
  wg, onSave, onClose,
}: {
  wg: WgData; onSave: (title: string, trade: string) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(wg.title);
  const [trade, setTrade] = useState(wg.trade);
  const inputStyle: CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 7,
    border: "1.5px solid #ECEAE6", fontSize: 12,
    fontFamily: "'Outfit', sans-serif", outline: "none",
    background: "#FAF9F6",
  };
  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1814", marginBottom: 14 }}>Edit workgroup</div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#6B5F4F", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Name</div>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#6B5F4F", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Trade</div>
        <select style={{ ...inputStyle, cursor: "pointer" }} value={trade} onChange={(e) => setTrade(e.target.value)}>
          {Object.keys(TRADES).map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid #ECEAE6", background: "#fff", color: "#6B5F4F", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
        <button onClick={() => onSave(title, trade)} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Save</button>
      </div>
    </>
  );
}

function DepsModal({
  wg, allWgs, onToggle, onClose,
}: {
  wg: WgData; allWgs: WgData[];
  onToggle: (depIdx: number) => void; onClose: () => void;
}) {
  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1814", marginBottom: 3 }}>Dependencies: {wg.title}</div>
      <p style={{ fontSize: 10, color: "#8C7E6A", marginBottom: 12 }}>Select workgroups that must finish first</p>
      {allWgs.filter((w) => w.index !== wg.index).map((o) => {
        const checked = wg.deps.includes(o.index);
        const tr = getTrade(o.trade);
        return (
          <label key={o.index} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, cursor: "pointer", background: checked ? "#EDFAF4" : "transparent", marginBottom: 3 }}>
            <input type="checkbox" checked={checked} onChange={() => onToggle(o.index)} style={{ accentColor: "#3D6B5E", width: 14, height: 14 }} />
            <div style={{ width: 22, height: 22, borderRadius: 6, background: tr.bg, border: `1px solid ${tr.ring}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{tr.ico}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1814" }}>{o.title}</span>
          </label>
        );
      })}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Done</button>
      </div>
    </>
  );
}

function RefineModal({
  onApply, isLoading, onClose,
}: {
  onApply: (feedback: string) => void; isLoading: boolean; onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const suggestions = ["Add permits", "Split sites", "Add inspections", "Remove HVAC"];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span>✨</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#1A1814" }}>Refine with AI</span>
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="e.g. Add permit phase before rough-in..."
        rows={3}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 7,
          border: "1.5px solid #ECEAE6", fontSize: 12,
          fontFamily: "'Outfit', sans-serif", outline: "none",
          background: "#FAF9F6", resize: "vertical",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "10px 0 14px" }}>
        {suggestions.map((s) => (
          <span
            key={s}
            onClick={() => setFeedback(s)}
            style={{
              padding: "3px 10px", borderRadius: 12, fontSize: 10,
              fontWeight: 600, border: "1.5px solid #B5E2CC",
              color: "#2E7D5F", background: "#EDFAF4", cursor: "pointer",
            }}
          >
            {s}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: 8, border: "1.5px solid #ECEAE6", background: "#fff", color: "#6B5F4F", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
        <button
          onClick={() => onApply(feedback)}
          disabled={isLoading || !feedback.trim()}
          style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif", opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? "Applying..." : "✨ Apply"}
        </button>
      </div>
    </>
  );
}
