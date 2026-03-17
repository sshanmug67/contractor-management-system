import { useState, useEffect, type SVGProps, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardPortfolio, type UIProject, type UIPendingInvoice, type UIInsight, type UIActivity, type UIStats } from "@/hooks/useDashboardPortfolio";

/* ═══════════════════════════════════════════════════════════════
   OWNER DASHBOARD — Redesigned
   ═══════════════════════════════════════════════════════════════
   Design: Warm light theme, "Executive Briefing" layout
   Typography: Outfit (display) + JetBrains Mono (numbers)
   Layout: KPI strip → 2-col project grid + right sidebar

   TODO (API changes needed for full functionality):
   ──────────────────────────────────────────────────
   Per-project fields to add to UIProject / backend:
     - contractValue: number        (contract value from client)
     - invoicedToClient: number     (total invoiced TO client)
     - receivedFromClient: number   (total received FROM client)
     - paidToContractors: number    (total paid TO contractors)
     - contractorCosts: number      (total contractor cost estimates)
     - worksites: number            (number of worksites)
     - activeContractors: number    (active contractor count)
     - changeOrders: number         (change order count)
     - openIssues: number           (open issues/punch list)
     - originalMargin: number       (original estimated margin %)
     - currentMargin: number        (current projected margin %)
     - forecastEnd: string | null   (forecast completion date)
     - scheduleStatus: "ontrack" | "delayed" | "critical"
     - delayDays: number            (days behind schedule)
     - nextMilestone: string | null (next upcoming milestone)
     - riskFlag: string | null      (top risk alert text)
     - pendingContractorInvoices: { contractor: string; amount: number }[]

   Portfolio-level fields to add to UIStats:
     - totalContractValue: number
     - totalInvoicedToClients: number
     - totalReceivedFromClients: number
     - totalContractorCosts: number
     - totalPaidToContractors: number
     - onSchedule: number
     - delayed: number
     - critical: number
     - projectsAtRisk: number

   Until those API fields exist, the code below maps from
   existing fields with sensible fallbacks marked with
   "// BRIDGE:" comments. Replace these once the API is updated.
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════ STYLES ═══════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideR{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleUp{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes gradMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.07);border-radius:10px}
`;

/* ═══════════════════ HELPERS ═══════════════════ */
const fmt = (n: number): string => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n}`;
};
const fmtFull = (n: number): string => `$${n.toLocaleString()}`;
const pct = (a: number, b: number): number => b > 0 ? Math.round((a / b) * 100) : 0;

/* ═══════════════════ DONUT COMPONENT ═══════════════════ */
function Donut({ size = 100, sw = 10, segments, children }: {
  size?: number; sw?: number;
  segments: { value: number; color: string }[];
  children?: ReactNode;
}) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDEAE5" strokeWidth={sw} />
        {segments.map((s, i) => {
          const d = (Math.min(s.value, 100) / 100) * circ;
          const o = off;
          off += d;
          return d > 0.5 ? (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${d} ${circ - d}`}
              strokeDashoffset={-o}
              strokeLinecap="round"
              style={{ transition: "all .8s ease" }}
            />
          ) : null;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════ DATA BRIDGE HELPERS ═══════════════════
   These functions bridge from existing UIProject/UIStats types
   to the new data shape. Replace with direct API fields once available.
   ═══════════════════════════════════════════════════════════════ */

interface ProjectCardData {
  id: string;
  title: string;
  subtitle: string;
  client: string;
  contractValue: number;
  invoicedToClient: number;
  receivedFromClient: number;
  paidToContractors: number;
  pendingContractorInvoices: { contractor: string; amount: number }[];
  jobsCount: number;
  jobsDone: number;
  worksites: number;
  workgroups: number;
  activeContractors: number;
  changeOrders: number;
  openIssues: number;
  startDate: string | null;
  endDate: string | null;
  forecastEnd: string | null;
  scheduleStatus: "ontrack" | "delayed" | "critical";
  delayDays: number;
  originalMargin: number;
  currentMargin: number;
  riskFlag: string | null;
  nextMilestone: string | null;
}

function bridgeProject(proj: UIProject, pendingInvoices: UIPendingInvoice[]): ProjectCardData {
  // BRIDGE: Map existing fields to new shape.
  // Replace this entire function once API provides the new fields directly.
  const projectInvoices = pendingInvoices
    .filter(inv => inv.projectTitle === proj.title || inv.projectId === proj.id)
    .map(inv => ({ contractor: inv.contractorName, amount: inv.amount }));

  return {
    id: proj.id,
    title: proj.title.split(" — ")[0] || proj.title,
    subtitle: proj.title.split(" — ")[1] || "",
    client: (proj as any).client || proj.title.split(" — ")[0] || "",
    // BRIDGE: Using totalBudget as proxy for contractValue
    contractValue: (proj as any).contractValue || proj.totalBudget,
    // BRIDGE: Using totalSpent + totalInvoiced as proxy
    invoicedToClient: (proj as any).invoicedToClient || (proj.totalSpent + proj.totalInvoiced),
    receivedFromClient: (proj as any).receivedFromClient || proj.totalSpent,
    paidToContractors: (proj as any).paidToContractors || Math.round(proj.totalSpent * 0.75),
    pendingContractorInvoices: (proj as any).pendingContractorInvoices || projectInvoices,
    jobsCount: proj.jobsCount,
    jobsDone: proj.jobsDone,
    worksites: (proj as any).worksites || proj.sitesCount || 1,
    workgroups: (proj as any).workgroups || proj.workgroupsCount || 0,
    activeContractors: (proj as any).activeContractors || Math.min(proj.workgroupsCount, 6),
    changeOrders: (proj as any).changeOrders || 0,
    openIssues: (proj as any).openIssues || 0,
    startDate: proj.startDate,
    endDate: proj.endDate,
    forecastEnd: (proj as any).forecastEnd || proj.endDate,
    scheduleStatus: (proj as any).scheduleStatus || (proj.status === "on_hold" || proj.status === "delayed" ? "delayed" : "ontrack"),
    delayDays: (proj as any).delayDays || 0,
    originalMargin: (proj as any).originalMargin || 20,
    currentMargin: (proj as any).currentMargin || 18,
    riskFlag: (proj as any).riskFlag || null,
    nextMilestone: (proj as any).nextMilestone || null,
  };
}

interface PortfolioKPIs {
  totalContractValue: number;
  totalReceivedFromClients: number;
  totalInvoicedToClients: number;
  totalPaidToContractors: number;
  totalContractorCosts: number;
  onSchedule: number;
  delayed: number;
  critical: number;
  projectsAtRisk: number;
}

function bridgePortfolio(stats: UIStats, projects: ProjectCardData[]): PortfolioKPIs {
  // BRIDGE: Compute from project-level data or use API values when available
  return {
    totalContractValue: (stats as any).totalContractValue || stats.totalBudget || projects.reduce((a, p) => a + p.contractValue, 0),
    totalReceivedFromClients: (stats as any).totalReceivedFromClients || stats.totalSpent || projects.reduce((a, p) => a + p.receivedFromClient, 0),
    totalInvoicedToClients: (stats as any).totalInvoicedToClients || (stats.totalSpent + stats.totalInvoiced) || projects.reduce((a, p) => a + p.invoicedToClient, 0),
    totalPaidToContractors: (stats as any).totalPaidToContractors || projects.reduce((a, p) => a + p.paidToContractors, 0),
    totalContractorCosts: (stats as any).totalContractorCosts || projects.reduce((a, p) => a + p.paidToContractors, 0),
    onSchedule: (stats as any).onSchedule ?? (stats.activeProjects - (stats.delayed || 0)),
    delayed: (stats as any).delayed ?? stats.delayed ?? 0,
    critical: (stats as any).critical ?? 0,
    projectsAtRisk: (stats as any).projectsAtRisk ?? (stats.delayed || 0),
  };
}

/* ═══════════════════ PROJECT CARD COMPONENT ═══════════════════ */
function ProjectCard({ proj, isHovered, onHover, onLeave, onClick, delay }: {
  proj: ProjectCardData; isHovered: boolean;
  onHover: () => void; onLeave: () => void; onClick: () => void;
  delay: number;
}) {
  const workDone = pct(proj.jobsDone, proj.jobsCount);
  const invoicedPct = pct(proj.invoicedToClient, proj.contractValue);
  const costsPaidPct = pct(proj.paidToContractors, proj.contractValue);
  const cashPosition = proj.receivedFromClient - proj.paidToContractors;
  const cashPos = cashPosition >= 0;
  const pendingTotal = proj.pendingContractorInvoices.reduce((a, inv) => a + inv.amount, 0);
  const hasPending = proj.pendingContractorInvoices.length > 0;
  const marginDelta = proj.currentMargin - proj.originalMargin;
  const schedColor = proj.scheduleStatus === "ontrack" ? "#3D8B6E" : proj.scheduleStatus === "delayed" ? "#C07B1A" : "#D44A2E";
  const schedBg = proj.scheduleStatus === "ontrack" ? "#EDFAF4" : proj.scheduleStatus === "delayed" ? "#FFF8EE" : "#FEF0ED";
  const schedLabel = proj.scheduleStatus === "ontrack" ? "On Track" : `+${proj.delayDays}d late`;

  return (
    <div
      onMouseEnter={onHover} onMouseLeave={onLeave} onClick={onClick}
      style={{
        borderRadius: 16, background: "#fff",
        border: `2px solid ${isHovered ? "#A89880" : "#C4B5A2"}`,
        overflow: "hidden", cursor: "pointer",
        transition: "all .22s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
        boxShadow: isHovered ? "0 10px 28px -6px rgba(0,0,0,0.07)" : "0 1px 2px rgba(0,0,0,0.02)",
        animation: `scaleUp .4s ${delay}ms both`,
      }}
    >
      {/* ── BENTO GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 185px", minHeight: 240 }}>

        {/* LEFT: Financials */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column" }}>
          {/* Title */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.01em", fontFamily: "'Outfit', system-ui, sans-serif" }}>{proj.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: schedBg, color: schedColor, letterSpacing: "0.02em" }}>{schedLabel}</span>
            </div>
            <p style={{ fontSize: 13, color: "#6B5F4F", fontWeight: 500 }}>{proj.subtitle}{proj.subtitle && " · "}{proj.client}</p>
          </div>

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { label: "Sites", value: proj.worksites, color: "#3D6B5E" },
              { label: "Trades", value: proj.workgroups, color: "#2D6DB5" },
              { label: "Jobs", value: `${proj.jobsDone}/${proj.jobsCount}`, color: "#5A6B7C" },
              { label: "Contractors", value: proj.activeContractors, color: "#7B5EA7" },
              ...(proj.changeOrders > 0 ? [{ label: "COs", value: proj.changeOrders, color: "#C07B1A" }] : []),
              ...(proj.openIssues > 0 ? [{ label: "Issues", value: proj.openIssues, color: "#D44A2E" }] : []),
            ].map(tag => (
              <span key={tag.label} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "2px 7px", borderRadius: 5, fontSize: 12, fontWeight: 600,
                background: `${tag.color}0A`, color: tag.color, border: `1px solid ${tag.color}18`,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>{tag.value}</span> {tag.label}
              </span>
            ))}
          </div>

          {/* Donut + financials */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <Donut size={100} sw={11}
              segments={[
                { value: pct(proj.receivedFromClient, proj.contractValue), color: "#3D8B6E" },
                { value: pct(proj.invoicedToClient - proj.receivedFromClient, proj.contractValue), color: "#A8D5B8" },
              ]}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contract</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: "#1A1814", lineHeight: 1 }}>{fmt(proj.contractValue)}</span>
            </Donut>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              {[
                { label: "Received", value: fmt(proj.receivedFromClient), p: `${pct(proj.receivedFromClient, proj.contractValue)}%`, color: "#3D8B6E", dot: "#3D8B6E" },
                { label: "Invoiced", value: fmt(Math.max(proj.invoicedToClient - proj.receivedFromClient, 0)), p: "unpaid", color: "#6BAA82", dot: "#A8D5B8" },
                { label: "Paid out", value: fmt(proj.paidToContractors), p: `${costsPaidPct}%`, color: "#D44A2E", dot: "#E8705A" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: item.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#5C5043", minWidth: 42 }}>{item.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8C7E6A" }}>{item.p}</span>
                </div>
              ))}
              <div style={{
                marginTop: 2, padding: "3px 7px", borderRadius: 5, alignSelf: "flex-start",
                background: cashPos ? "#EDFAF4" : "#FEF0ED",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 800, color: cashPos ? "#3D8B6E" : "#D44A2E" }}>
                  {cashPos ? "+" : ""}{fmt(cashPosition)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: cashPos ? "#6BAA82" : "#E8705A" }}>cash</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Stacked panels */}
        <div style={{ display: "flex", flexDirection: "column", borderLeft: "2px solid #C4B5A2", background: "#F2EDE5" }}>

          {/* Work vs Billing */}
          <div style={{ flex: 1, padding: "12px 10px", borderBottom: "1px solid #D4C9B8" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2C2A26", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Work vs Billing</span>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <Donut size={50} sw={6} segments={[{ value: workDone, color: "#2D6DB5" }]}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#2D6DB5" }}>{workDone}%</span>
                </Donut>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#2C2A26", marginTop: 2 }}>DONE</p>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <Donut size={50} sw={6} segments={[{ value: invoicedPct, color: "#3D8B6E" }]}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#3D8B6E" }}>{invoicedPct}%</span>
                </Donut>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#2C2A26", marginTop: 2 }}>BILLED</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 5px", borderRadius: 4, background: "rgba(255,255,255,0.7)" }}>
              <span style={{ fontSize: 11, color: "#4A4239" }}>Margin</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: proj.currentMargin >= 15 ? "#3D8B6E" : proj.currentMargin >= 10 ? "#C07B1A" : "#D44A2E" }}>{proj.currentMargin}%</span>
                {marginDelta !== 0 && <span style={{ fontSize: 11, fontWeight: 700, color: marginDelta > 0 ? "#3D8B6E" : "#D44A2E" }}>{marginDelta > 0 ? "↑" : "↓"}{Math.abs(marginDelta)}</span>}
              </div>
            </div>
          </div>

          {/* Pending Invoices + Risk */}
          <div style={{ flex: 1, padding: "10px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2C2A26", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>Contractor Invoices</span>
            {hasPending ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, fontWeight: 800, color: "#C07B1A" }}>{proj.pendingContractorInvoices.length}</span>
                  <span style={{ fontSize: 12, color: "#6B5F4F" }}>pending</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#C07B1A" }}>{fmtFull(pendingTotal)}</span>
                </div>
                {proj.pendingContractorInvoices.slice(0, 2).map((inv, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                    <span style={{ width: 3, height: 3, borderRadius: 2, background: "#E5963C", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#5C5043", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{inv.contractor}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#C07B1A", flexShrink: 0 }}>{fmt(inv.amount)}</span>
                  </div>
                ))}
              </>
            ) : (
              <span style={{ fontSize: 13, color: "#3D8B6E", fontWeight: 600 }}>✓ All clear</span>
            )}
            {proj.riskFlag && (
              <div style={{ marginTop: 5, padding: "3px 5px", borderRadius: 4, background: "#FEF0ED" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#D44A2E" }}>⚠ {proj.riskFlag}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: "8px 16px", background: "#FAFAF8", borderTop: "2px solid #C4B5A2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#8C7E6A", display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8C7E6A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {proj.startDate ? new Date(proj.startDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "TBD"}
            {" → "}
            {proj.endDate ? new Date(proj.endDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "TBD"}
            {proj.forecastEnd && proj.forecastEnd !== proj.endDate && (
              <span style={{ color: "#D44A2E", fontWeight: 600 }}> (fcst: {new Date(proj.forecastEnd).toLocaleDateString("en-US", { month: "short" })})</span>
            )}
          </span>
          {proj.nextMilestone && (
            <span style={{ fontSize: 12, color: "#8C7E6A", display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ color: "#8C7E6A" }}>·</span> Next: <span style={{ fontWeight: 600, color: "#3D3529" }}>{proj.nextMilestone}</span>
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#3D6B5E", opacity: isHovered ? 1 : 0, transition: "opacity .2s" }}>View →</span>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
export function OwnerDashboard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ── Data from backend ──
  const { data, loading, error, refresh } = useDashboardPortfolio();

  // ── Loading state ──
  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
          <p style={{ fontSize: 13, color: "#8C7E6A", fontWeight: 600 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center", padding: 32, background: "#FEF0ED", borderRadius: 16, maxWidth: 400, border: "1px solid #F5C5BA" }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: "#D44A2E", marginBottom: 8 }}>Dashboard error</p>
          <p style={{ fontSize: 15, color: "#9E3623", marginBottom: 16 }}>{error}</p>
          <button onClick={refresh} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #D44A2E, #E8705A)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Destructure + bridge ──
  const { projects: rawProjects, stats, pendingInvoices, activity, insights } = data;

  const projects: ProjectCardData[] = rawProjects.map(p => bridgeProject(p, pendingInvoices));
  const kpis = bridgePortfolio(stats, projects);

  const greeting = time.getHours() < 12 ? "Good morning" : time.getHours() < 17 ? "Good afternoon" : "Good evening";
  const portfolioCash = kpis.totalReceivedFromClients - kpis.totalPaidToContractors;
  const portfolioMargin = pct(kpis.totalContractValue - kpis.totalContractorCosts, kpis.totalContractValue);
  const outstandingReceivables = kpis.totalInvoicedToClients - kpis.totalReceivedFromClients;

  const handleProjectClick = (projectId: string) => {
    navigate(`projects/${projectId}`);
  };

  // ── Activity type classification ──
  const activityConfig = (item: UIActivity) => {
    const text = item.text.toLowerCase();
    if (text.includes("payment received") || text.includes("received")) return { icon: "↓", color: "#3D8B6E", bg: "#EDFAF4" };
    if (text.includes("completed") || text.includes("complete")) return { icon: "✓", color: "#2D6DB5", bg: "#EFF5FC" };
    if (text.includes("invoice") && text.includes("sent")) return { icon: "↑", color: "#3D8B6E", bg: "#EDFAF4" };
    if (text.includes("invoice") || text.includes("submitted")) return { icon: "↓", color: "#E5963C", bg: "#FFF8EE" };
    if (text.includes("milestone") || text.includes("accepted")) return { icon: "★", color: "#7B5EA7", bg: "#F8F4FC" };
    if (item.type === "success") return { icon: "✓", color: "#3D8B6E", bg: "#EDFAF4" };
    if (item.type === "warning") return { icon: "●", color: "#E5963C", bg: "#FFF8EE" };
    return { icon: "·", color: "#2D6DB5", bg: "#EFF5FC" };
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#FCFBF9", fontFamily: "'Outfit', system-ui, sans-serif",
      opacity: ready ? 1 : 0, transition: "opacity .4s ease",
    }}>
      <style>{css}</style>

      {/* ═══════ HEADER ═══════ */}
      <header style={{ padding: "14px 24px 10px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #ECEAE6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>{greeting}, Tom</h1>
            <p style={{ fontSize: 15, color: "#8C7E6A", fontWeight: 500, marginTop: 1 }}>
              {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {rawProjects.length} active projects
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => navigate("projects/new")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                transition: "all .15s", boxShadow: "0 2px 8px rgba(61,107,94,0.25)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(61,107,94,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(61,107,94,0.25)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Project
            </button>
            <button onClick={refresh} style={{ position: "relative", width: 34, height: 34, borderRadius: 9, border: "1px solid #ECEAE6", background: "#FAFAF8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8C7E6A" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              {(stats.pendingInvoices > 0 || kpis.projectsAtRisk > 0) && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: 4, background: "#E55A3C", border: "2px solid #fff" }} />
              )}
            </button>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #3D6B5E, #5A9E8A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>TW</div>
          </div>
        </div>
      </header>

      {/* ═══════ EXECUTIVE KPI STRIP ═══════ */}
      <div style={{ padding: "10px 24px", background: "#fff", borderBottom: "1px solid #ECEAE6", animation: "fadeUp .35s .06s both", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, borderRadius: 12, overflow: "hidden", background: "#ECEAE6" }}>
          {[
            { label: "Contract Value", value: fmt(kpis.totalContractValue), color: "#1A1814", bg: "#fff" },
            { label: "Revenue Earned", value: fmt(kpis.totalReceivedFromClients), sub: `${pct(kpis.totalReceivedFromClients, kpis.totalContractValue)}% collected`, color: "#3D8B6E", bg: "#FAFFF8" },
            { label: "Receivables", value: fmt(outstandingReceivables), sub: "invoiced · unpaid", color: "#C07B1A", bg: "#FFFCF5" },
            { label: "Costs Paid", value: fmt(kpis.totalPaidToContractors), sub: `of ${fmt(kpis.totalContractorCosts)} total`, color: "#9E3623", bg: "#FFF9F7" },
            { label: "Cash Position", value: `${portfolioCash >= 0 ? "+" : ""}${fmt(portfolioCash)}`, color: portfolioCash >= 0 ? "#3D8B6E" : "#D44A2E", bg: portfolioCash >= 0 ? "#EDFAF4" : "#FEF0ED" },
            { label: "Margin", value: `${portfolioMargin}%`, sub: "blended", color: portfolioMargin >= 15 ? "#3D8B6E" : portfolioMargin >= 10 ? "#C07B1A" : "#D44A2E", bg: "#fff" },
            { label: "Schedule", value: `${kpis.onSchedule} ok`, sub: `${kpis.delayed} delayed${kpis.projectsAtRisk > 0 ? ` · ${kpis.projectsAtRisk} risk` : ""}`, color: kpis.delayed > 0 ? "#C07B1A" : "#3D8B6E", bg: kpis.delayed > 0 ? "#FFF8EE" : "#EDFAF4" },
          ].map((kpi, i) => (
            <div key={kpi.label} style={{ padding: "11px 10px", background: kpi.bg, textAlign: "center", animation: `fadeUp .3s ${i * 30 + 80}ms both` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{kpi.label}</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: kpi.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{kpi.value}</p>
              {kpi.sub && <p style={{ fontSize: 12, color: "#9C8E7C", fontWeight: 500, marginTop: 2 }}>{kpi.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ BODY: Projects + Right Sidebar ═══════ */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ── LEFT: Project Cards ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: "linear-gradient(180deg, #3D6B5E, #5AAE8F)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#1A1814" }}>Project Portfolio</h2>
            <span style={{ fontSize: 14, color: "#9C8E7C" }}>{projects.length} projects</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => navigate("projects/new")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "5px 12px", borderRadius: 7,
                border: "1.5px solid #B5E2CC", background: "#EDFAF4",
                fontSize: 12, fontWeight: 700, color: "#2E7D5F",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#d5f5e6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#EDFAF4"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7D5F" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New
            </button>
          </div>

          {projects.length === 0 ? (
            <div style={{
              padding: "48px 40px", textAlign: "center", borderRadius: 16,
              background: "#fff", border: "2px dashed #DDD7CC",
              animation: "fadeUp .3s .2s both",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
                background: "linear-gradient(135deg, #EDFAF4, #d5f5e6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#1A1814", marginBottom: 4 }}>
                No projects yet
              </p>
              <p style={{ fontSize: 13, color: "#8C7E6A", marginBottom: 20, lineHeight: 1.5 }}>
                Create your first project with AI-powered planning
              </p>
              <button
                onClick={() => navigate("projects/new")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 28px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                  boxShadow: "0 2px 12px rgba(61,107,94,0.25)",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(61,107,94,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(61,107,94,0.25)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                Create your first project
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {projects.map((proj, i) => (
                <ProjectCard
                  key={proj.id}
                  proj={proj}
                  isHovered={hovered === proj.id}
                  onHover={() => setHovered(proj.id)}
                  onLeave={() => setHovered(null)}
                  onClick={() => handleProjectClick(proj.id)}
                  delay={i * 60 + 250}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{
          width: 400, flexShrink: 0, borderLeft: "1px solid #ECEAE6", background: "#fff",
          display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto",
        }}>

          {/* AI Insights */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #ECEAE6" }}>
            <div style={{ height: 2, borderRadius: 2, background: "linear-gradient(90deg, #3D6B5E, #2D6DB5, #8B5FA8)", backgroundSize: "200% 100%", animation: "gradMove 5s ease infinite", marginBottom: 12 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1A1814" }}>AI Insights</span>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: "#3D8B6E", padding: "2px 8px", borderRadius: 10, background: "#EDFAF4" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#3D8B6E", animation: "pulse 2s infinite" }} />Live
              </span>
            </div>

            {insights.length === 0 ? (
              <p style={{ fontSize: 14, color: "#9C8E7C" }}>No insights yet. The AI agent generates insights every 30 minutes.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {insights.map((ins, i) => {
                  const sev = ins.severity === "critical" ? { bg: "#FEF0ED", border: "#F5C5BA", color: "#9E3623", icon: "▲" }
                    : ins.severity === "warning" ? { bg: "#FFF8EE", border: "#F0D9A8", color: "#7A5610", icon: "●" }
                    : { bg: "#EDFAF4", border: "#B5E2CC", color: "#2B6B52", icon: "✓" };
                  return (
                    <div key={ins.id} style={{ display: "flex", gap: 7, padding: "7px 9px", borderRadius: 8, background: sev.bg, border: `1px solid ${sev.border}`, animation: `slideR .3s ${i * 40 + 400}ms both` }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, background: `${sev.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: sev.color, fontWeight: 700, marginTop: 1 }}>{sev.icon}</span>
                      <p style={{ fontSize: 14, color: sev.color, lineHeight: 1.4, fontWeight: 500 }}>{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Needs Attention */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #ECEAE6" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Needs Attention</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { v: projects.reduce((a, p) => a + p.pendingContractorInvoices.length, 0), l: "Invoices", color: "#C07B1A", bg: "#FFF8EE", border: "#F0D9A8" },
                { v: kpis.delayed + kpis.critical, l: "Delayed", color: "#D44A2E", bg: "#FEF0ED", border: "#F5C5BA" },
                { v: kpis.projectsAtRisk, l: "At Risk", color: "#D44A2E", bg: "#FEF0ED", border: "#F5C5BA" },
                { v: projects.reduce((a, p) => a + p.openIssues, 0), l: "Open Issues", color: "#7B5EA7", bg: "#F8F4FC", border: "#E0D4F0" },
              ].map((item, i) => (
                <div key={item.l} style={{ padding: "10px 6px", borderRadius: 10, textAlign: "center", background: item.bg, border: `1px solid ${item.border}`, cursor: "pointer" }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.v}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: item.color, opacity: 0.65, marginTop: 2 }}>{item.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ padding: "12px 16px", flex: 1 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activity.length === 0 ? (
                <p style={{ fontSize: 14, color: "#9C8E7C" }}>No recent activity</p>
              ) : (
                activity.map((item, i) => {
                  const cfg = activityConfig(item);
                  return (
                    <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", animation: `slideR .25s ${i * 30 + 600}ms both` }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: cfg.color, marginTop: 1 }}>{cfg.icon}</span>
                      <div>
                        <p style={{ fontSize: 14, color: "#3D3529", fontWeight: 500, lineHeight: 1.35 }}>{item.text}</p>
                        <p style={{ fontSize: 12, color: "#B0A794", marginTop: 1 }}>
                          {item.time}{item.site ? ` · ${item.site}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Agent Status */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #ECEAE6", background: "linear-gradient(135deg, #F0F7F4, #EEF3F9)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" /></svg>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#2B5248" }}>AI Agent Active</p>
                <p style={{ fontSize: 13, color: "#6B917F" }}>
                  Monitoring {stats.activeProjects} projects
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;
