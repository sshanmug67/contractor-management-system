import { useState, useEffect, useRef, type ReactNode, type SVGProps } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { transformDashboardData } from "@/hooks/dashboardBridge";
import type { UIDashboard, UIWorkgroup, UIJob } from "@/hooks/dashboardBridge";

/* ═══════════════════ TYPES ═══════════════════ */
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> { d: ReactNode | string; size?: number; color?: string; sw?: number; }
type IP = Omit<IconProps, 'd'>;
interface SiteColor { gradient: string; accent: string; bg: string; ring: string; text: string; }
interface Palette { bg: string; fg: string; fill?: string; ring: string; grad: string; }
interface StatusMeta { label: string; p: Palette; }
interface TradeInfo { Icon: (p: IP) => JSX.Element; c: string; bg: string; ring: string; }

/* ═══════════════════ ICONS (unchanged from original) ═══════════════════ */
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
const RadioI = (p: IP) => <I {...p} d={<><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" /></>} />;
const GanttI = (p: IP) => <I {...p} d={<><path d="M8 6h10" /><path d="M6 12h9" /><path d="M11 18h7" /></>} />;
const GridI = (p: IP) => <I {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />;
const BellI = (p: IP) => <I {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />;
const DollarI = (p: IP) => <I {...p} d={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />;
const ChevLI = (p: IP) => <I {...p} d="M15 18l-6-6 6-6" />;
const HammerI = (p: IP) => <I {...p} d={<><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3.33-3.33a2.12 2.12 0 0 0-3 3L15.73 9.5h1.7c.85 0 1.65.33 2.25.93l1.25 1.25" /></>} />;
const PlugI = (p: IP) => <I {...p} d={<><path d="M12 22v-5" /><path d="M9 8V1h6v7" /><path d="M8 8h8" /><path d="M18 8a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4" /></>} />;
const WrenchI = (p: IP) => <I {...p} d={<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>} />;
const PaintI = (p: IP) => <I {...p} d={<><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" /><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" /><path d="M14.5 17.5 4.5 15" /></>} />;
const WindI = (p: IP) => <I {...p} d={<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>} />;
const BuildI = (p: IP) => <I {...p} d={<><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></>} />;
const FileI = (p: IP) => <I {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>} />;

/* ═══════════════════ DISPLAY CONSTANTS (unchanged) ═══════════════════ */
const SC: SiteColor[] = [
  { gradient: "linear-gradient(135deg,#3D6B5E,#5AAE8F)", accent: "#3D8B6E", bg: "#EDFAF4", ring: "#B5E2CC", text: "#2B5248" },
  { gradient: "linear-gradient(135deg,#8B5E3C,#C08A5A)", accent: "#C08A5A", bg: "#FFF8EE", ring: "#F0D9A8", text: "#5C3D20" },
  { gradient: "linear-gradient(135deg,#5A4B7A,#8B7AAE)", accent: "#7B5EA7", bg: "#F8F4FC", ring: "#E0D4F0", text: "#3D3058" },
  { gradient: "linear-gradient(135deg,#2D6DB5,#5A9AD5)", accent: "#2D6DB5", bg: "#EFF5FC", ring: "#BDD4EF", text: "#1A4A7A" },
  { gradient: "linear-gradient(135deg,#9E5A3C,#C4785A)", accent: "#C4785A", bg: "#FEF5F0", ring: "#F0C5B0", text: "#6B3A22" },
];

const P = {
  done:    { bg: "#EDFAF4", fg: "#2E7D5F", fill: "#3D8B6E", ring: "#B5E2CC", grad: "linear-gradient(135deg,#2E7D5F,#5AAE8F)" },
  active:  { bg: "#EFF5FC", fg: "#2D6DB5", fill: "#5A9AD5", ring: "#BDD4EF", grad: "linear-gradient(135deg,#2D6DB5,#5A9AD5)" },
  pending: { bg: "#FFF8EE", fg: "#C07B1A", fill: "#E5963C", ring: "#F0D9A8", grad: "linear-gradient(135deg,#C07B1A,#E5A63B)" },
  draft:   { bg: "#F5F3EF", fg: "#8C7E6A", fill: "#B5A99A", ring: "#DDD7CC", grad: "linear-gradient(135deg,#8C7E6A,#B5A99A)" },
  ns:      { bg: "#FAF9F6", fg: "#B5A99A", fill: "#DDD7CC", ring: "#ECEAE6", grad: "linear-gradient(135deg,#B5A99A,#DDD7CC)" },
  crit:    { bg: "#FEF0ED", fg: "#D44A2E", fill: "#E8705A", ring: "#F5C5BA", grad: "linear-gradient(135deg,#D44A2E,#E8705A)" },
} as const;

const SM: Record<string, StatusMeta> = {
  complete: { label: "Done", p: P.done }, in_progress: { label: "Active", p: P.active },
  pending: { label: "Pending", p: P.pending }, draft: { label: "Draft", p: P.draft },
  not_started: { label: "Queued", p: P.ns },
};

const TI: Record<string, TradeInfo> = {
  Roofing:    { Icon: HammerI, c: "#C07B1A", bg: "linear-gradient(135deg,#fef3c7,#fde68a)", ring: "#E5A63B" },
  Electrical: { Icon: PlugI,   c: "#2D6DB5", bg: "linear-gradient(135deg,#E0ECF7,#BDD4EF)", ring: "#5A9AD5" },
  Plumbing:   { Icon: WrenchI, c: "#2D7D9E", bg: "linear-gradient(135deg,#E0F0F7,#B8DDE8)", ring: "#4AA0C0" },
  Painting:   { Icon: PaintI,  c: "#C05A7A", bg: "linear-gradient(135deg,#FCF0F4,#F5D5E0)", ring: "#E090A8" },
  HVAC:       { Icon: WindI,   c: "#2E7D5F", bg: "linear-gradient(135deg,#DDFAED,#B5E2CC)", ring: "#3D8B6E" },
  Flooring:   { Icon: BuildI,  c: "#7B5EA7", bg: "linear-gradient(135deg,#F0ECF8,#E0D4F0)", ring: "#8B7AAE" },
};
const DEFAULT_TRADE: TradeInfo = { Icon: HammerI, c: "#8C7E6A", bg: "#F5F3EF", ring: "#DDD7CC" };

const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;
const fmtFull = (n: number): string => `$${n.toLocaleString()}`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{font-family:'Outfit',system-ui,sans-serif!important;box-sizing:border-box;margin:0}
@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes pg{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.35)}50%{box-shadow:0 0 0 5px rgba(59,130,246,0)}}
@keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.15)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes drawerIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:10px}::-webkit-scrollbar-track{background:#F0EDE8;border-radius:5px}::-webkit-scrollbar-thumb{background:#C4B5A2;border-radius:5px;border:2px solid #F0EDE8}::-webkit-scrollbar-thumb:hover{background:#A89880}
`;

/* ═══════════════════ SHARED COMPONENTS (unchanged) ═══════════════════ */
const Badge = ({ status }: { status: string }) => { const m = SM[status] || SM.draft; return <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: m.p.grad, color: "#fff" }}>{m.label}</span>; };
const BudgetBar = ({ spent, invoiced, total, h = 5 }: { spent: number; invoiced: number; total: number; h?: number }) => { const t = total || 1; const sp = (spent / t) * 100, ip = (invoiced / t) * 100; return <div style={{ height: h, borderRadius: 10, overflow: "hidden", display: "flex", background: "#DDD7CC" }}>{sp > 0 && <div style={{ height: "100%", width: `${sp}%`, background: P.done.grad, transition: "width .6s" }} />}{ip > 0 && <div style={{ height: "100%", width: `${ip}%`, background: P.pending.grad, transition: "width .6s" }} />}</div>; };
const Bar = ({ pct, grad }: { pct: number; grad: string }) => <div style={{ height: 4, borderRadius: 10, overflow: "hidden", background: "#DDD7CC" }}><div style={{ height: "100%", borderRadius: 10, width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: grad, transition: "width .6s" }} /></div>;

/* ═══════════════════ DONUT COMPONENT ═══════════════════ */
function Donut({ size = 80, sw = 8, segments, children }: { size?: number; sw?: number; segments: { value: number; color: string }[]; children?: ReactNode }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#DDD7CC" strokeWidth={sw} />
        {segments.map((s, i) => { const d = (Math.min(s.value, 100) / 100) * circ; const o = off; off += d;
          return d > 0.5 ? <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={`${d} ${circ-d}`} strokeDashoffset={-o} strokeLinecap="round" style={{ transition: "all .8s ease" }} /> : null;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/* ═══════════════════ TAB BUTTON ═══════════════════ */
function TabButton({ label, icon: IconC, isActive, onClick }: { label: string; icon: (p: IP) => JSX.Element; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 13, fontWeight: isActive ? 800 : 600,
      border: "none", borderBottom: `3px solid ${isActive ? "#3D6B5E" : "transparent"}`, background: isActive ? "rgba(61,107,94,0.06)" : "transparent",
      color: isActive ? "#1A1814" : "#9C8E7C", cursor: "pointer", transition: "all .15s",
    }}
    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#6B5F4F"; }}
    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#9C8E7C"; }}>
      <IconC size={14} color={isActive ? "#3D6B5E" : "#9C8E7C"} />{label}
    </button>
  );
}

/* ═══════════════════ WORKGROUP DRAWER (unchanged from original) ═══════════════════ */
function WorkgroupDrawer({ wg, allWg, onClose }: { wg: UIWorkgroup; allWg: UIWorkgroup[]; onClose: () => void }) {
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

/* ═══════════════════ GANTT VIEW (unchanged from original) ═══════════════════ */
function GanttView({ d }: { d: UIDashboard }) {
  const [exp, setExp] = useState<Set<string>>(new Set(d.worksites[0]?.workgroups.slice(0, 2).map(w => w.id) || []));
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rightW, setRightW] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setRightW(el.clientWidth - 280);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Dynamic date range ── */
  const allDates: number[] = [];
  d.worksites.forEach(ws => ws.workgroups.forEach(wg => {
    if (wg.startDate) allDates.push(new Date(wg.startDate).getTime());
    if (wg.endDate) allDates.push(new Date(wg.endDate).getTime());
  }));
  if (d.projectStartDate) allDates.push(new Date(d.projectStartDate).getTime());
  if (d.projectEndDate) allDates.push(new Date(d.projectEndDate).getTime());
  allDates.push(Date.now());
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  // Add 15-day padding on each side, then round to month boundaries
  const padMs = 15 * 864e5;
  const rangeStart = new Date(minDate - padMs);
  rangeStart.setDate(1); // Start of month
  const rangeEnd = new Date(maxDate + padMs);
  rangeEnd.setMonth(rangeEnd.getMonth() + 1, 1); // Start of next month
  const tS = rangeStart.getTime();
  const tE = rangeEnd.getTime();
  const tR = tE - tS;
  const d2p = (dt: string | Date): number => {
    const t = typeof dt === "string" ? new Date(dt).getTime() : dt.getTime();
    return Math.max(0, Math.min(100, ((t - tS) / tR) * 100));
  };

  // Generate month labels
  const months: { label: string; left: number; width: number }[] = [];
  const cur = new Date(rangeStart);
  while (cur.getTime() < tE) {
    const mStart = cur.getTime();
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const mEnd = Math.min(next.getTime(), tE);
    months.push({
      label: cur.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      left: ((mStart - tS) / tR) * 100,
      width: ((mEnd - mStart) / tR) * 100,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  // Today marker
  const todayPct = d2p(new Date());

  const LEFT_W = 280;
  const ROW_H = 42;
  const JOB_ROW_H = 34;
  const SITE_ROW_H = 36;

  const toggleExp = (id: string) => {
    setExp(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Pre-compute all bar positions (workgroups AND jobs) for dependency overlay ──
  // Job bar geometry: same logic as the render loop, but computed upfront
  interface BarPos { left: number; right: number; yCenterPx: number; }
  const wgBarPos = new Map<string, BarPos>();
  const jobBarPos = new Map<string, BarPos>();
  // Track which workgroup each job belongs to (for collapsed fallback)
  const jobToWgId = new Map<string, string>();
  // Collect all job dependency edges
  interface JobDepEdge { fromJobId: string; toJobId: string; }
  const jobDepEdges: JobDepEdge[] = [];

  let yOff = 0;
  d.worksites.forEach(ws => {
    yOff += SITE_ROW_H; // site header
    ws.workgroups.forEach(wg => {
      const wgYCenter = yOff + ROW_H / 2;
      const wgS = wg.startDate ? d2p(wg.startDate) : 0;
      const wgE = wg.endDate ? d2p(wg.endDate) : wgS + 4;
      wgBarPos.set(wg.id, { left: wgS, right: wgE, yCenterPx: wgYCenter });
      yOff += ROW_H; // workgroup row

      // Compute each job's bar position
      const wStart = wg.startDate ? new Date(wg.startDate).getTime() : tS;
      wg.jobs.forEach((job: UIJob, ji: number) => {
        jobToWgId.set(job.id, wg.id);

        const dayOff = wg.jobs.slice(0, job.sequence - 1).reduce((a: number, j: UIJob) => a + j.durationDays, 0);
        const jS = new Date(wStart + dayOff * 864e5);
        const jE = new Date(jS.getTime() + job.durationDays * 864e5);
        const jL = d2p(jS);
        const jR = d2p(jE);

        if (exp.has(wg.id)) {
          // Expanded: job has its own row
          const jobYCenter = yOff + JOB_ROW_H / 2;
          jobBarPos.set(job.id, { left: jL, right: jR, yCenterPx: jobYCenter });
          yOff += JOB_ROW_H;
        } else {
          // Collapsed: job maps to the workgroup bar's Y position
          jobBarPos.set(job.id, { left: jL, right: jR, yCenterPx: wgYCenter });
        }

        // Collect dependency edges from this job
        const deps: string[] = job.dependsOnJobIds || [];
        deps.forEach((predJobId: string) => {
          jobDepEdges.push({ fromJobId: predJobId, toJobId: job.id });
        });
      });
    });
  });
  const totalContentH = yOff;

  // ── Build stepped connector paths for each dependency edge ──
  // Pattern: exit right → drop down → enter right (with rounded corners)
  // This is the standard Gantt dependency line style (MS Project, Monday, etc.)
  interface DepCurve {
    key: string;
    path: string;
    x1: number; y1: number;
    x2: number; y2: number;
    isCrossWg: boolean;
    level: 'job' | 'workgroup';
  }
  const depCurves: DepCurve[] = [];

  const CORNER_R = 6; // corner radius for the stepped connectors
  const EXIT_GAP = 10; // horizontal gap before dropping down

  /** Build a stepped connector path from (x1,y1) to (x2,y2) */
  function buildConnectorPath(x1: number, y1: number, x2: number, y2: number): string {
    const dy = y2 - y1;
    const absDy = Math.abs(dy);

    // Same row — simple horizontal line
    if (absDy < 2) {
      return `M ${x1},${y1} L ${x2},${y2}`;
    }

    const dirY = dy > 0 ? 1 : -1; // 1 = downward, -1 = upward
    const r = Math.min(CORNER_R, absDy / 2); // clamp radius if rows are very close

    // Determine the X position for the vertical segment
    // Place it just after the predecessor bar end
    const midX = x1 + EXIT_GAP;

    // If target is to the right of our vertical segment (normal case)
    if (x2 > midX + r * 2) {
      return [
        `M ${x1},${y1}`,                                          // start
        `L ${midX},${y1}`,                                        // exit right
        `Q ${midX + r},${y1} ${midX + r},${y1 + dirY * r}`,      // corner: turn into vertical
        `L ${midX + r},${y2 - dirY * r}`,                         // vertical drop
        `Q ${midX + r},${y2} ${midX + r + r},${y2}`,              // corner: turn into horizontal
        `L ${x2},${y2}`,                                          // enter target
      ].join(' ');
    }

    // Target is close to or left of the vertical — use a wider midpoint
    const safeX = Math.max(x1 + EXIT_GAP, x2 - EXIT_GAP);
    const cpX = safeX + r;
    return [
      `M ${x1},${y1}`,
      `L ${safeX},${y1}`,
      `Q ${cpX},${y1} ${cpX},${y1 + dirY * r}`,
      `L ${cpX},${y2 - dirY * r}`,
      `Q ${cpX},${y2} ${cpX + r},${y2}`,
      `L ${x2},${y2}`,
    ].join(' ');
  }

  // Track which workgroup pairs already have job-level curves
  const coveredWgPairs = new Set<string>();

  if (rightW > 0) {
    // ── Layer 1: Job-level curves (from job_dependencies) ──
    jobDepEdges.forEach(({ fromJobId, toJobId }) => {
      const fromPos = jobBarPos.get(fromJobId);
      const toPos = jobBarPos.get(toJobId);
      if (!fromPos || !toPos) return;

      const x1 = (fromPos.right / 100) * rightW;
      const y1 = fromPos.yCenterPx;
      const x2 = (toPos.left / 100) * rightW;
      const y2 = toPos.yCenterPx;

      const fromWg = jobToWgId.get(fromJobId);
      const toWg = jobToWgId.get(toJobId);
      const isCrossWg = fromWg !== toWg;

      if (isCrossWg && fromWg && toWg) coveredWgPairs.add(`${fromWg}->${toWg}`);

      depCurves.push({
        key: `job:${fromJobId}->${toJobId}`,
        path: buildConnectorPath(x1, y1, x2, y2),
        x1, y1, x2, y2, isCrossWg, level: 'job',
      });
    });

    // ── Layer 2: Workgroup-level curves (from wg.dependsOnIds) ──
    d.worksites.forEach(ws => ws.workgroups.forEach(wg => {
      if (wg.dependsOnIds.length === 0) return;
      wg.dependsOnIds.forEach(predId => {
        if (coveredWgPairs.has(`${predId}->${wg.id}`)) return;

        const fromPos = wgBarPos.get(predId);
        const toPos = wgBarPos.get(wg.id);
        if (!fromPos || !toPos) return;

        const x1 = (fromPos.right / 100) * rightW;
        const y1 = fromPos.yCenterPx;
        const x2 = (toPos.left / 100) * rightW;
        const y2 = toPos.yCenterPx;

        depCurves.push({
          key: `wg:${predId}->${wg.id}`,
          path: buildConnectorPath(x1, y1, x2, y2),
          x1, y1, x2, y2, isCrossWg: true, level: 'workgroup',
        });
      });
    }));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* ── Header row (month columns) ── */}
      <div style={{ flexShrink: 0, display: "flex", borderBottom: "2px solid #C4B5A2" }}>
        <div style={{ width: LEFT_W, flexShrink: 0, padding: "10px 14px", background: "#1A1814", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.12em" }}>Site / Trade / Job</span>
        </div>
        <div style={{ flex: 1, display: "flex", position: "relative", background: "#FAF9F6" }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: "absolute", left: `${m.left}%`, width: `${m.width}%`,
              padding: "10px 0", textAlign: "center",
              borderLeft: i > 0 ? "1px solid #ECEAE6" : "none",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6B5F4F", letterSpacing: "0.04em" }}>{m.label}</span>
            </div>
          ))}
          {/* Today marker */}
          <div style={{ position: "absolute", top: 0, bottom: -2, width: 2, zIndex: 20, left: `${todayPct}%`, background: "#D44A2E" }}>
            <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 900, color: "#fff", background: "#D44A2E", padding: "2px 8px", borderRadius: "0 0 5px 5px", letterSpacing: "0.06em" }}>TODAY</div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div ref={contentRef} style={{ paddingBottom: 35, background: "#fff", minHeight: "100%", position: "relative" }}>

        {/* ── Dependency connection overlay ── */}
        {rightW > 0 && depCurves.length > 0 && (
          <svg style={{
            position: "absolute", top: 0, left: LEFT_W, width: `calc(100% - ${LEFT_W}px)`,
            height: Math.max(totalContentH, 1), pointerEvents: "none", zIndex: 15, overflow: "visible",
          }}>
            <defs>
              <marker id="dep-arrow-cross" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M1,1 L6,3.5 L1,6" fill="none" stroke="#C07B1A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
              <marker id="dep-arrow-intra" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M1,1 L6,3.5 L1,6" fill="none" stroke="#9C8E7C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            {depCurves.map(dep => {
              const color = dep.isCrossWg ? "#C07B1A" : "#9C8E7C";
              const markerId = dep.isCrossWg ? "dep-arrow-cross" : "dep-arrow-intra";
              return (
                <path
                  key={dep.key}
                  d={dep.path}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={`url(#${markerId})`}
                  opacity={0.7}
                />
              );
            })}
          </svg>
        )}
        {d.worksites.map((ws, wi) => {
          const sc = SC[wi % SC.length];
          return (
            <div key={ws.name} style={{ animation: `fu .32s ${wi * 70}ms both` }}>

              {/* ── Site header row ── */}
              <div style={{ display: "flex", alignItems: "stretch", height: SITE_ROW_H, borderBottom: "1.5px solid #C4B5A2", position: "sticky", top: 0, zIndex: 10 }}>
                <div style={{ width: LEFT_W, flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, background: sc.gradient }}>
                  <MapPinI size={12} color="#fff" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{ws.shortName}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{ws.workgroups.length} trades · {ws.workgroups.flatMap(wg => wg.jobs).length} jobs</span>
                </div>
                <div style={{ flex: 1, background: sc.bg, position: "relative" }}>
                  {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.04)" }} /> : null)}
                </div>
              </div>

              {/* ── Workgroup rows ── */}
              {ws.workgroups.map((wg, wgi) => {
                const ti = TI[wg.trade] || DEFAULT_TRADE;
                const TradeIcon = ti.Icon;
                const sm = SM[wg.status] || SM.draft;
                const isE = exp.has(wg.id);
                const isH = hovered === wg.id;
                const dn = wg.jobs.filter((j: UIJob) => j.status === "complete").length;
                const pc = wg.jobs.length > 0 ? (dn / wg.jobs.length) * 100 : 0;
                const s = wg.startDate ? d2p(wg.startDate) : 0;
                const e = wg.endDate ? d2p(wg.endDate) : s + 4;
                const w = Math.max(e - s, 2);
                const wgSpent = wg.jobs.filter((j: UIJob) => j.paid).reduce((a: number, j: UIJob) => a + (j.invoiceAmount || 0), 0);

                return (
                  <div key={wg.id} style={{ animation: `si .3s ${wi * 70 + wgi * 45 + 60}ms both` }}>

                    {/* Workgroup row */}
                    <div
                      onClick={() => toggleExp(wg.id)}
                      onMouseEnter={() => setHovered(wg.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: "flex", alignItems: "center", height: ROW_H,
                        borderBottom: `1px solid ${isE ? "#C4B5A2" : "#ECEAE6"}`,
                        cursor: "pointer",
                        background: isH ? "#FAF9F6" : isE ? "#FAFAF8" : "transparent",
                        transition: "background .15s",
                      }}>

                      {/* Left panel */}
                      <div style={{ width: LEFT_W, flexShrink: 0, padding: "0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Expand/collapse indicator */}
                        <span style={{ fontSize: 10, color: "#9C8E7C", width: 12, textAlign: "center", flexShrink: 0, transition: "transform .2s", transform: isE ? "rotate(90deg)" : "none" }}>▶</span>
                        <div style={{ width: 3, height: 26, borderRadius: 2, background: sm.p.grad, flexShrink: 0 }} />
                        <div style={{ width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: ti.bg, flexShrink: 0 }}>
                          <TradeIcon size={14} color={ti.c} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wg.title}</span>
                            <Badge status={wg.status} />
                          </div>
                          <p style={{ fontSize: 10, color: "#9C8E7C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {wg.contractor} · {dn}/{wg.jobs.length} jobs · {fmt(wg.budget)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Gantt bars */}
                      <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
                        {/* Month grid lines */}
                        {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.04)" }} /> : null)}

                        {/* Workgroup bar */}
                        <div
                          onMouseEnter={(ev) => setTooltip({ x: ev.clientX, y: ev.clientY, content: `${wg.title}: ${fmt(wgSpent)} paid of ${fmt(wg.budget)} · ${dn}/${wg.jobs.length} jobs done` })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            position: "absolute", height: 24, borderRadius: 8, overflow: "hidden",
                            left: `${s}%`, width: `${w}%`,
                            background: wg.dependsOnIds.length > 0 && wg.status !== "complete" && wg.status !== "in_progress" ? "transparent" : "rgba(0,0,0,0.04)",
                            border: wg.dependsOnIds.length > 0 && wg.status !== "complete" && wg.status !== "in_progress" ? `2px dashed ${P.pending.fg}` : `1.5px solid ${sm.p.ring}`,
                            transition: "box-shadow .2s",
                            boxShadow: isH ? `0 2px 10px ${sm.p.fg}20` : "none",
                            zIndex: 6,
                          }}>
                          <div style={{
                            height: "100%", width: `${pc}%`,
                            background: sm.p.grad, borderRadius: 7,
                            transition: "width .7s ease",
                          }} />
                          {wg.status === "in_progress" && (
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.25) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 2s infinite" }} />
                          )}
                        </div>

                        {/* Completion label */}
                        <span style={{ position: "absolute", fontSize: 11, fontWeight: 800, zIndex: 10, left: `${Math.min(s + w + 0.8, 96)}%`, color: sm.p.fg }}>
                          {dn}/{wg.jobs.length}
                        </span>

                        {/* Milestone diamond at end date */}
                        {wg.status === "complete" && (
                          <div style={{
                            position: "absolute", zIndex: 10, left: `${e}%`, top: "50%",
                            transform: "translate(-50%, -50%) rotate(45deg)",
                            width: 10, height: 10, background: sm.p.fg,
                            border: "2px solid #fff",
                            boxShadow: `0 0 0 1px ${sm.p.fg}`,
                          }} />
                        )}
                      </div>
                    </div>

                    {/* ── Expanded job rows ── */}
                    {isE && wg.jobs.map((job: UIJob, ji: number) => {
                      const jSm = SM[job.status] || SM.ns;
                      const isDone = job.status === "complete";
                      const isAct = job.status === "in_progress";
                      const wStart = wg.startDate ? new Date(wg.startDate).getTime() : tS;
                      const off = wg.jobs.slice(0, job.sequence - 1).reduce((a: number, j: UIJob) => a + j.durationDays, 0);
                      const jS = new Date(wStart + off * 864e5);
                      const jE = new Date(jS.getTime() + job.durationDays * 864e5);
                      const jL = d2p(jS);
                      const jR = d2p(jE);
                      const jW = Math.max(jR - jL, 1);
                      const isJobH = hovered === job.id;

                      return (
                        <div key={job.id}
                          onMouseEnter={() => setHovered(job.id)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            display: "flex", alignItems: "center", height: JOB_ROW_H,
                            borderBottom: "1px solid #F0EDE8",
                            animation: `fu .25s ${ji * 30}ms both`,
                            background: isJobH ? "#FAF9F6" : "transparent",
                            transition: "background .12s",
                          }}>

                          {/* Left panel (indented) */}
                          <div style={{ width: LEFT_W, flexShrink: 0, paddingLeft: 56, paddingRight: 12, display: "flex", alignItems: "center", gap: 7 }}>
                            {isDone ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.done.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckI size={8} color="#fff" sw={3} /></div>
                              : isAct ? <div style={{ width: 16, height: 16, borderRadius: 8, background: P.active.grad, flexShrink: 0, animation: "pg 2s ease-in-out infinite" }} />
                              : <div style={{ width: 16, height: 16, borderRadius: 8, border: "1.5px solid #C4B5A2", background: "#fff", flexShrink: 0 }} />}
                            <span style={{
                              fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              color: isDone ? "#9C8E7C" : "#3D3529",
                              fontWeight: isDone ? 500 : 600,
                              textDecoration: isDone ? "line-through" : "none",
                            }}>{job.title}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9C8E7C", flexShrink: 0, fontWeight: 600 }}>{job.durationDays}d</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8C7E6A", flexShrink: 0, fontWeight: 700 }}>{fmt(job.budget)}</span>
                          </div>

                          {/* Right: Job bar */}
                          <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
                            {months.map((m, i) => i > 0 ? <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${m.left}%`, borderLeft: "1px solid rgba(0,0,0,0.03)" }} /> : null)}
                            <div
                              onMouseEnter={(ev) => setTooltip({
                                x: ev.clientX, y: ev.clientY,
                                content: `${job.title}: ${job.durationDays} days · ${fmt(job.budget)}${job.paid ? " · Paid" : job.invoiced ? " · Invoiced" : ""}`,
                              })}
                              onMouseLeave={() => setTooltip(null)}
                              style={{
                                position: "absolute", height: 16, borderRadius: 6,
                                left: `${jL}%`, width: `${jW}%`,
                                background: jSm.p.grad,
                                opacity: job.status === "not_started" ? 0.18 : 1,
                                boxShadow: isJobH && job.status !== "not_started" ? `0 2px 8px ${jSm.p.fg}25` : "none",
                                transition: "box-shadow .15s, opacity .3s",
                              }}>
                              {isAct && (
                                <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.25) 50%,transparent 75%)", backgroundSize: "200% 100%", animation: "sh 2s infinite" }} />
                              )}
                            </div>
                            {/* Invoice status indicator */}
                            {(job.paid || job.invoiced) && (
                              <span style={{
                                position: "absolute", fontSize: 9, fontWeight: 700,
                                left: `${Math.min(jL + jW + 0.5, 95)}%`,
                                color: job.paid ? "#2E7D5F" : "#C07B1A",
                                zIndex: 8,
                              }}>
                                {job.paid ? "Paid" : "Inv'd"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Today line continues through body */}
        <div style={{ position: "sticky", bottom: 0, height: 0, zIndex: 5, pointerEvents: "none" }}>
          <div style={{ position: "absolute", bottom: 0, top: -9999, width: 2, left: `calc(${LEFT_W}px + (100% - ${LEFT_W}px) * ${todayPct / 100})`, background: "rgba(212,74,46,0.15)" }} />
        </div>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10,
          padding: "8px 14px", borderRadius: 10,
          background: "#1A1814", color: "#fff",
          fontSize: 12, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 1000, pointerEvents: "none",
          maxWidth: 320, whiteSpace: "nowrap",
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ CARD VIEW (unchanged from original) ═══════════════════ */
function CardView({ onOpenDrawer, d }: { onOpenDrawer: (wg: UIWorkgroup) => void; d: UIDashboard }) {
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

/* ═══════════════════ PROJECT OUTLOOK (unchanged from original) ═══════════════════ */
function ProjectOutlook({ d }: { d: UIDashboard }) {
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

/* ═══════════════════ NEW: BUDGET & EXPENSES VIEW ═══════════════════ */
function BudgetExpensesView({ d }: { d: UIDashboard }) {
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

/* ═══════════════════ MAIN: PROJECT DETAIL PAGE ═══════════════════ */
export function ProjectDetailPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "budget">("overview");
  const [drawerWg, setDrawerWg] = useState<UIWorkgroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  const { projectId } = useParams<{ projectId: string }>();
  const { data, loading, error, refresh } = useDashboard(projectId);
  const d = data ? transformDashboardData(data) : null;

  if (loading || !d) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#8C7E6A", fontWeight: 600 }}>Loading project...</p>
      </div>
    </div>
  ); }

  if (error) { return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center", padding: 32, background: "#fef2f2", borderRadius: 16, maxWidth: 420 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#D44A2E", marginBottom: 8 }}>Failed to load project</p>
        <p style={{ fontSize: 13, color: "#D44A2E", marginBottom: 16 }}>{error}</p>
        <button onClick={refresh} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: P.crit.grad, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  ); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Outfit',system-ui,sans-serif", opacity: ready ? 1 : 0, transition: "opacity .3s" }}>
      <style>{css}</style>

      {/* ── Header with breadcrumb ── */}
      <div style={{ padding: "9px 16px", background: "#fff", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span onClick={() => navigate("/dashboard")} style={{ fontSize: 12, color: "#8C7E6A", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#9C8E7C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6B5F4F"; }}>
            <ChevLI size={12} color="#8C7E6A" />Dashboard
          </span>
          <span style={{ fontSize: 12, color: "#5C5043" }}>/</span>
          <span style={{ fontSize: 12, color: "#9C8E7C" }}>{d.projectTitle}</span>
        </div>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>{d.projectTitle}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              {d.projectStartDate && <span style={{ fontSize: 13, color: "#8C7E6A", display: "flex", alignItems: "center", gap: 3 }}><CalI size={12} color="#8C7E6A" />{new Date(d.projectStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {d.projectEndDate ? new Date(d.projectEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}</span>}
              <span style={{ fontSize: 13, color: "#5C5043" }}>·</span><span style={{ fontSize: 13, color: "#9C8E7C", fontWeight: 700 }}>{fmt(d.totalBudget)}</span>
              <span style={{ fontSize: 13, color: "#5C5043" }}>·</span><span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D5F" }}>{d.jDone}/{d.jTotal} done ({d.jTotal > 0 ? Math.round(d.jDone / d.jTotal * 100) : 0}%)</span>
              {d.jActive > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#2D6DB5" }}>{d.jActive} active</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[{ v: d.wgActiveN, l: "Active", p: P.active }, { v: d.wgPendingN, l: "Pending", p: P.pending }, { v: d.allWg.length - d.wgActiveN - d.wgPendingN, l: "Draft", p: P.draft }].map((s) =>
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, background: s.p.grad }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{s.v}</span><span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{s.l}</span>
              </div>
            )}
            <button onClick={refresh} title="Refresh" style={{ padding: 7, borderRadius: 8, border: "1px solid #ECEAE6", background: "#FAFAF8", cursor: "pointer" }}>
              <BellI size={14} color="#9C8E7C" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #ECEAE6", background: "#fff", flexShrink: 0, padding: "0 16px" }}>
        <TabButton label="Overview" icon={GridI} isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <TabButton label="Timeline" icon={GanttI} isActive={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} />
        <TabButton label="Budget & Expenses" icon={DollarI} isActive={activeTab === "budget"} onClick={() => setActiveTab("budget")} />

        {/* Gantt legend (show only on timeline tab) */}
        {activeTab === "timeline" && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
          {[{ l: "Done", g: P.done.grad }, { l: "Active", g: P.active.grad }, { l: "Queued", g: P.ns.grad }].map((x) =>
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 6, borderRadius: 3, background: x.g }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>{x.l}</span></div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, transform: "rotate(45deg)", background: P.done.fg, border: "1px solid #fff", boxShadow: `0 0 0 0.5px ${P.done.fg}` }} /><span style={{ fontSize: 10, color: "#8C7E6A" }}>Milestone</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><svg width="20" height="10"><path d="M1,5 L8,5 L8,5 L12,5 L12,5 L19,5" stroke="#C07B1A" strokeWidth="1.5" fill="none" opacity="0.7" /><path d="M16,2 L20,5 L16,8" fill="none" stroke="#C07B1A" strokeWidth="1.2" /></svg><span style={{ fontSize: 10, color: "#8C7E6A" }}>Cross-trade dep</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><svg width="20" height="10"><path d="M1,5 L8,5 L8,5 L12,5 L12,5 L19,5" stroke="#9C8E7C" strokeWidth="1.5" fill="none" opacity="0.7" /><path d="M16,2 L20,5 L16,8" fill="none" stroke="#9C8E7C" strokeWidth="1.2" /></svg><span style={{ fontSize: 10, color: "#8C7E6A" }}>Job dep</span></div>
        </div>}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#F7F6F3" }}>
        {activeTab === "overview" && <CardView onOpenDrawer={setDrawerWg} d={d} />}
        {activeTab === "timeline" && <GanttView d={d} />}
        {activeTab === "budget" && <BudgetExpensesView d={d} />}

        {/* Project Outlook sidebar (shown on overview and timeline tabs) */}
        {(activeTab === "overview" || activeTab === "timeline") && <ProjectOutlook d={d} />}
      </div>

      {/* Drawer */}
      {drawerWg && <WorkgroupDrawer wg={drawerWg} allWg={d.allWg} onClose={() => setDrawerWg(null)} />}
    </div>
  );
}

export default ProjectDetailPage;
