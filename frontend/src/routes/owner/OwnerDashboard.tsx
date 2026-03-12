import { useState, useEffect, useRef, type ReactNode, type SVGProps } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { transformDashboardData } from "@/hooks/dashboardBridge";
import type { UIDashboard, UIWorkgroup, UIJob } from "@/hooks/dashboardBridge";

/* ═══════════════════ TYPES ═══════════════════ */
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> {
  d: ReactNode | string;
  size?: number;
  color?: string;
  sw?: number;
}

type IP = Omit<IconProps, 'd'>;

interface SiteColor {
  gradient: string;
  accent: string;
  bg: string;
  ring: string;
  text: string;
}

interface Palette {
  bg: string;
  fg: string;
  fill?: string;
  ring: string;
  grad: string;
}

interface StatusMeta {
  label: string;
  p: Palette;
}

interface TradeInfo {
  Icon: (p: IP) => JSX.Element;
  c: string;
  bg: string;
  ring: string;
}

/* ═══════════════════ ICONS ═══════════════════ */
const I = ({ d, size = 16, color = "currentColor", sw = 2, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const MapPinI = (p: IP) => <I {...p} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>} />;
const CheckI = (p: IP) => <I {...p} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} />;
const ClockI = (p: IP) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />;
const UsersI = (p: IP) => <I {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} />;
const CalI = (p: IP) => <I {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />;
const ArrI = (p: IP) => <I {...p} d={<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>} />;
const ChevI = (p: IP) => <I {...p} d="M9 18l6-6-6-6" />;
const XI = (p: IP) => <I {...p} d={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />;
const AlertCI = (p: IP) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>} />;
const AlertTI = (p: IP) => <I {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>} />;
const SparkI = (p: IP) => <I {...p} d={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></>} />;
const TrendI = (p: IP) => <I {...p} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>} />;
const RadioI = (p: IP) => <I {...p} d={<><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" /></>} />;
const GanttI = (p: IP) => <I {...p} d={<><path d="M8 6h10" /><path d="M6 12h9" /><path d="M11 18h7" /></>} />;
const GridI = (p: IP) => <I {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />;
const BellI = (p: IP) => <I {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />;
const HammerI = (p: IP) => <I {...p} d={<><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3.33-3.33a2.12 2.12 0 0 0-3 3L15.73 9.5h1.7c.85 0 1.65.33 2.25.93l1.25 1.25" /></>} />;
const PlugI = (p: IP) => <I {...p} d={<><path d="M12 22v-5" /><path d="M9 8V1h6v7" /><path d="M8 8h8" /><path d="M18 8a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4" /></>} />;
const WrenchI = (p: IP) => <I {...p} d={<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>} />;
const PaintI = (p: IP) => <I {...p} d={<><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" /><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" /><path d="M14.5 17.5 4.5 15" /></>} />;
const WindI = (p: IP) => <I {...p} d={<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>} />;
const BuildI = (p: IP) => <I {...p} d={<><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></>} />;

/* ═══════════════════ DISPLAY CONSTANTS ═══════════════════ */
const SC: SiteColor[] = [
  { gradient: "linear-gradient(135deg,#1e3a5f,#2563eb)", accent: "#2563eb", bg: "#eff6ff", ring: "#bfdbfe", text: "#1e3a5f" },
  { gradient: "linear-gradient(135deg,#7c2d12,#ea580c)", accent: "#ea580c", bg: "#fff7ed", ring: "#fed7aa", text: "#7c2d12" },
  { gradient: "linear-gradient(135deg,#4c1d95,#7c3aed)", accent: "#7c3aed", bg: "#f5f3ff", ring: "#ddd6fe", text: "#4c1d95" },
  { gradient: "linear-gradient(135deg,#065f46,#059669)", accent: "#059669", bg: "#ecfdf5", ring: "#a7f3d0", text: "#065f46" },
  { gradient: "linear-gradient(135deg,#991b1b,#dc2626)", accent: "#dc2626", bg: "#fef2f2", ring: "#fecaca", text: "#991b1b" },
];
const P = {
  done:    { bg: "#ecfdf5", fg: "#059669", fill: "#10b981", ring: "#a7f3d0", grad: "linear-gradient(135deg,#10b981,#34d399)" },
  active:  { bg: "#eff6ff", fg: "#2563eb", fill: "#3b82f6", ring: "#bfdbfe", grad: "linear-gradient(135deg,#3b82f6,#60a5fa)" },
  pending: { bg: "#fffbeb", fg: "#d97706", fill: "#f59e0b", ring: "#fde68a", grad: "linear-gradient(135deg,#f59e0b,#fbbf24)" },
  draft:   { bg: "#f1f5f9", fg: "#64748b", fill: "#94a3b8", ring: "#cbd5e1", grad: "linear-gradient(135deg,#94a3b8,#cbd5e1)" },
  ns:      { bg: "#f8fafc", fg: "#94a3b8", fill: "#cbd5e1", ring: "#e2e8f0", grad: "linear-gradient(135deg,#cbd5e1,#e2e8f0)" },
  crit:    { bg: "#fef2f2", fg: "#dc2626", fill: "#ef4444", ring: "#fecaca", grad: "linear-gradient(135deg,#ef4444,#f87171)" },
} as const;

const SM: Record<string, StatusMeta> = {
  complete: { label: "Done", p: P.done }, in_progress: { label: "Active", p: P.active },
  pending: { label: "Pending", p: P.pending }, draft: { label: "Draft", p: P.draft },
  not_started: { label: "Queued", p: P.ns },
};

const TI: Record<string, TradeInfo> = {
  Roofing:    { Icon: HammerI, c: "#d97706", bg: "linear-gradient(135deg,#fef3c7,#fde68a)", ring: "#fbbf24" },
  Electrical: { Icon: PlugI,   c: "#2563eb", bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)", ring: "#3b82f6" },
  Plumbing:   { Icon: WrenchI, c: "#0284c7", bg: "linear-gradient(135deg,#e0f2fe,#bae6fd)", ring: "#0ea5e9" },
  Painting:   { Icon: PaintI,  c: "#db2777", bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", ring: "#ec4899" },
  HVAC:       { Icon: WindI,   c: "#0d9488", bg: "linear-gradient(135deg,#ccfbf1,#99f6e4)", ring: "#14b8a6" },
  Flooring:   { Icon: BuildI,  c: "#7c3aed", bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", ring: "#8b5cf6" },
};

const DEFAULT_TRADE: TradeInfo = { Icon: HammerI, c: "#6b7280", bg: "#f1f5f9", ring: "#d1d5db" };

const tS = new Date("2026-03-01").getTime(), tE = new Date("2026-06-01").getTime(), tR = tE - tS;
const d2p = (dt: string): number => Math.max(0, Math.min(100, ((new Date(dt).getTime() - tS) / tR) * 100));
const mos = ["Mar", "Apr", "May"];
const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
*{font-family:'DM Sans',system-ui,sans-serif!important;box-sizing:border-box;margin:0}
@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes pg{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.35)}50%{box-shadow:0 0 0 5px rgba(59,130,246,0)}}
@keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.15)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes drawerIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.25);border-radius:4px}
`;

/* ═══════════════════ SHARED COMPONENTS ═══════════════════ */
const Badge = ({ status }: { status: string }) => { const m = SM[status] || SM.draft; return <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: m.p.grad, color: "#fff" }}>{m.label}</span>; };
const BudgetBar = ({ spent, invoiced, total, h = 5 }: { spent: number; invoiced: number; total: number; h?: number }) => { const t = total || 1; const sp = (spent / t) * 100, ip = (invoiced / t) * 100; return <div style={{ height: h, borderRadius: 10, overflow: "hidden", display: "flex", background: "rgba(148,163,184,0.15)" }}>{sp > 0 && <div style={{ height: "100%", width: `${sp}%`, background: P.done.grad, transition: "width .6s" }} />}{ip > 0 && <div style={{ height: "100%", width: `${ip}%`, background: P.pending.grad, transition: "width .6s" }} />}</div>; };
const Bar = ({ pct, grad }: { pct: number; grad: string }) => <div style={{ height: 4, borderRadius: 10, overflow: "hidden", background: "rgba(148,163,184,0.15)" }}><div style={{ height: "100%", borderRadius: 10, width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: grad, transition: "width .6s" }} /></div>;

/* ═══════════════════ DRAWER ═══════════════════ */
function WorkgroupDrawer({ wg, allWg, onClose }: { wg: UIWorkgroup; allWg: UIWorkgroup[]; onClose: () => void }) {
  const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon; const sm = SM[wg.status] || SM.draft;
  const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length, pc = wg.jobs.length > 0 ? Math.round((dn / wg.jobs.length) * 100) : 0;
  const spent = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
  const invoiced = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} onClick={(e) => { if (e.target === ref.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", animation: "fadeIn .15s ease both" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.28)", backdropFilter: "blur(3px)" }} />
      <div style={{ position: "relative", width: 420, height: "100%", background: "#fff", boxShadow: "-8px 0 36px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", animation: "drawerIn .28s cubic-bezier(.22,1,.36,1) both" }}>
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
                <p style={{ fontSize: 14, fontWeight: 900, color: "#1e293b" }}>{x.v}</p>
                <p style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>{x.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "22px 16px 8px" }}>
          <BudgetBar spent={spent} invoiced={invoiced} total={wg.budget} h={6} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <div style={{ display: "flex", gap: 8 }}>{[{ l: "Paid", g: P.done.grad }, { l: "Invoiced", g: P.pending.grad }, { l: "Remaining", g: "#e2e8f0" }].map((x) => <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, color: "#64748b" }}><span style={{ width: 7, height: 7, borderRadius: 4, background: x.g }} />{x.l}</span>)}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: sm.p.fg }}>{pc}% complete</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            {wg.startDate && <span style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><CalI size={10} color="#94a3b8" />{new Date(wg.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {wg.endDate && new Date(wg.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            <span style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}><ClockI size={10} color="#94a3b8" />{wg.jobs.reduce((a: number, j: UIJob) => a + j.durationDays, 0)} days</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          <h3 style={{ fontSize: 9, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Jobs ({dn}/{wg.jobs.length} complete)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {wg.jobs.map((job: UIJob, ji: number) => { const jSm = SM[job.status] || SM.ns; return (
              <div key={job.id} style={{ borderRadius: 12, border: `1.5px solid ${job.status === "in_progress" ? P.active.ring : "#f1f5f9"}`, overflow: "hidden", animation: `scaleIn .22s ${ji * 35}ms both`, background: jSm.p.bg }}>
                <div style={{ padding: "9px 11px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ marginTop: 1, flexShrink: 0 }}>
                      {job.status === "complete" ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckI size={9} color="#fff" sw={3} /></div>
                        : job.status === "in_progress" ? <div style={{ width: 18, height: 18, borderRadius: 9, background: P.active.grad, animation: "pg 2s ease-in-out infinite" }} />
                        : <div style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid #cbd5e1", background: "#fff" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: job.status === "complete" ? "#94a3b8" : "#1e293b", textDecoration: job.status === "complete" ? "line-through" : "none" }}>{job.title}</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#1e293b" }}>{fmt(job.budget)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <Badge status={job.status} /><span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{job.durationDays}d · Seq #{job.sequence}</span>
                        <span style={{ marginLeft: "auto" }}>
                          {job.invoiced ? <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: job.paid ? P.done.grad : P.pending.grad, color: "#fff" }}>{job.paid ? "Paid" : "Invoiced"} {fmt(job.invoiceAmount || 0)}</span>
                            : job.status === "complete" ? <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: P.crit.grad, color: "#fff" }}>No invoice</span>
                            : <span style={{ fontSize: 9, color: "#cbd5e1" }}>—</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {job.status === "in_progress" && <div style={{ height: 2, background: P.active.ring }}><div style={{ height: "100%", background: P.active.grad, backgroundSize: "200% 100%", animation: "sh 1.8s infinite" }} /></div>}
              </div>
            ); })}
          </div>
          {wg.dependsOn && <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 10, background: P.pending.bg, border: `1.5px solid ${P.pending.ring}`, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrI size={12} color={P.pending.fg} /><span style={{ fontSize: 10, fontWeight: 700, color: P.pending.fg }}>Blocked by {allWg.find((w) => w.id === wg.dependsOn)?.title || "unknown"}</span>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ GANTT ═══════════════════ */
function GanttView({ d }: { d: UIDashboard }) {
  const [exp, setExp] = useState<string | null>(d.worksites[0]?.workgroups[0]?.id || null);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: "flex", borderBottom: "1.5px solid #e2e8f0" }}>
        <div style={{ width: 200, flexShrink: 0, padding: "7px 12px", background: "linear-gradient(135deg,#1e293b,#334155)" }}><span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em" }}>Site / Trade / Job</span></div>
        <div style={{ flex: 1, display: "flex", position: "relative", background: "#fafbfc" }}>
          {mos.map((m, i) => <div key={m} style={{ flex: 1, textAlign: "center" as const, padding: "7px 0", borderLeft: i ? "1px solid #e2e8f0" : "none" }}><span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.12em" }}>{m} 2026</span></div>)}
          <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, zIndex: 20, left: `${d2p("2026-03-10")}%`, background: "linear-gradient(180deg,#ef4444,#f87171)", animation: "glow 3s ease-in-out infinite" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 900, color: "#fff", background: "#ef4444", padding: "2px 8px", borderRadius: "0 0 5px 5px", letterSpacing: "0.06em" }}>TODAY</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {d.worksites.map((ws, wi) => { const sc = SC[wi % SC.length]; return (
          <div key={ws.name} style={{ animation: `fu .32s ${wi * 70}ms both` }}>
            <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ width: 200, flexShrink: 0, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, background: sc.gradient }}>
                <MapPinI size={11} color="#fff" /><span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{ws.shortName}</span><span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{ws.workgroups.length} trades</span>
              </div>
              <div style={{ flex: 1, background: sc.bg, height: "100%" }} />
            </div>
            {ws.workgroups.map((wg, wgi) => {
              const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon; const sm = SM[wg.status] || SM.draft;
              const isE = exp === wg.id, s = wg.startDate ? d2p(wg.startDate) : 0, e = wg.endDate ? d2p(wg.endDate) : s + 5, w = Math.max(e - s, 2);
              const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length, pc = wg.jobs.length > 0 ? (dn / wg.jobs.length) * 100 : 0;
              return (
                <div key={wg.id} style={{ animation: `si .3s ${wi * 70 + wgi * 45 + 60}ms both` }}>
                  <div onClick={() => setExp(isE ? null : wg.id)} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${isE ? sc.ring : "#f1f5f9"}`, cursor: "pointer", background: isE ? sc.bg : "transparent" }}>
                    <div style={{ width: 200, flexShrink: 0, padding: "7px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 3, height: 24, borderRadius: 2, background: sm.p.grad }} />
                      <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg }}><TradeIcon size={12} color={ti.c} /></div>
                      <div><div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{wg.title}</span><Badge status={wg.status} /></div>
                        <p style={{ fontSize: 9, color: "#94a3b8" }}>{wg.contractor} · {dn}/{wg.jobs.length}</p></div>
                    </div>
                    <div style={{ flex: 1, position: "relative", height: 36, display: "flex", alignItems: "center" }}>
                      {mos.map((_, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, borderLeft: "1px solid rgba(226,232,240,0.4)", left: `${(i / mos.length) * 100}%` }} />)}
                      {wg.dependsOn && <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 10, left: `${Math.max(s - 2, 0)}%` }}><ArrI size={11} color="#f59e0b" /></div>}
                      <div style={{ position: "absolute", height: 22, borderRadius: 7, overflow: "hidden", left: `${s}%`, width: `${w}%`, background: wg.dependsOn ? "transparent" : "rgba(226,232,240,0.35)", border: wg.dependsOn ? "2px dashed #fbbf24" : `1.5px solid ${sm.p.ring}` }}>
                        <div style={{ height: "100%", transition: "all .7s", width: `${pc}%`, background: sm.p.grad }} />
                        {wg.status === "in_progress" && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.3) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 1.8s infinite" }} />}
                      </div>
                      <span style={{ position: "absolute", fontSize: 9, fontWeight: 900, zIndex: 10, left: `${s + w + 1}%`, color: sm.p.fg }}>{dn}/{wg.jobs.length}</span>
                    </div>
                  </div>
                  {isE && wg.jobs.map((job: UIJob, ji: number) => {
                    const jSm = SM[job.status] || SM.ns; const wS = wg.startDate ? new Date(wg.startDate).getTime() : tS;
                    const off = wg.jobs.slice(0, job.sequence - 1).reduce((a: number, j: UIJob) => a + j.durationDays, 0);
                    const jS = new Date(wS + off * 864e5), jE = new Date(jS.getTime() + job.durationDays * 864e5);
                    const jL = d2p(jS.toISOString().split("T")[0]), jR = d2p(jE.toISOString().split("T")[0]), jW = Math.max(jR - jL, 1.2);
                    return (
                      <div key={job.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(226,232,240,0.3)", animation: `fu .28s ${ji * 35}ms both`, background: sc.bg + "50" }}>
                        <div style={{ width: 200, flexShrink: 0, paddingLeft: 50, paddingRight: 8, paddingTop: 5, paddingBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                          {job.status === "complete" ? <div style={{ width: 14, height: 14, borderRadius: 7, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><CheckI size={7} color="#fff" sw={3} /></div>
                            : job.status === "in_progress" ? <div style={{ width: 14, height: 14, borderRadius: 7, background: P.active.grad, animation: "pg 2s ease-in-out infinite" }} />
                            : <div style={{ width: 14, height: 14, borderRadius: 7, border: "1.5px solid #cbd5e1", background: "#fff" }} />}
                          <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: job.status === "complete" ? "#94a3b8" : "#475569", fontWeight: job.status === "complete" ? 500 : 600, textDecoration: job.status === "complete" ? "line-through" : "none" }}>{job.title}</span>
                          <span style={{ fontSize: 8, color: "#b0b8c4", marginLeft: "auto", flexShrink: 0, fontWeight: 700 }}>{job.durationDays}d · {fmt(job.budget)}</span>
                        </div>
                        <div style={{ flex: 1, position: "relative", height: 26, display: "flex", alignItems: "center" }}>
                          {mos.map((_, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, borderLeft: "1px solid rgba(226,232,240,0.2)", left: `${(i / mos.length) * 100}%` }} />)}
                          <div style={{ position: "absolute", height: 14, borderRadius: 5, left: `${jL}%`, width: `${jW}%`, background: jSm.p.grad, opacity: job.status === "not_started" ? 0.15 : 1, boxShadow: job.status !== "not_started" ? `0 2px 6px ${jSm.p.fill}25` : "" }}>
                            {job.status === "in_progress" && <div style={{ position: "absolute", inset: 0, borderRadius: 5, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.3) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 1.8s infinite" }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ); })}
      </div>
    </div>
  );
}

/* ═══════════════════ CARDS ═══════════════════ */
function CardView({ onOpenDrawer, d }: { onOpenDrawer: (wg: UIWorkgroup) => void; d: UIDashboard }) {
  const [activeSite, setActiveSite] = useState(0);
  const ws = d.worksites[activeSite] || d.worksites[0]; const sc = SC[activeSite % SC.length];
  const wsDone = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.status === "complete").length : 0;
  const wsTotal = ws ? ws.workgroups.flatMap((wg) => wg.jobs).length : 0;
  const wsSpent = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0) : 0;
  const wsInv = ws ? ws.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0) : 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {/* Portfolio Budget */}
      <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 6, animation: "fu .32s both", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", padding: "12px 18px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendI size={14} color="#94a3b8" /><span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>{fmt(d.totalBudget)}</span><span style={{ fontSize: 12, color: "#64748b" }}>Total Budget</span>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[{ l: "Paid", v: fmt(d.totalSpent), c: "#34d399", g: P.done.grad }, { l: "Invoiced", v: fmt(d.totalInvoiced), c: "#fbbf24", g: P.pending.grad }, { l: "Remaining", v: fmt(d.totalBudget - d.totalSpent - d.totalInvoiced), c: "#94a3b8", g: "#475569" }].map((x) =>
                <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: x.g }} /><span style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</span><span style={{ fontSize: 11, color: "#64748b" }}>{x.l}</span></span>
              )}
            </div>
          </div>
          <BudgetBar spent={d.totalSpent} invoiced={d.totalInvoiced} total={d.totalBudget} h={6} />
        </div>
      </div>

      {/* Work Sites subtitle */}
      <div style={{ padding: "10px 4px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}><MapPinI size={14} color="#64748b" />Work Sites</h2>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{d.worksites.length} sites · {d.allWg.length} workgroups · {d.jTotal} jobs</span>
      </div>

      {/* Site Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${d.worksites.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
        {d.worksites.map((site, wi) => {
          const siteC = SC[wi % SC.length]; const isActive = wi === activeSite;
          const sS = site.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
          const sI = site.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
          const sP = site.budget > 0 ? Math.round(((sS + sI) / site.budget) * 100) : 0;
          const sDone = site.workgroups.flatMap((wg) => wg.jobs).filter((j: UIJob) => j.status === "complete").length;
          const sTotal = site.workgroups.flatMap((wg) => wg.jobs).length;
          return (
            <div key={site.name} onClick={() => setActiveSite(wi)}
              style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer", transition: "all .2s", background: isActive ? siteC.gradient : siteC.bg, border: `2px solid ${isActive ? siteC.accent : siteC.ring}`, boxShadow: isActive ? `0 4px 16px ${siteC.accent}30` : "none", transform: isActive ? "translateY(-1px)" : "none" }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = siteC.accent; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = siteC.ring; e.currentTarget.style.transform = "none"; } }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <div style={{ width: 18, height: 18, borderRadius: 6, background: isActive ? "rgba(255,255,255,0.2)" : siteC.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinI size={10} color="#fff" /></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : siteC.text }}>{site.shortName}</span>
                <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 900, color: isActive ? "#fff" : siteC.text }}>{fmt(site.budget)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? "rgba(255,255,255,0.7)" : siteC.accent }}>{sP}%</span>
              </div>
              <BudgetBar spent={sS} invoiced={sI} total={site.budget} h={4} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.6)" : "#94a3b8", fontWeight: 600 }}>{site.workgroups.length} workgroups</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? "#34d399" : sDone > 0 ? P.done.fg : "#94a3b8" }}>{sDone}/{sTotal} jobs done</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Site Content */}
      {ws && <div key={activeSite} style={{ animation: "fu .3s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 16px", borderRadius: 14, background: sc.gradient }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinI size={16} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{ws.shortName}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{ws.name.split(", ")[1] || ""}</span></div>
            <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{fmt(ws.budget)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>{fmt(wsSpent)} paid</span>
              {wsInv > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{fmt(wsInv)} invoiced</span>}
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{wsDone}/{wsTotal} jobs</span>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {ws.workgroups.map((wg, wgi) => {
            const ti = TI[wg.trade] || DEFAULT_TRADE; const TradeIcon = ti.Icon; const sm = SM[wg.status] || SM.draft;
            const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length;
            const pc = wg.jobs.length > 0 ? Math.round((dn / wg.jobs.length) * 100) : 0;
            const wgS = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            const wgI = wg.jobs.filter((j: UIJob) => j.invoiced && !j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);
            return (
              <div key={wg.id} onClick={() => onOpenDrawer(wg)} style={{ borderRadius: 16, border: `1.5px solid ${sm.p.ring}`, borderStyle: wg.dependsOn ? "dashed" : "solid", background: "#fff", overflow: "hidden", cursor: "pointer", transition: "all .2s", animation: `si .28s ${wgi * 60}ms both` }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px -6px ${sm.p.fill}25`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ height: 3, background: sm.p.grad }} />
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg }}><TradeIcon size={18} color={ti.c} /></div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{wg.title}</span><Badge status={wg.status} /></div>
                        <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 1 }}>{wg.contractor}</p>
                      </div>
                    </div>
                    <ChevI size={14} color="#cbd5e1" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><div style={{ flex: 1 }}><Bar pct={pc} grad={sm.p.grad} /></div><span style={{ fontSize: 13, fontWeight: 900, color: sm.p.fg }}>{pc}%</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Jobs mini card */}
                    <div style={{ borderRadius: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Jobs</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: sm.p.fg }}>{dn}/{wg.jobs.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {wg.jobs.map((job: UIJob) => { const isDone = job.status === "complete", isAct = job.status === "in_progress"; return (
                          <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {isDone ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckI size={9} color="#fff" sw={3} /></div>
                              : isAct ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.active.grad, flexShrink: 0, animation: "pg 2s ease-in-out infinite" }} />
                              : <div style={{ width: 16, height: 16, borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", flexShrink: 0 }} />}
                            <span style={{ fontSize: 12, color: isDone ? "#94a3b8" : "#334155", fontWeight: isDone ? 500 : 600, textDecoration: isDone ? "line-through" : "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>{fmt(job.budget)}</span>
                          </div>
                        ); })}
                      </div>
                    </div>
                    {/* Budget mini card */}
                    <div style={{ borderRadius: 10, padding: "8px 10px", background: sc.bg, border: `1px solid ${sc.ring}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sc.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: sc.text }}>{fmt(wg.budget)}</span>
                      </div>
                      <BudgetBar spent={wgS} invoiced={wgI} total={wg.budget} h={5} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                        <span style={{ fontSize: 11 }}>{wgS > 0 && <span style={{ color: P.done.fg, fontWeight: 700 }}>{fmt(wgS)} paid</span>}{wgS > 0 && wgI > 0 ? " · " : ""}{wgI > 0 && <span style={{ color: P.pending.fg, fontWeight: 700 }}>{fmt(wgI)} invoiced</span>}{wgS === 0 && wgI === 0 && <span style={{ color: "#94a3b8" }}>No spend yet</span>}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{fmt(wg.budget - wgS - wgI)} left</span>
                      </div>
                    </div>
                    {/* Schedule mini card */}
                    <div style={{ borderRadius: 10, padding: "8px 10px", background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Schedule</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{wg.jobs.reduce((a: number, j: UIJob) => a + j.durationDays, 0)} days</span>
                      </div>
                      {wg.startDate && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                        <CalI size={13} color="#94a3b8" />
                        <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>{new Date(wg.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {wg.endDate ? new Date(wg.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}</span>
                      </div>}
                    </div>
                  </div>
                  {wg.dependsOn && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, padding: "6px 10px", borderRadius: 10, background: P.pending.bg, border: `1px solid ${P.pending.ring}` }}><ArrI size={11} color={P.pending.fg} /><span style={{ fontSize: 11, fontWeight: 700, color: P.pending.fg }}>Blocked by {d.allWg.find((w) => w.id === wg.dependsOn)?.title || "unknown"}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>}
    </div>
  );
}

/* ═══════════════════ PROJECT OUTLOOK ═══════════════════ */
function ProjectOutlook({ d }: { d: UIDashboard }) {
  return (
    <div style={{ width: 390, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "linear-gradient(180deg,#f8fafc,#fff)", borderLeft: "1.5px solid #e2e8f0" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1.5px solid #e2e8f0", background: "linear-gradient(135deg,#0f172a,#1e293b)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>Project Outlook</h2>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1e293b", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: P.crit.grad, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertCI size={12} color="#fff" /></div>Critical Path
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* TODO: Replace with real critical path from API */}
          {[{ s: "123 Main", ch: "Plumbing → Painting", sv: "high", dt: "Pending 18h. Painting delayed ~3 wks." },
            { s: "456 Oak", ch: "HVAC → Electrical", sv: "med", dt: "HVAC pending 12h. Electrical blocked." },
            { s: "789 Elm", ch: "Flooring → Painting", sv: "med", dt: "Flooring pending 6h. Painting blocked." }
          ].map((cp) => { const h = cp.sv === "high"; const c = h ? P.crit : P.pending; return (
            <div key={cp.ch} style={{ display: "flex", gap: 8, padding: "9px 10px", borderRadius: 12, background: c.bg, border: `1px solid ${c.ring}`, cursor: "pointer" }}>
              <ClockI size={16} color={c.fg} />
              <div><p style={{ fontSize: 13, fontWeight: 700, color: c.fg }}>{cp.s}: {cp.ch}</p><p style={{ fontSize: 12, marginTop: 2, color: h ? "#ef4444" : "#d97706" }}>{cp.dt}</p></div>
            </div>
          ); })}
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}><SparkI size={12} color="#fff" /></div>AI Insights
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
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.4 }}>{ins.text}</p>
            </div>
          ); })}
        </div>
      </div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1e293b", marginBottom: 10 }}>Needs Attention</h3>
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
        <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1e293b", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><UsersI size={14} color="#64748b" />Site Presence</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.worksites.map((ws, wi) => { const ac = ws.workgroups.filter((wg) => wg.status === "in_progress").length; const sc2 = SC[wi % SC.length]; return (
            <div key={ws.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, border: `1px solid ${sc2.ring}`, background: sc2.bg }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: ac > 0 ? P.done.grad : "#cbd5e1" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: sc2.text, flex: 1 }}>{ws.shortName}</span>
              <span style={{ fontSize: 12, color: sc2.accent, fontWeight: 600 }}>{ac > 0 ? `${ac} active` : "Idle"}</span>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN ═══════════════════ */
export function OwnerDashboard() {
  const [view, setView] = useState("cards");
  const [drawerWg, setDrawerWg] = useState<UIWorkgroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  const { data, loading, error, refresh } = useDashboard();
  const d = data ? transformDashboardData(data) : null;

  if (loading || !d) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading dashboard...</p>
      </div>
    </div>
  ); }

  if (error) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center", padding: 32, background: "#fef2f2", borderRadius: 16, maxWidth: 420 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>Failed to load dashboard</p>
        <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>{error}</p>
        <button onClick={refresh} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: P.crit.grad, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  ); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'DM Sans',system-ui,sans-serif", opacity: ready ? 1 : 0, transition: "opacity .3s" }}>
      <style>{css}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", borderBottom: "1.5px solid #e2e8f0", flexShrink: 0, background: "linear-gradient(135deg,#0f172a,#1e293b)" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>{d.projectTitle}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {d.projectStartDate && <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><CalI size={12} color="#64748b" />{new Date(d.projectStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {d.projectEndDate ? new Date(d.projectEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}</span>}
            <span style={{ fontSize: 13, color: "#475569" }}>·</span><span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>{fmt(d.totalBudget)}</span>
            <span style={{ fontSize: 13, color: "#475569" }}>·</span><span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>{d.jDone}/{d.jTotal} done ({d.jTotal > 0 ? Math.round(d.jDone / d.jTotal * 100) : 0}%)</span>
            {d.jActive > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{d.jActive} active</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[{ v: d.wgActiveN, l: "Active", p: P.active }, { v: d.wgPendingN, l: "Pending", p: P.pending }, { v: d.allWg.length - d.wgActiveN - d.wgPendingN, l: "Draft", p: P.draft }].map((s) =>
            <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: s.p.grad }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{s.v}</span><span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{s.l}</span>
            </div>
          )}
          <div style={{ display: "flex", borderRadius: 8, padding: 2, background: "rgba(255,255,255,0.1)" }}>
            {[{ id: "gantt", IconC: GanttI, label: "Timeline" }, { id: "cards", IconC: GridI, label: "Cards" }].map((v) =>
              <button key={v.id} onClick={() => setView(v.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: view === v.id ? "#fff" : "transparent", color: view === v.id ? "#1e293b" : "#94a3b8" }}>
                <v.IconC size={13} color={view === v.id ? "#1e293b" : "#94a3b8"} />{v.label}
              </button>
            )}
          </div>
          {view === "gantt" && <div style={{ display: "flex", gap: 7 }}>
            {[{ l: "Done", g: P.done.grad, sym: false }, { l: "Active", g: P.active.grad, sym: false }, { l: "Queued", g: P.ns.grad, sym: false }, { l: "Depends", g: "", sym: true }].map((x) =>
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 3 }}>{x.sym ? <ArrI size={10} color="#fbbf24" /> : <div style={{ width: 10, height: 4, borderRadius: 2, background: x.g }} />}<span style={{ fontSize: 8, color: "#94a3b8" }}>{x.l}</span></div>
            )}
          </div>}
          <button onClick={refresh} title="Refresh" style={{ padding: 7, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", cursor: "pointer" }}>
            <BellI size={14} color="#94a3b8" />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#f1f5f9" }}>
        {view === "gantt" ? <GanttView d={d} /> : <CardView onOpenDrawer={setDrawerWg} d={d} />}
        <ProjectOutlook d={d} />
      </div>
      {drawerWg && <WorkgroupDrawer wg={drawerWg} allWg={d.allWg} onClose={() => setDrawerWg(null)} />}
    </div>
  );
}
