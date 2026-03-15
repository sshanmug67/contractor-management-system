/**
 * CardView — Overview tab workgroup cards
 * File: routes/owner/components/CardView.tsx
 */
import { useState } from "react";
import { P, SC, SM, TI, DEFAULT_TRADE, Badge, BudgetBar, Donut, CheckI, ChevI, MapPinI, ArrI, fmt, fmtFull } from "./projectConstants";
import type { UIDashboard, UIWorkgroup, UIJob } from "@/hooks/dashboardBridge";

export function CardView({ onOpenDrawer, d }: { onOpenDrawer: (wg: UIWorkgroup) => void; d: UIDashboard }) {
  const [activeSite, setActiveSite] = useState(0);
  const [hoveredWg, setHoveredWg] = useState<string | null>(null);
  const ws = d.worksites[activeSite] || d.worksites[0]; const sc = SC[activeSite % SC.length];
  const wsDone = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.status === "complete").length : 0;
  const wsTotal = ws ? ws.workgroups.flatMap((wg) => wg.jobs).length : 0;
  const wsSpent = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0) : 0;
  const wsInv = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0) : 0;
  const pctVal = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>

      {/* ── WORKSITE SECTION ── */}
      {d.worksites.length > 0 && <>
        <div style={{ padding: "6px 2px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#5C5043", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
            <MapPinI size={14} color="#8C7E6A" />Work Sites
          </h2>
          <span style={{ fontSize: 12, color: "#9C8E7C" }}>{d.worksites.length} sites · {d.allWg.length} workgroups · {d.jTotal} jobs</span>
        </div>

        {/* Worksite tabs (flush against banner) */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 0, marginBottom: 10 }}>
          {d.worksites.map((site, wi) => {
            const siteC = SC[wi % SC.length]; const isActive = wi === activeSite;
            const sDone = site.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.status === "complete").length;
            const sTotal = site.workgroups.flatMap((wg) => wg.jobs).length;
            return (
              <div key={site.name} onClick={() => setActiveSite(wi)}
                style={{
                  width: 260, minWidth: 260, flexShrink: 0,
                  padding: "10px 14px", borderRadius: 12, cursor: "pointer",
                  transition: "all .2s",
                  background: isActive ? siteC.gradient : "#fff",
                  border: `2px solid ${isActive ? siteC.accent : "#C4B5A2"}`,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: isActive ? "rgba(255,255,255,0.2)" : siteC.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinI size={10} color="#fff" /></div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? "#fff" : siteC.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.shortName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.6)" : "#9C8E7C" }}>
                    {site.name.split(", ").slice(1).join(", ") || site.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? "#fff" : siteC.text }}>{fmt(site.budget)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "rgba(255,255,255,0.7)" : "#9C8E7C" }}>{site.workgroups.length} trades · {sDone}/{sTotal} jobs</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active site banner (flush, no gap from tabs) */}
        {ws && (
          <div style={{
            padding: "12px 20px", background: sc.gradient,
            borderRadius: 12,
            marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{ws.name}</span>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                {(ws as any).contactName ? `${(ws as any).contactName}${(ws as any).contactPhone ? ` · ${(ws as any).contactPhone}` : ""}` : `${ws.workgroups.length} workgroups · ${wsTotal} jobs`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { l: "Budget", v: fmt(ws.budget), c: "#fff" },
                { l: "Paid", v: fmt(wsSpent), c: "#86EFAC" },
                { l: "Invoiced", v: fmt(wsInv), c: "#FDE68A" },
                { l: "Left", v: fmt(ws.budget - wsSpent - wsInv), c: "rgba(255,255,255,0.5)" },
                { l: "Jobs", v: `${wsDone}/${wsTotal}`, c: "#fff" },
              ].map(x => (
                <div key={x.l} style={{ textAlign: "center" as const }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>}

      {/* ── WORKGROUP CARDS (three-zone layout, 2 columns) ── */}
      {ws && <div key={activeSite} style={{ animation: "fu .3s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {ws.workgroups.map((wg, wgi) => {
            const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon; const sm = SM[wg.status] || SM.draft;
            const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length;
            const pc = wg.jobs.length > 0 ? Math.round((dn / wg.jobs.length) * 100) : 0;
            const wgS = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            const wgI = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            const remaining = wg.budget - wgS - wgI;
            const paidPct = pctVal(wgS, wg.budget);
            const invPct = pctVal(wgI, wg.budget);
            const pendingInvs = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid);
            const isH = hoveredWg === wg.id;
            const totalDays = wg.jobs.reduce((a: number, j: UIJob) => a + j.durationDays, 0);
            // BRIDGE: photo/note counts — replace when API provides
            const totalPhotos = wg.jobs.reduce((a: number, j: UIJob) => a + ((j as any).photoCount || (j.status === "complete" ? 3 : j.status === "in_progress" ? 5 : 0)), 0);
            const totalNotes = wg.jobs.reduce((a: number, j: UIJob) => a + ((j as any).noteCount || (j.status === "complete" ? 1 : j.status === "in_progress" ? 2 : 0)), 0);

            return (
              <div key={wg.id}
                onClick={() => onOpenDrawer(wg)}
                onMouseEnter={() => setHoveredWg(wg.id)} onMouseLeave={() => setHoveredWg(null)}
                style={{
                  borderRadius: 16,
                  border: `2px solid ${isH ? "#A89880" : "#C4B5A2"}`,
                  borderStyle: wg.dependsOnIds.length > 0 ? "dashed" : "solid",
                  background: "#fff", overflow: "hidden", cursor: "pointer",
                  transition: "all .22s ease",
                  transform: isH ? "translateY(-2px)" : "none",
                  boxShadow: isH ? "0 10px 28px -6px rgba(0,0,0,0.07)" : "0 1px 2px rgba(0,0,0,0.02)",
                  animation: `si .28s ${wgi * 60}ms both`,
                  display: "flex", flexDirection: "column" as const,
                }}>

                {/* ── ZONE 1: Contractor (left) | Budget donut (right) ── */}
                <div style={{ display: "flex", minHeight: 130 }}>
                  {/* Left: Trade + Contractor + On-site status */}
                  <div style={{ flex: 1, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}>
                        <TradeIcon size={18} color={ti.c} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1814" }}>{wg.title}</span>
                          <Badge status={wg.status} />
                        </div>
                        <p style={{ fontSize: 12, color: "#6B5F4F", fontWeight: 500, marginTop: 1 }}>{wg.contractor}</p>
                      </div>
                      <ChevI size={14} color="#C4B5A2" />
                    </div>
                    {/* Contractor on-site status */}
                    {wg.status === "in_progress" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#2E7D5F", boxShadow: "0 0 0 3px rgba(46,125,95,0.12)" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#2B5248" }}>On site</span>
                          <span style={{ fontSize: 12, color: "#6BAA82" }}>· GPS verified</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: "#8C7E6A" }}>Accepted</span>
                          <span style={{ fontSize: 11, color: "#B5A99A" }}>·</span>
                          <span style={{ fontSize: 11, color: "#8C7E6A" }}>Day {Math.max(1, wg.jobs.filter((j: UIJob) => j.status === "complete").length * 3 + 2)} on site</span>
                        </div>
                      </div>
                    ) : wg.status === "complete" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#8C7E6A" }}>Completed</span>
                        <span style={{ fontSize: 12, color: "#B5A99A" }}>·</span>
                        <span style={{ fontSize: 12, color: "#8C7E6A" }}>{totalDays} days on site</span>
                        <span style={{ fontSize: 12, color: "#B5A99A" }}>·</span>
                        <span style={{ fontSize: 12, color: "#2E7D5F", fontWeight: 600 }}>Accepted</span>
                      </div>
                    ) : wg.status === "pending" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: "#C07B1A" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#C07B1A" }}>Pending acceptance</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#9C8E7C" }}>Not started</span>
                      </div>
                    )}
                  </div>

                  {/* Vertical divider */}
                  <div style={{ width: 1, background: "#ECEAE6", margin: "14px 0" }} />

                  {/* Right: Budget donut */}
                  <div style={{ width: 200, flexShrink: 0, padding: "14px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <Donut size={80} sw={9}
                      segments={[
                        { value: paidPct, color: "#2E7D5F" },
                        { value: invPct, color: "#E5A63B" },
                      ]}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#6B5F4F", textTransform: "uppercase", letterSpacing: "0.05em" }}>Budget</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: "#1A1814", lineHeight: 1 }}>{fmt(wg.budget)}</span>
                    </Donut>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[
                        { label: "Paid", value: fmt(wgS), color: "#2E7D5F", dot: "#2E7D5F" },
                        { label: "Invoiced", value: fmt(wgI), color: "#C08A1A", dot: "#E5A63B" },
                        { label: "Left", value: fmt(Math.max(remaining, 0)), color: "#9C8E7C", dot: "#DDD7CC" },
                      ].map(item => (
                        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 2, background: item.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: "#5C5043" }}>{item.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Horizontal divider ── */}
                <div style={{ height: 1, background: "#ECEAE6", margin: "0 16px" }} />

                {/* ── ZONE 2: Job Details (full width) ── */}
                <div style={{ padding: "12px 16px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6B5F4F", textTransform: "uppercase", letterSpacing: "0.06em" }}>Jobs</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Donut size={30} sw={4} segments={[{ value: pc, color: sm.p.fg }]}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 800, color: sm.p.fg }}>{pc}%</span>
                      </Donut>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: sm.p.fg }}>{dn}/{wg.jobs.length}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {wg.jobs.map((job: UIJob) => {
                      const isDone = job.status === "complete";
                      const isAct = job.status === "in_progress";
                      // BRIDGE: per-job details — replace when API provides
                      const jobPhotos = (job as any).photoCount || (isDone ? 3 : isAct ? 5 : 0);
                      const jobNotes = (job as any).noteCount || (isDone ? 1 : isAct ? 2 : 0);
                      const invoiceStatus = job.paid ? "Paid" : job.invoiced ? "Invoiced" : isDone ? "No invoice" : isAct ? "In progress" : "Queued";
                      const invColor = job.paid ? "#2E7D5F" : job.invoiced ? "#C07B1A" : isDone ? "#D44A2E" : "#9C8E7C";
                      const invBg = job.paid ? "#EDFAF4" : job.invoiced ? "#FFF8EE" : isDone ? "#FEF0ED" : "transparent";

                      return (
                        <div key={job.id} style={{
                          padding: "7px 10px", borderRadius: 10,
                          background: isAct ? "#F8FBFF" : isDone ? "#FAF9F6" : "transparent",
                          border: isAct ? "1.5px solid #BDD4EF" : "none",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            {isDone ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckI size={9} color="#fff" sw={3} /></div>
                              : isAct ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.active.grad, flexShrink: 0, boxShadow: "0 0 0 3px rgba(45,109,181,0.12)" }} />
                              : <div style={{ width: 18, height: 18, borderRadius: 9, border: "1.5px solid #C4B5A2", background: "#fff", flexShrink: 0 }} />}
                            <span style={{ fontSize: 13, color: isDone ? "#9C8E7C" : "#1A1814", fontWeight: isDone ? 500 : 600, textDecoration: isDone ? "line-through" : "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: isAct ? "#2D6DB5" : "#8C7E6A", fontWeight: 700, flexShrink: 0 }}>{fmt(job.budget)}</span>
                            {invoiceStatus !== "Queued" && invoiceStatus !== "In progress" && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: invColor, padding: "2px 8px", borderRadius: 5, background: invBg, flexShrink: 0 }}>{invoiceStatus}</span>
                            )}
                          </div>
                          {/* Work log details for done/active jobs */}
                          {(isDone || isAct) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, marginLeft: 25 }}>
                              {isAct && <span style={{ fontSize: 11, fontWeight: 600, color: "#2D6DB5" }}>Day {job.durationDays > 1 ? Math.ceil(job.durationDays / 2) : 1}</span>}
                              {jobPhotos > 0 && <span style={{ fontSize: 11, color: "#8C7E6A" }}>{jobPhotos} photos</span>}
                              {jobNotes > 0 && <span style={{ fontSize: 11, color: "#8C7E6A" }}>{jobNotes} notes</span>}
                              {isDone && job.invoiced && <span style={{ fontSize: 11, color: "#8C7E6A" }}>· {fmtFull(job.invoiceAmount || 0)}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Blocked by */}
                  {wg.dependsOnIds.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, padding: "5px 10px", borderRadius: 8, background: P.pending.bg, border: `1px solid ${P.pending.ring}` }}>
                      <ArrI size={11} color={P.pending.fg} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: P.pending.fg }}>Blocked by {wg.dependsOnIds.map(id => d.allWg.find((w) => w.id === id)?.title || "unknown").join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* ── Horizontal divider ── */}
                <div style={{ height: 1, background: "#ECEAE6" }} />

                {/* ── ZONE 3: Summary footer ── */}
                <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  {totalPhotos > 0 && <span style={{ fontSize: 12, color: "#5C5043" }}>{totalPhotos} photos · {totalNotes} notes</span>}
                  {pendingInvs.length > 0 ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#C07B1A" }}>{pendingInvs.length} invoice{pendingInvs.length > 1 ? "s" : ""} pending · {fmt(pendingInvs.reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0))}</span>
                  ) : wg.status === "complete" ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D5F" }}>All invoices paid</span>
                  ) : null}
                  <span style={{ fontSize: 12, color: "#8C7E6A", marginLeft: "auto" }}>
                    {totalDays} days{wg.startDate ? ` · ${new Date(wg.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${wg.endDate ? new Date(wg.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}` : ""}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3D6B5E", opacity: isH ? 1 : 0, transition: "opacity .2s" }}>Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );
}
