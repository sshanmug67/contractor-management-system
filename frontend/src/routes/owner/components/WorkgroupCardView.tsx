/**
 * WorkgroupCardView — "By Workgroup" table layout
 *
 * Flat view: each workgroup is a section header, followed by a
 * table of its jobs with columns showing worksite per-job.
 *
 * This is the data-dense alternative to the card-based "By Worksite"
 * view. Designed for scanning job locations across worksites quickly.
 *
 * File: routes/owner/components/WorkgroupCardView.tsx
 */

import { useState, useMemo } from "react";
import { P, SM, TI, DEFAULT_TRADE, Badge, CheckI, MapPinI, ArrI, fmt, fmtFull } from "./projectConstants";
import type { UIDashboard, UIWorkgroup, UIJob } from "@/hooks/dashboardBridge";

/* ── Table cell styles ── */
const TH: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#8C7E6A",
  textTransform: "uppercase", letterSpacing: "0.06em",
  padding: "8px 10px", textAlign: "left",
  borderBottom: "1.5px solid #ECEAE6", whiteSpace: "nowrap",
};
const TH_R: React.CSSProperties = { ...TH, textAlign: "right" };
const TD: React.CSSProperties = { fontSize: 13, padding: "9px 10px", borderBottom: "1px solid #F0EDE8", verticalAlign: "middle" };
const TD_R: React.CSSProperties = { ...TD, textAlign: "right" };
const TD_MONO: React.CSSProperties = { ...TD_R, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12 };

export function WorkgroupCardView({ onOpenDrawer, d }: { onOpenDrawer: (wg: UIWorkgroup) => void; d: UIDashboard }) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedWgs, setExpandedWgs] = useState<Set<string>>(new Set(d.allWg.map(w => w.id)));

  // Build wg → worksite name mapping from nesting
  const wgWorksiteMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ws of d.worksites) {
      for (const wg of ws.workgroups) map[wg.id] = ws.name;
    }
    return map;
  }, [d.worksites]);

  const allWorkgroups = d.allWg;
  const filtered = filterStatus === "all"
    ? allWorkgroups
    : allWorkgroups.filter(wg => wg.status === filterStatus);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: allWorkgroups.length };
    for (const wg of allWorkgroups) c[wg.status] = (c[wg.status] || 0) + 1;
    return c;
  }, [allWorkgroups]);

  const toggleWg = (id: string) => {
    setExpandedWgs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedWgs(new Set(filtered.map(w => w.id)));
  const collapseAll = () => setExpandedWgs(new Set());

  const shortSite = (wsName: string) => {
    if (!wsName || wsName === "Project Tasks") return null;
    const comma = wsName.indexOf(",");
    return comma > 0 ? wsName.substring(0, comma).trim() : wsName;
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>

      {/* ── Header ── */}
      <div style={{ padding: "6px 2px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#5C5043", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          All Workgroups
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#9C8E7C" }}>
            {filtered.length} workgroups · {filtered.flatMap(w => w.jobs).length} jobs
          </span>
          <button onClick={expandAll} style={{ fontSize: 11, color: "#3D6B5E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Expand all</button>
          <span style={{ color: "#DDD7CC" }}>|</span>
          <button onClick={collapseAll} style={{ fontSize: 11, color: "#3D6B5E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Collapse</button>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "in_progress", label: "Active" },
          { key: "pending", label: "Pending" },
          { key: "draft", label: "Draft" },
          { key: "complete", label: "Complete" },
        ].filter(f => (statusCounts[f.key] || 0) > 0 || f.key === "all").map(f => {
          const isActive = filterStatus === f.key;
          return (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${isActive ? "#3D6B5E" : "#DDD7CC"}`,
                background: isActive ? "rgba(61,107,94,0.08)" : "#fff",
                color: isActive ? "#3D6B5E" : "#8C7E6A",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all .15s",
              }}>
              {f.label} <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, marginLeft: 3, opacity: 0.7 }}>{statusCounts[f.key] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* ── Workgroup sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((wg, wgi) => {
          const ti = TI[wg.trade] || DEFAULT_TRADE;
          const TradeIcon = ti.Icon;
          const sm = SM[wg.status] || SM.draft;
          const isExpanded = expandedWgs.has(wg.id);
          const dn = wg.jobs.filter(j => j.status === "complete").length;
          const wgPaid = wg.jobs.filter(j => j.paid).reduce((a, j) => a + (j.invoiceAmount || 0), 0);
          const wgInvoiced = wg.jobs.filter(j => j.invoiced && !j.paid).reduce((a, j) => a + (j.invoiceAmount || 0), 0);
          const wsName = wgWorksiteMap[wg.id] || "";
          const isProjectLevel = wsName === "Project Tasks" || !wsName;
          const totalDays = wg.jobs.reduce((a, j) => a + j.durationDays, 0);

          return (
            <div key={wg.id} style={{
              borderRadius: 12, border: "1.5px solid #DDD7CC", background: "#fff",
              overflow: "hidden", animation: `si .28s ${wgi * 40}ms both`,
            }}>

              {/* ── Workgroup Header Row — single line, 3 sections ── */}
              <div onClick={() => toggleWg(wg.id)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  background: isExpanded ? "#FAFAF8" : "#fff",
                  transition: "background .15s",
                }}>
                {/* Chevron */}
                <span style={{
                  fontSize: 11, color: "#9C8E7C", fontWeight: 800,
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .2s", display: "inline-block", width: 14, textAlign: "center", flexShrink: 0,
                }}>▸</span>

                {/* Trade icon */}
                <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}>
                  <TradeIcon size={16} color={ti.c} />
                </div>

                {/* Section 1: Workgroup name + badge (~1/3 width, wraps) */}
                <div style={{ width: "28%", minWidth: 120, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1814", lineHeight: 1.3 }}>{wg.title}</span>
                    <Badge status={wg.status} />
                  </div>
                </div>

                {/* Separator */}
                <div style={{ width: 1, alignSelf: "stretch", background: "#ECEAE6", flexShrink: 0 }} />

                {/* Section 2: Contractor — labeled vertical block */}
                <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0, paddingTop: 1 }}>Contractor:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1814" }}>{wg.contractor}</span>
                      {(wg as any).contractorAddress && (
                        <span style={{ fontSize: 11, color: "#8C7E6A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(wg as any).contractorAddress}</span>
                      )}
                      {(wg as any).contractorPhone && (
                        <span style={{ fontSize: 11, color: "#8C7E6A" }}>{(wg as any).contractorPhone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div style={{ width: 1, alignSelf: "stretch", background: "#ECEAE6", flexShrink: 0 }} />

                {/* Section 3: Summary stats + details button */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  {[
                    { v: `${dn}/${wg.jobs.length}`, l: "Jobs", c: sm.p.fg },
                    { v: fmt(wg.budget), l: "Budget", c: "#1A1814" },
                    { v: fmt(wgPaid), l: "Paid", c: "#2E7D5F" },
                    { v: fmt(wgInvoiced), l: "Invoiced", c: "#C08A1A" },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: "center" as const }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "#9C8E7C", textTransform: "uppercase" }}>{s.l}</div>
                    </div>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); onOpenDrawer(wg); }}
                    style={{
                      padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      border: "1.5px solid #DDD7CC", background: "#fff",
                      color: "#3D6B5E", cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3D6B5E"; e.currentTarget.style.background = "rgba(61,107,94,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#DDD7CC"; e.currentTarget.style.background = "#fff"; }}
                  >Details →</button>
                </div>
              </div>

              {/* Dependencies banner */}
              {wg.dependsOnIds.length > 0 && (
                <div style={{ padding: "6px 16px 6px 56px", background: P.pending.bg, borderTop: `1px solid ${P.pending.ring}`, display: "flex", alignItems: "center", gap: 5 }}>
                  <ArrI size={11} color={P.pending.fg} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: P.pending.fg }}>
                    Blocked by {wg.dependsOnIds.map(id => d.allWg.find(w => w.id === id)?.title || "unknown").join(", ")}
                  </span>
                </div>
              )}

              {/* ── Job Table ── */}
              {isExpanded && wg.jobs.length > 0 && (
                <div style={{ borderTop: "1.5px solid #ECEAE6" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ ...TH, width: 36, textAlign: "center" }}>#</th>
                        <th style={{ ...TH, paddingLeft: 0 }}>Job</th>
                        <th style={{ ...TH, width: 90 }}>Status</th>
                        <th style={TH}>Worksite</th>
                        <th style={TH}>Technician</th>
                        <th style={{ ...TH_R, width: 80 }}>Budget</th>
                        <th style={{ ...TH_R, width: 80 }}>Paid</th>
                        <th style={{ ...TH_R, width: 60 }}>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wg.jobs.map((job, ji) => {
                        const isDone = job.status === "complete";
                        const isAct = job.status === "in_progress";
                        const isPaid = job.paid;
                        const isInv = job.invoiced && !job.paid;
                        const jobSiteName = wsName;
                        const jobIsProjectLevel = !jobSiteName || jobSiteName === "Project Tasks";
                        const jobSiteShort = shortSite(jobSiteName);

                        return (
                          <tr key={job.id} style={{
                            background: isAct ? "#F8FBFF" : ji % 2 === 1 ? "#FAFAF8" : "#fff",
                            transition: "background .1s",
                          }}
                            onMouseEnter={e => { if (!isAct) e.currentTarget.style.background = "#F5F3EF"; }}
                            onMouseLeave={e => { if (!isAct) e.currentTarget.style.background = ji % 2 === 1 ? "#FAFAF8" : "#fff"; }}
                          >
                            <td style={{ ...TD, textAlign: "center", color: "#B5A99A", fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{job.sequence}</td>
                            <td style={{ ...TD, paddingLeft: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                {isDone
                                  ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckI size={8} color="#fff" sw={3} /></div>
                                  : isAct
                                    ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.active.grad, flexShrink: 0, boxShadow: "0 0 0 2px rgba(45,109,181,0.12)" }} />
                                    : <div style={{ width: 16, height: 16, borderRadius: 8, border: "1.5px solid #C4B5A2", background: "#fff", flexShrink: 0 }} />
                                }
                                <span style={{
                                  fontSize: 13, fontWeight: isDone ? 500 : 600,
                                  color: isDone ? "#9C8E7C" : "#1A1814",
                                  textDecoration: isDone ? "line-through" : "none",
                                }}>{job.title}</span>
                              </div>
                            </td>
                            <td style={TD}>
                              {isPaid ? <span style={{ fontSize: 11, fontWeight: 600, color: "#2E7D5F", padding: "2px 8px", borderRadius: 5, background: "#EDFAF4" }}>Paid</span>
                                : isInv ? <span style={{ fontSize: 11, fontWeight: 600, color: "#C07B1A", padding: "2px 8px", borderRadius: 5, background: "#FFF8EE" }}>Invoiced</span>
                                : isDone ? <span style={{ fontSize: 11, fontWeight: 600, color: "#2E7D5F", padding: "2px 8px", borderRadius: 5, background: "#EDFAF4" }}>Done</span>
                                : isAct ? <span style={{ fontSize: 11, fontWeight: 600, color: "#2D6DB5", padding: "2px 8px", borderRadius: 5, background: "#EEF4FB" }}>Active</span>
                                : <span style={{ fontSize: 11, fontWeight: 600, color: "#9C8E7C", padding: "2px 8px", borderRadius: 5, background: "#F0EDE8" }}>Queued</span>
                              }
                            </td>
                            <td style={TD}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                                background: jobIsProjectLevel ? "#F0EDE8" : "#EDF5F1",
                                color: jobIsProjectLevel ? "#8C7E6A" : "#2B5248",
                              }}>
                                <MapPinI size={9} color={jobIsProjectLevel ? "#9C8E7C" : "#3D6B5E"} />
                                {jobIsProjectLevel ? "No site" : jobSiteShort || jobSiteName}
                              </span>
                            </td>
                            {/* Technician — BRIDGE: from worker check-in data when available */}
                            <td style={TD}>
                              {(() => {
                                const workerName = (job as any).workerName || (job as any).worker_name;
                                return workerName ? (
                                  <span style={{ fontSize: 12, color: "#5C5043", fontWeight: 500 }}>{workerName}</span>
                                ) : (isDone || isAct) ? (
                                  <span style={{ fontSize: 11, color: "#B5A99A", fontStyle: "italic" }}>On site</span>
                                ) : (
                                  <span style={{ fontSize: 11, color: "#C4B5A2" }}>—</span>
                                );
                              })()}
                            </td>
                            <td style={TD_MONO}><span style={{ color: "#1A1814" }}>{fmt(job.budget)}</span></td>
                            <td style={TD_MONO}>
                              {isPaid ? <span style={{ color: "#2E7D5F" }}>{fmt(job.invoiceAmount || 0)}</span>
                                : isInv ? <span style={{ color: "#C08A1A" }}>{fmt(job.invoiceAmount || 0)}</span>
                                : <span style={{ color: "#C4B5A2" }}>—</span>
                              }
                            </td>
                            <td style={{ ...TD_R, fontSize: 12, color: "#8C7E6A" }}>{job.durationDays}d</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1.5px solid #ECEAE6" }}>
                        <td colSpan={5} style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#6B5F4F" }}>
                          {wg.jobs.length} jobs · {dn} complete · {totalDays} days
                          {wg.startDate && <span style={{ color: "#9C8E7C", fontWeight: 500 }}>
                            {" · "}{new Date(wg.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {wg.endDate ? new Date(wg.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                          </span>}
                        </td>
                        <td style={{ ...TD_MONO, fontWeight: 800, borderBottom: "none" }}>{fmt(wg.budget)}</td>
                        <td style={{ ...TD_MONO, fontWeight: 800, color: "#2E7D5F", borderBottom: "none" }}>{fmt(wgPaid)}</td>
                        <td style={{ ...TD_R, fontSize: 12, fontWeight: 700, color: "#6B5F4F", borderBottom: "none" }}>{totalDays}d</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {!isExpanded && wg.jobs.length > 0 && (
                <div style={{ padding: "6px 16px 6px 56px", borderTop: "1px solid #F0EDE8", fontSize: 12, color: "#9C8E7C" }}>
                  {wg.jobs.length} jobs · {dn} complete · {totalDays} days · Click to expand
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontSize: 14, color: "#9C8E7C" }}>No workgroups match this filter.</p>
        </div>
      )}
    </div>
  );
}
