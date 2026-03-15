/**
 * ProjectOutlook — Overview sidebar (uses UIDashboard, hardcoded insights)
 * File: routes/owner/components/ProjectOutlook.tsx
 */
import { P, SC, SM, CheckI, ClockI, AlertCI, AlertTI, SparkI, RadioI, UsersI, MapPinI } from "./projectConstants";
import type { UIDashboard } from "@/hooks/dashboardBridge";

export function ProjectOutlook({ d }: { d: UIDashboard }) {
  return (
    <div style={{ width: 390, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "#fff", borderLeft: "1.5px solid #ECEAE6" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #ECEAE6", background: "#fff" }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>Project Outlook</h2>
      </div>
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

