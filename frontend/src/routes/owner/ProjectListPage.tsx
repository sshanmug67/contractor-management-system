import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardPortfolio, type UIProject, type UIPendingInvoice, type UIStats } from "@/hooks/useDashboardPortfolio";

/* ═══════════════════ HELPERS ═══════════════════ */
const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{font-family:'Outfit',system-ui,sans-serif!important;box-sizing:border-box;margin:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.07);border-radius:4px}
`;

/* ═══════════════════ STATUS BADGE ═══════════════════ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: "Active",    color: "#2E7D5F", bg: "#EDFAF4" },
    on_track:  { label: "On Track",  color: "#2E7D5F", bg: "#EDFAF4" },
    delayed:   { label: "Delayed",   color: "#C07B1A", bg: "#FFF8EE" },
    on_hold:   { label: "On Hold",   color: "#C07B1A", bg: "#FFF8EE" },
    at_risk:   { label: "At Risk",   color: "#D44A2E", bg: "#FEF0ED" },
    complete:  { label: "Complete",  color: "#8C7E6A", bg: "#F5F3EF" },
    draft:     { label: "Draft",     color: "#9C8E7C", bg: "#FAF9F6" },
  };
  const m = map[status] || map.active;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, color: m.color, background: m.bg }}>{m.label}</span>
  );
}

/* ═══════════════════ MINI DONUT ═══════════════════ */
function MiniDonut({ size = 36, sw = 4, pct: value, color }: { size?: number; sw?: number; pct: number; color: string }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const d = (Math.min(value, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#DDD7CC" strokeWidth={sw} />
        {d > 0.5 && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${d} ${circ-d}`} strokeLinecap="round" style={{ transition: "all .6s" }} />}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size > 30 ? 9 : 8, fontWeight: 800, color }}>{value}%</span>
      </div>
    </div>
  );
}

/* ═══════════════════ BRIDGE (same as dashboard) ═══════════════════ */
interface ProjectRow {
  id: string;
  title: string;
  subtitle: string;
  client: string;
  status: string;
  contractValue: number;
  receivedFromClient: number;
  invoicedToClient: number;
  paidToContractors: number;
  jobsDone: number;
  jobsCount: number;
  sitesCount: number;
  workgroupsCount: number;
  activeContractors: number;
  startDate: string | null;
  endDate: string | null;
  currentMargin: number;
  scheduleStatus: string;
}

function bridgeProject(proj: UIProject, pendingInvoices: UIPendingInvoice[]): ProjectRow {
  return {
    id: proj.id,
    title: proj.title.split(" — ")[0] || proj.title,
    subtitle: proj.title.split(" — ")[1] || "",
    client: (proj as any).client || proj.title.split(" — ")[0] || "",
    status: (proj as any).scheduleStatus || (proj.status === "on_hold" || proj.status === "delayed" ? "delayed" : "active"),
    contractValue: (proj as any).contractValue || proj.totalBudget,
    receivedFromClient: (proj as any).receivedFromClient || proj.totalSpent,
    invoicedToClient: (proj as any).invoicedToClient || (proj.totalSpent + proj.totalInvoiced),
    paidToContractors: (proj as any).paidToContractors || Math.round(proj.totalSpent * 0.75),
    jobsDone: proj.jobsDone,
    jobsCount: proj.jobsCount,
    sitesCount: proj.sitesCount || 1,
    workgroupsCount: proj.workgroupsCount || 0,
    activeContractors: (proj as any).activeContractors || Math.min(proj.workgroupsCount, 6),
    startDate: proj.startDate,
    endDate: proj.endDate,
    currentMargin: (proj as any).currentMargin || 18,
    scheduleStatus: (proj as any).scheduleStatus || "active",
  };
}

/* ═══════════════════ MAIN: PROJECTS PAGE ═══════════════════ */
export function ProjectListPage() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useDashboardPortfolio();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"title" | "contractValue" | "progress" | "margin">("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: "#8C7E6A", fontWeight: 600 }}>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center", padding: 32, background: "#FEF0ED", borderRadius: 16, maxWidth: 420 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#D44A2E", marginBottom: 8 }}>Failed to load projects</p>
          <p style={{ fontSize: 13, color: "#E8705A", marginBottom: 16 }}>{error}</p>
          <button onClick={refresh} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #D44A2E, #E8705A)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  const { projects: rawProjects, pendingInvoices } = data!;
  const projects = rawProjects.map(p => bridgeProject(p, pendingInvoices));

  // Sort
  const sorted = [...projects].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "title") cmp = a.title.localeCompare(b.title);
    else if (sortBy === "contractValue") cmp = a.contractValue - b.contractValue;
    else if (sortBy === "progress") cmp = pct(a.jobsDone, a.jobsCount) - pct(b.jobsDone, b.jobsCount);
    else if (sortBy === "margin") cmp = a.currentMargin - b.currentMargin;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const arrow = (col: typeof sortBy) => sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // Portfolio summary
  const totalContract = projects.reduce((a, p) => a + p.contractValue, 0);
  const totalReceived = projects.reduce((a, p) => a + p.receivedFromClient, 0);
  const totalPaid = projects.reduce((a, p) => a + p.paidToContractors, 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Outfit',system-ui,sans-serif", background: "#F7F6F3" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ padding: "20px 28px 16px", background: "#fff", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>Projects</h1>
            <p style={{ fontSize: 13, color: "#8C7E6A", marginTop: 2 }}>{projects.length} projects · {fmt(totalContract)} total contract value</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Summary pills */}
            {[
              { label: "Contract Value", value: fmt(totalContract), color: "#1A1814" },
              { label: "Received", value: fmt(totalReceived), color: "#2E7D5F" },
              { label: "Paid Out", value: fmt(totalPaid), color: "#D44A2E" },
              { label: "Cash Position", value: `+${fmt(totalReceived - totalPaid)}`, color: totalReceived - totalPaid >= 0 ? "#2E7D5F" : "#D44A2E" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "6px 14px", borderRadius: 10, background: "#F7F6F3" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "2px solid #C4B5A2", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px 100px", padding: "12px 20px", background: "#FAF9F6", borderBottom: "2px solid #C4B5A2" }}>
            {[
              { key: "title" as const, label: "Project" },
              { key: "contractValue" as const, label: "Contract" },
              { key: null, label: "Received / Invoiced" },
              { key: null, label: "Cash Position" },
              { key: "progress" as const, label: "Progress" },
              { key: "margin" as const, label: "Margin" },
              { key: null, label: "Status" },
            ].map((col, i) => (
              <span key={i}
                onClick={col.key ? () => handleSort(col.key!) : undefined}
                style={{
                  fontSize: 11, fontWeight: 700, color: "#6B5F4F", textTransform: "uppercase", letterSpacing: "0.06em",
                  cursor: col.key ? "pointer" : "default",
                  userSelect: "none",
                }}>
                {col.label}{col.key ? arrow(col.key) : ""}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {sorted.map((proj, i) => {
            const isH = hoveredRow === proj.id;
            const cashPos = proj.receivedFromClient - proj.paidToContractors;
            const progressPct = pct(proj.jobsDone, proj.jobsCount);
            const receivedPct = pct(proj.receivedFromClient, proj.contractValue);
            return (
              <div key={proj.id}
                onClick={() => navigate(`${proj.id}`)}
                onMouseEnter={() => setHoveredRow(proj.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px 100px",
                  padding: "14px 20px", alignItems: "center",
                  borderBottom: i < sorted.length - 1 ? "1px solid #ECEAE6" : "none",
                  background: isH ? "#FAF9F6" : "transparent",
                  cursor: "pointer", transition: "background .15s",
                  animation: `fadeUp .3s ${i * 40}ms both`,
                }}>
                {/* Project name */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1814" }}>{proj.title}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6B5F4F", marginTop: 2 }}>
                    {proj.subtitle || proj.client}
                    <span style={{ color: "#9C8E7C" }}> · {proj.sitesCount} sites · {proj.workgroupsCount} trades</span>
                  </p>
                  {proj.startDate && (
                    <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 2 }}>
                      {new Date(proj.startDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" })} — {proj.endDate ? new Date(proj.endDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "TBD"}
                    </p>
                  )}
                </div>

                {/* Contract value */}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>{fmt(proj.contractValue)}</span>

                {/* Received / Invoiced */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MiniDonut size={32} sw={4} pct={receivedPct} color="#2E7D5F" />
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#2E7D5F" }}>{fmt(proj.receivedFromClient)}</span>
                      <span style={{ fontSize: 11, color: "#9C8E7C" }}> / {fmt(proj.invoicedToClient)}</span>
                    </div>
                  </div>
                </div>

                {/* Cash Position */}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800,
                  color: cashPos >= 0 ? "#2E7D5F" : "#D44A2E",
                }}>
                  {cashPos >= 0 ? "+" : ""}{fmt(cashPos)}
                </span>

                {/* Progress */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MiniDonut size={36} sw={4} pct={progressPct} color="#2D6DB5" />
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#1A1814" }}>{proj.jobsDone}/{proj.jobsCount}</span>
                    <p style={{ fontSize: 10, color: "#9C8E7C" }}>jobs done</p>
                  </div>
                </div>

                {/* Margin */}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800,
                  color: proj.currentMargin >= 15 ? "#2E7D5F" : proj.currentMargin >= 10 ? "#C07B1A" : "#D44A2E",
                }}>
                  {proj.currentMargin}%
                </span>

                {/* Status */}
                <StatusBadge status={proj.status} />
              </div>
            );
          })}

          {/* Empty state */}
          {sorted.length === 0 && (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#9C8E7C" }}>No projects yet</p>
              <p style={{ fontSize: 13, color: "#B5A99A", marginTop: 4 }}>Projects will appear here once created</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectListPage;
