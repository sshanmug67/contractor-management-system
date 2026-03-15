/**
 * BudgetExpensesView — Budget & Expenses tab
 * File: routes/owner/components/BudgetExpensesView.tsx
 */
import { useState } from "react";
import { P, TI, DEFAULT_TRADE, BudgetBar, DollarI, fmt, fmtFull } from "./projectConstants";
import type { UIDashboard, UIJob } from "@/hooks/dashboardBridge";

/* ═══════════════════ NEW: BUDGET & EXPENSES VIEW ═══════════════════ */
export function BudgetExpensesView({ d }: { d: UIDashboard }) {
  const [filter, setFilter] = useState("all");

  // Collect all invoices from all jobs
  const allInvoices = d.allWg.flatMap((wg) => wg.jobs.filter((j: UIJob) => j.invoiced).map((j: UIJob) => ({
    id: j.id, site: wg.title, workgroup: wg.trade, jobTitle: j.title, contractor: wg.contractor,
    amount: j.invoiceAmount || 0, paid: j.paid, status: j.paid ? "paid" : "submitted",
    budget: j.budget, date: "Mar 2026",
  })));

  const filtered = filter === "all" ? allInvoices : allInvoices.filter((inv) => inv.status === filter);

  const statusBadge = (s: string) => {
    if (s === "paid") return { bg: P.done.grad, label: "Paid" };
    if (s === "submitted") return { bg: P.pending.grad, label: "Submitted" };
    if (s === "approved") return { bg: P.active.grad, label: "Approved" };
    return { bg: P.crit.grad, label: "Rejected" };
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {/* Summary stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Total Budget", v: fmtFull(d.totalBudget), c: "#1A1814", bg: "#fff" },
          { l: "Total Paid", v: fmtFull(d.totalSpent), c: P.done.fg, bg: P.done.bg },
          { l: "Invoiced (Pending)", v: fmtFull(d.totalInvoiced), c: P.pending.fg, bg: P.pending.bg },
          { l: "Remaining", v: fmtFull(d.totalBudget - d.totalSpent - d.totalInvoiced), c: "#8C7E6A", bg: "#FAF9F6" },
        ].map((s, i) => (
          <div key={s.l} style={{ padding: "14px 16px", borderRadius: 14, background: s.bg, border: "1.5px solid #F0EDE8", animation: `fu .28s ${i * 40}ms both` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.l}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[{ k: "all", l: "All" }, { k: "submitted", l: "Submitted" }, { k: "approved", l: "Approved" }, { k: "paid", l: "Paid" }, { k: "rejected", l: "Rejected" }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: filter === f.k ? 800 : 600, cursor: "pointer",
            border: filter === f.k ? "1.5px solid #3D6B5E" : "1.5px solid #ECEAE6",
            background: filter === f.k ? P.active.bg : "transparent", color: filter === f.k ? P.active.fg : "#8C7E6A",
          }}>{f.l}</button>
        ))}
      </div>

      {/* Invoice table */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid #F0EDE8", background: "#fff", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fff", borderBottom: "1px solid #ECEAE6" }}>
              {["#", "Site", "Workgroup", "Job", "Contractor", "Amount", "Budget", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: h === "Amount" || h === "Budget" ? "right" : h === "Status" ? "center" : "left", fontSize: 9, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9C8E7C", fontSize: 13 }}>No invoices match this filter</td></tr>
            )}
            {filtered.map((inv, i) => { const st = statusBadge(inv.status); return (
              <tr key={inv.id} style={{ borderTop: "1px solid #FAF9F6", animation: `fu .22s ${i * 30}ms both`, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fafbfc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                <td style={{ padding: "10px 12px", color: P.active.fg, fontWeight: 700 }}>INV-{String(i + 1).padStart(3, "0")}</td>
                <td style={{ padding: "10px 12px", color: "#1A1814" }}>{inv.site}</td>
                <td style={{ padding: "10px 12px", color: "#5C5043" }}>{inv.workgroup}</td>
                <td style={{ padding: "10px 12px", color: "#1A1814", fontWeight: 600 }}>{inv.jobTitle}</td>
                <td style={{ padding: "10px 12px", color: "#9C8E7C" }}>{inv.contractor}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 900, color: "#1A1814" }}>{fmtFull(inv.amount)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#9C8E7C" }}>{fmtFull(inv.budget)}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 9, fontWeight: 800, textTransform: "uppercase", background: st.bg, color: "#fff" }}>{st.label}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "#9C8E7C", fontSize: 12 }}>{inv.date}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>

      {/* Budget by workgroup */}
      <h3 style={{ fontSize: 13, fontWeight: 800, color: "#5C5043", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <DollarI size={14} color="#8C7E6A" />Budget by Workgroup
      </h3>
      <div style={{ borderRadius: 14, background: "#fff", border: "1.5px solid #F0EDE8", padding: "14px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {d.allWg.map((wg, i) => {
            const wgS = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            const wgI = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            const ti = TI[wg.trade] || DEFAULT_TRADE;
            return (
              <div key={wg.id} style={{ animation: `fu .22s ${i * 30 + 60}ms both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg }}>
                      <ti.Icon size={11} color={ti.c} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814" }}>{wg.title}</span>
                    <span style={{ fontSize: 12, color: "#9C8E7C" }}>— {fmt(wg.budget)} budget</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {wgS > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: P.done.fg }}>{fmt(wgS)} paid</span>}
                    {wgI > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: P.pending.fg }}>{fmt(wgI)} invoiced</span>}
                    {wgS === 0 && wgI === 0 && <span style={{ fontSize: 12, color: "#C4B5A2" }}>No spend</span>}
                  </div>
                </div>
                <BudgetBar spent={wgS} invoiced={wgI} total={wg.budget} h={7} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}