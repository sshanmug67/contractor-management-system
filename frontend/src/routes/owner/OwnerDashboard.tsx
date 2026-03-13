import { useState, useEffect, type SVGProps, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardPortfolio, type UIProject, type UIPendingInvoice, type UIInsight, type UIActivity, type UIStats } from "@/hooks/useDashboardPortfolio";

/* ═══════════════════ TYPES ═══════════════════ */
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> {
  d: ReactNode | string;
  size?: number;
  color?: string;
  sw?: number;
}
type IP = Omit<IconProps, 'd'>;

/* ═══════════════════ ICONS ═══════════════════ */
const I = ({ d, size = 16, color = "currentColor", sw = 2, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const CheckCI = (p: IP) => <I {...p} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} />;
const ClockI = (p: IP) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />;
const AlertTI = (p: IP) => <I {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>} />;
const SparkI = (p: IP) => <I {...p} d={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></>} />;
const RadioI = (p: IP) => <I {...p} d={<><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" /></>} />;
const BriefI = (p: IP) => <I {...p} d={<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>} />;
const DollarI = (p: IP) => <I {...p} d={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />;
const BellI = (p: IP) => <I {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />;
const ChevRI = (p: IP) => <I {...p} d="M9 18l6-6-6-6" />;
const MapPinI = (p: IP) => <I {...p} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>} />;
const FileI = (p: IP) => <I {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>} />;
const MsgI = (p: IP) => <I {...p} d={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />;

/* ═══════════════════ CONSTANTS ═══════════════════ */
const P = {
  done:    { bg: "#ecfdf5", fg: "#059669", fill: "#10b981", ring: "#a7f3d0", grad: "linear-gradient(135deg,#10b981,#34d399)" },
  active:  { bg: "#eff6ff", fg: "#2563eb", fill: "#3b82f6", ring: "#bfdbfe", grad: "linear-gradient(135deg,#3b82f6,#60a5fa)" },
  pending: { bg: "#fffbeb", fg: "#d97706", fill: "#f59e0b", ring: "#fde68a", grad: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
  draft:   { bg: "#f1f5f9", fg: "#64748b", fill: "#94a3b8", ring: "#cbd5e1", grad: "linear-gradient(135deg,#94a3b8,#cbd5e1)" },
  crit:    { bg: "#fef2f2", fg: "#dc2626", fill: "#ef4444", ring: "#fecaca", grad: "linear-gradient(135deg,#ef4444,#f87171)" },
} as const;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",   color: P.active.fg, bg: P.active.bg },
  planning: { label: "Planning", color: P.active.fg, bg: P.active.bg },
  delayed:  { label: "Delayed",  color: P.pending.fg, bg: P.pending.bg },
  on_hold:  { label: "Delayed",  color: P.pending.fg, bg: P.pending.bg },
  complete: { label: "Complete", color: P.done.fg,   bg: P.done.bg },
  draft:    { label: "Draft",    color: P.draft.fg,  bg: P.draft.bg },
};

const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;
const fmtFull = (n: number): string => `$${n.toLocaleString()}`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
*{font-family:'DM Sans',system-ui,sans-serif!important;box-sizing:border-box;margin:0}
@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.25);border-radius:4px}
`;

/* ═══════════════════ SHARED COMPONENTS ═══════════════════ */
const BudgetBar = ({ spent, invoiced, total, h = 5 }: { spent: number; invoiced: number; total: number; h?: number }) => {
  const t = total || 1;
  const sp = (spent / t) * 100, ip = (invoiced / t) * 100;
  return (
    <div style={{ height: h, borderRadius: 10, overflow: "hidden", display: "flex", background: "rgba(148,163,184,0.15)" }}>
      {sp > 0 && <div style={{ height: "100%", width: `${sp}%`, background: P.done.grad, transition: "width .6s" }} />}
      {ip > 0 && <div style={{ height: "100%", width: `${ip}%`, background: P.pending.grad, transition: "width .6s" }} />}
    </div>
  );
};

/* ═══════════════════ STAT CARD ═══════════════════ */
function StatCard({ icon: IconComp, iconColor, label, value, subtitle, subtitleColor, delay = 0 }: {
  icon: (p: IP) => JSX.Element; iconColor: string; label: string; value: string | number;
  subtitle: string; subtitleColor?: string; delay?: number;
}) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9", animation: `fu .32s ${delay}ms both` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${iconColor}15` }}>
          <IconComp size={14} color={iconColor} />
        </div>
      </div>
      <p style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: subtitleColor || "#94a3b8", marginTop: 3 }}>{subtitle}</p>
    </div>
  );
}

/* ═══════════════════ PROJECT CARD ═══════════════════ */
function ProjectCard({ project, delay, onClick }: { project: UIProject; delay: number; onClick: () => void }) {
  const sm = STATUS_MAP[project.status] || STATUS_MAP.draft;
  const pct = project.jobsCount > 0 ? Math.round((project.jobsDone / project.jobsCount) * 100) : 0;
  const progressColor = project.status === "on_hold" ? P.pending.fg : project.status === "complete" ? P.done.fg : P.active.fg;
  const progressGrad = project.status === "on_hold" ? P.pending.grad : project.status === "complete" ? P.done.grad : P.active.grad;

  return (
    <div onClick={onClick}
      style={{ padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1.5px solid #f1f5f9", cursor: "pointer", transition: "all .2s", animation: `fu .32s ${delay}ms both` }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px -6px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = sm.color + "40"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "#f1f5f9"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{project.title}</span>
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{project.sitesCount} sites · {project.workgroupsCount} workgroups · {project.jobsCount} jobs</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", background: sm.bg, color: sm.color }}>{sm.label}</span>
          <ChevRI size={14} color="#cbd5e1" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{fmt(project.totalBudget)}</span>
        {project.totalSpent > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: P.done.fg }}>{fmt(project.totalSpent)} paid</span>}
        {project.totalInvoiced > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: P.pending.fg }}>{fmt(project.totalInvoiced)} invoiced</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: progressColor }}>{project.jobsDone}/{project.jobsCount} done</span>
      </div>

      <div style={{ position: "relative" }}>
        <BudgetBar spent={project.totalSpent} invoiced={project.totalInvoiced} total={project.totalBudget} h={5} />
        <div style={{ position: "absolute", top: -1, left: 0, width: "100%", height: 7, borderRadius: 10, overflow: "hidden", opacity: 0.35 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: progressGrad, transition: "width .6s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"} — {project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: progressColor }}>{pct}% complete</span>
      </div>
    </div>
  );
}

/* ═══════════════════ PENDING INVOICES TABLE ═══════════════════ */
function PendingInvoicesTable({ invoices }: { invoices: UIPendingInvoice[] }) {
  const statusStyle = (s: string) => {
    if (s === "pending_approval" || s === "ai_validated") return { bg: P.pending.bg, color: P.pending.fg, label: "Review" };
    if (s === "submitted") return { bg: P.active.bg, color: P.active.fg, label: "Submitted" };
    if (s === "ai_flagged") return { bg: P.crit.bg, color: P.crit.fg, label: "Flagged" };
    if (s === "approved") return { bg: P.done.bg, color: P.done.fg, label: "Approved" };
    return { bg: P.draft.bg, color: P.draft.fg, label: s };
  };

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid #f1f5f9", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["Job", "Contractor", "Project", "Amount", "Status"].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: h === "Amount" ? "right" : h === "Status" ? "center" : "left", fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1.5px solid #f1f5f9" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>No pending invoices</td></tr>
          )}
          {invoices.map((inv, i) => { const st = statusStyle(inv.status); return (
            <tr key={inv.id} style={{ borderTop: i > 0 ? "1px solid #f8fafc" : "none", animation: `fu .28s ${i * 40 + 100}ms both`, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fafbfc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{inv.jobTitle}</td>
              <td style={{ padding: "10px 14px", color: "#64748b" }}>{inv.contractorName}</td>
              <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 12 }}>{inv.projectTitle}</td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>{fmtFull(inv.amount)}</td>
              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: st.bg, color: st.color }}>{st.label}</span>
              </td>
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════ AI INSIGHTS PANEL ═══════════════════ */
function AIInsightsPanel({ insights }: { insights: UIInsight[] }) {
  const severityStyle = (s: string) => {
    if (s === "critical") return { bg: P.crit.bg, border: P.crit.ring, color: P.crit.fg, IconC: AlertTI };
    if (s === "warning") return { bg: P.pending.bg, border: P.pending.ring, color: P.pending.fg, IconC: ClockI };
    return { bg: P.done.bg, border: P.done.ring, color: P.done.fg, IconC: CheckCI };
  };

  if (insights.length === 0) {
    return (
      <div style={{ borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}><SparkI size={13} color="#fff" /></div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>AI Insights</span>
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>No insights yet. The AI agent generates insights every 30 minutes.</p>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}><SparkI size={13} color="#fff" /></div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>AI Insights</span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, background: P.done.grad, padding: "3px 10px", borderRadius: 12, color: "#fff" }}><RadioI size={10} color="#fff" />Live</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((ins, i) => { const sv = severityStyle(ins.severity); return (
          <div key={ins.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 12, background: sv.bg, border: `1px solid ${sv.border}`, animation: `si .28s ${i * 50 + 100}ms both` }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: ins.severity === "critical" ? P.crit.grad : ins.severity === "warning" ? P.pending.grad : P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <sv.IconC size={11} color="#fff" />
            </div>
            <p style={{ fontSize: 13, color: sv.color, lineHeight: 1.45, fontWeight: 500 }}>{ins.text}</p>
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ═══════════════════ ACTIVITY FEED ═══════════════════ */
function ActivityFeed({ items }: { items: UIActivity[] }) {
  const dotColor = (t: string) => t === "success" ? P.done.fg : t === "warning" ? P.pending.fg : t === "info" ? P.active.fg : "#cbd5e1";

  if (items.length === 0) {
    return (
      <div style={{ borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9", padding: "14px 16px" }}>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>No recent activity</p>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9", padding: "14px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: `fu .28s ${i * 35 + 80}ms both` }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: dotColor(item.type), marginTop: 5, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, color: "#334155", fontWeight: 500, lineHeight: 1.4 }}>{item.text}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{item.time}{item.site ? ` · ${item.site}` : ""}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ NEEDS ATTENTION GRID ═══════════════════ */
function NeedsAttention({ pendingWg, invoices, activeSites, messages }: { pendingWg: number; invoices: number; activeSites: number; messages: number }) {
  const items = [
    { v: pendingWg, l: "Pending WGs", p: P.pending },
    { v: invoices, l: "Invoices", p: P.crit },
    { v: activeSites, l: "Active Sites", p: P.active },
    { v: messages, l: "Messages", p: P.draft },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {items.map((it, i) => (
        <div key={it.l} style={{ padding: "14px 10px", borderRadius: 12, textAlign: "center", background: it.p.bg, border: `1px solid ${it.p.ring}`, cursor: "pointer", animation: `fu .28s ${i * 40 + 60}ms both` }}>
          <p style={{ fontSize: 24, fontWeight: 900, color: it.p.fg }}>{it.v}</p>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: it.p.fg, opacity: 0.65 }}>{it.l}</p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
export function OwnerDashboard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  // ── Real data from backend via useDashboardPortfolio hook ──
  const { data, loading, error, refresh } = useDashboardPortfolio();

  // ── Loading state ──
  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center", padding: 32, background: P.crit.bg, borderRadius: 16, maxWidth: 420 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: P.crit.fg, marginBottom: 8 }}>Dashboard error</p>
          <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>{error}</p>
          <button onClick={refresh} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: P.crit.grad, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  // ── Destructure from hook (all pre-computed by backend) ──
  const { projects, stats, pendingInvoices, activity, insights } = data;

  const handleProjectClick = (projectId: string) => {
    navigate(`projects/${projectId}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'DM Sans',system-ui,sans-serif", opacity: ready ? 1 : 0, transition: "opacity .3s" }}>
      <style>{css}</style>

      {/* ── Top Header ── */}
      <div style={{ padding: "12px 20px", background: "linear-gradient(135deg,#0f172a,#1e293b)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>Good afternoon, Tom</h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              {stats.activeProjects} active projects · {stats.pendingWorkgroups + stats.pendingInvoices} items need attention
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={refresh} style={{ padding: 7, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative" }} title="Refresh dashboard">
              <BellI size={15} color="#94a3b8" />
              {stats.pendingInvoices > 0 && <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4, background: "#ef4444", border: "2px solid #0f172a" }} />}
            </button>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>TW</div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: "#f1f5f9" }}>

        {/* Stat Cards — all values from backend stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <StatCard icon={BriefI} iconColor={P.active.fg} label="Active Projects" value={stats.activeProjects}
            subtitle={`${stats.onTrack} on track, ${stats.delayed} delayed`}
            subtitleColor={stats.delayed > 0 ? P.pending.fg : P.done.fg} delay={0} />
          <StatCard icon={AlertTI} iconColor={P.pending.fg} label="Pending Approvals"
            value={stats.pendingWorkgroups + stats.pendingInvoices}
            subtitle={`${stats.pendingWorkgroups} workgroups, ${stats.pendingInvoices} invoices`}
            subtitleColor={P.pending.fg} delay={40} />
          <StatCard icon={DollarI} iconColor={P.done.fg} label="Total Spend"
            value={fmt(stats.totalSpent + stats.totalInvoiced)}
            subtitle={`of ${fmt(stats.totalBudget)} budget (${stats.totalBudget > 0 ? Math.round(((stats.totalSpent + stats.totalInvoiced) / stats.totalBudget) * 100) : 0}%)`}
            subtitleColor={P.done.fg} delay={80} />
          <StatCard icon={CheckCI} iconColor={P.done.fg} label="Jobs Completed" value={stats.totalJobsDone}
            subtitle={`of ${stats.totalJobs} total across all`} delay={120} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>

          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Section: My Projects */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <MapPinI size={14} color="#64748b" />My Projects
              </h2>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{projects.length} projects · {fmt(stats.totalBudget)} total</span>
            </div>

            {projects.map((proj, i) => (
              <ProjectCard key={proj.id} project={proj} delay={i * 60 + 160} onClick={() => handleProjectClick(proj.id)} />
            ))}

            {projects.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", borderRadius: 14, background: "#fff", border: "1.5px solid #f1f5f9" }}>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>No projects yet. Create your first project to get started.</p>
              </div>
            )}

            {/* Section: Pending Invoices */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                <FileI size={14} color="#64748b" />Pending Invoices
              </h2>
              {pendingInvoices.length > 0 && (
                <span style={{ fontSize: 12, color: P.pending.fg, fontWeight: 700, cursor: "pointer" }}>{pendingInvoices.length} awaiting review →</span>
              )}
            </div>

            <PendingInvoicesTable invoices={pendingInvoices} />

          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* AI Insights */}
            <AIInsightsPanel insights={insights} />

            {/* Needs Attention */}
            <h3 style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Needs Attention</h3>
            <NeedsAttention
              pendingWg={stats.pendingWorkgroups}
              invoices={stats.pendingInvoices}
              activeSites={stats.activeProjects}
              messages={0}
            />

            {/* Recent Activity */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                <MsgI size={13} color="#64748b" />Recent Activity
              </h3>
            </div>
            <ActivityFeed items={activity} />

          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;
