/**
 * WorkgroupDrawer — Slide-out detail panel
 * File: routes/owner/components/WorkgroupDrawer.tsx
 */
import { useRef } from "react";
import { P, SM, TI, DEFAULT_TRADE, Badge, BudgetBar, CheckI, ArrI, XI, fmt, fmtFull, type IP } from "./projectConstants";
import type { UIWorkgroup, UIJob } from "@/hooks/dashboardBridge";

/* ═══════════════════ WORKGROUP DRAWER (unchanged from original) ═══════════════════ */
export function WorkgroupDrawer({ wg, allWg, onClose }: { wg: UIWorkgroup; allWg: UIWorkgroup[]; onClose: () => void }) {
  const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon; const sm = SM[wg.status] || SM.draft;
  const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length, pc = wg.jobs.length > 0 ? Math.round((dn / wg.jobs.length) * 100) : 0;
  const spent = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
  const invoiced = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} onClick={(e) => { if (e.target === ref.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", animation: "fadeIn .15s ease both" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.28)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: "40%", minWidth: 500, height: "100%", background: "#fff", boxShadow: "-8px 0 36px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", animation: "drawerIn .28s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ flexShrink: 0, background: sm.p.grad, padding: "14px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.22)" }}><TradeIcon size={20} color="#fff" /></div>
              <div><span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{wg.title}</span><p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{wg.contractor}</p></div>
            </div>
            <button onClick={onClose} style={{ padding: 5, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", cursor: "pointer" }}><XI size={14} color="#fff" /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, transform: "translateY(14px)" }}>
            {[{ l: "Budget", v: fmt(wg.budget), bg: "#fff" }, { l: "Paid", v: fmt(spent), bg: "#ecfdf5" }, { l: "Invoiced", v: fmt(invoiced), bg: "#fffbeb" }].map((x) => (
              <div key={x.l} style={{ padding: "8px 6px", borderRadius: 10, textAlign: "center" as const, background: x.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: "#1A1814" }}>{x.v}</p>
                <p style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8C7E6A" }}>{x.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "22px 16px 8px" }}>
          <BudgetBar spent={spent} invoiced={invoiced} total={wg.budget} h={6} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <div style={{ display: "flex", gap: 8 }}>{[{ l: "Paid", g: P.done.grad }, { l: "Invoiced", g: P.pending.grad }, { l: "Remaining", g: "#ECEAE6" }].map((x) => <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, color: "#8C7E6A" }}><span style={{ width: 7, height: 7, borderRadius: 4, background: x.g }} />{x.l}</span>)}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: sm.p.fg }}>{pc}% complete</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          <h3 style={{ fontSize: 9, fontWeight: 900, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Jobs ({dn}/{wg.jobs.length} complete)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {wg.jobs.map((job: UIJob, ji: number) => { const jSm = SM[job.status] || SM.ns; return (
              <div key={job.id} style={{ borderRadius: 12, border: `1.5px solid ${job.status === "in_progress" ? P.active.ring : "#F0EDE8"}`, overflow: "hidden", animation: `scaleIn .22s ${ji * 35}ms both`, background: jSm.p.bg }}>
                <div style={{ padding: "9px 11px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ marginTop: 1, flexShrink: 0 }}>
                      {job.status === "complete" ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckI size={9} color="#fff" sw={3} /></div>
                        : job.status === "in_progress" ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.active.grad, animation: "pg 2s ease-in-out infinite" }} />
                        : <div style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid #C4B5A2", background: "#fff" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: job.status === "complete" ? "#9C8E7C" : "#1A1814", textDecoration: job.status === "complete" ? "line-through" : "none" }}>{job.title}</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#1A1814" }}>{fmt(job.budget)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <Badge status={job.status} /><span style={{ fontSize: 9, color: "#9C8E7C", fontWeight: 600 }}>{job.durationDays}d · Seq #{job.sequence}</span>
                        <span style={{ marginLeft: "auto" }}>
                          {job.invoiced ? <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: job.paid ? P.done.grad : P.pending.grad, color: "#fff" }}>{job.paid ? "Paid" : "Invoiced"} {fmt(job.invoiceAmount || 0)}</span>
                            : job.status === "complete" ? <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: P.crit.grad, color: "#fff" }}>No invoice</span>
                            : <span style={{ fontSize: 9, color: "#C4B5A2" }}>—</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {job.status === "in_progress" && <div style={{ height: 2, background: P.active.ring }}><div style={{ height: "100%", background: P.active.grad, backgroundSize: "200% 100%", animation: "sh 1.8s infinite" }} /></div>}
              </div>
            ); })}
          </div>
          {wg.dependsOnIds.length > 0 && <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 10, background: P.pending.bg, border: `1.5px solid ${P.pending.ring}`, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrI size={12} color={P.pending.fg} /><span style={{ fontSize: 10, fontWeight: 700, color: P.pending.fg }}>Blocked by {wg.dependsOnIds.map(id => allWg.find((w) => w.id === id)?.title || "unknown").join(", ")}</span>
          </div>}
        </div>
      </div>
    </div>
  );
}