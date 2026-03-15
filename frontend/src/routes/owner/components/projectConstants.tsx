/**
 * Project Detail — Shared Constants
 *
 * Types, icons, palettes, CSS animations, and tiny shared components
 * used across all ProjectDetail sub-components.
 *
 * File: routes/owner/components/projectConstants.ts
 */

import { type ReactNode, type SVGProps } from "react";

/* ═══════════════════ TYPES ═══════════════════ */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'd'> { d: ReactNode | string; size?: number; color?: string; sw?: number; }
export type IP = Omit<IconProps, 'd'>;
export interface SiteColor { gradient: string; accent: string; bg: string; ring: string; text: string; }
export interface Palette { bg: string; fg: string; fill?: string; ring: string; grad: string; }
export interface StatusMeta { label: string; p: Palette; }
export interface TradeInfo { Icon: (p: IP) => JSX.Element; c: string; bg: string; ring: string; }

/* ═══════════════════ ICONS ═══════════════════ */
export const I = ({ d, size = 16, color = "currentColor", sw = 2, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
export const MapPinI = (p: IP) => <I {...p} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>} />;
export const CheckI = (p: IP) => <I {...p} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} />;
export const ClockI = (p: IP) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />;
export const UsersI = (p: IP) => <I {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>} />;
export const CalI = (p: IP) => <I {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />;
export const ArrI = (p: IP) => <I {...p} d={<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>} />;
export const ChevI = (p: IP) => <I {...p} d="M9 18l6-6-6-6" />;
export const XI = (p: IP) => <I {...p} d={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />;
export const AlertCI = (p: IP) => <I {...p} d={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>} />;
export const AlertTI = (p: IP) => <I {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>} />;
export const SparkI = (p: IP) => <I {...p} d={<><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></>} />;
export const RadioI = (p: IP) => <I {...p} d={<><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" /></>} />;
export const GanttI = (p: IP) => <I {...p} d={<><path d="M8 6h10" /><path d="M6 12h9" /><path d="M11 18h7" /></>} />;
export const GridI = (p: IP) => <I {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />;
export const BellI = (p: IP) => <I {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />;
export const DollarI = (p: IP) => <I {...p} d={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />;
export const ChevLI = (p: IP) => <I {...p} d="M15 18l-6-6 6-6" />;
export const HammerI = (p: IP) => <I {...p} d={<><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3.33-3.33a2.12 2.12 0 0 0-3 3L15.73 9.5h1.7c.85 0 1.65.33 2.25.93l1.25 1.25" /></>} />;
export const PlugI = (p: IP) => <I {...p} d={<><path d="M12 22v-5" /><path d="M9 8V1h6v7" /><path d="M8 8h8" /><path d="M18 8a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4" /></>} />;
export const WrenchI = (p: IP) => <I {...p} d={<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>} />;
export const PaintI = (p: IP) => <I {...p} d={<><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" /><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" /><path d="M14.5 17.5 4.5 15" /></>} />;
export const WindI = (p: IP) => <I {...p} d={<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>} />;
export const BuildI = (p: IP) => <I {...p} d={<><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></>} />;
export const FileI = (p: IP) => <I {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>} />;

/* ═══════════════════ SITE COLORS ═══════════════════ */
export const SC: SiteColor[] = [
  { gradient: "linear-gradient(135deg,#3D6B5E,#5AAE8F)", accent: "#3D8B6E", bg: "#EDFAF4", ring: "#B5E2CC", text: "#2B5248" },
  { gradient: "linear-gradient(135deg,#8B5E3C,#C08A5A)", accent: "#C08A5A", bg: "#FFF8EE", ring: "#F0D9A8", text: "#5C3D20" },
  { gradient: "linear-gradient(135deg,#5A4B7A,#8B7AAE)", accent: "#7B5EA7", bg: "#F8F4FC", ring: "#E0D4F0", text: "#3D3058" },
  { gradient: "linear-gradient(135deg,#2D6DB5,#5A9AD5)", accent: "#2D6DB5", bg: "#EFF5FC", ring: "#BDD4EF", text: "#1A4A7A" },
  { gradient: "linear-gradient(135deg,#9E5A3C,#C4785A)", accent: "#C4785A", bg: "#FEF5F0", ring: "#F0C5B0", text: "#6B3A22" },
];

/* ═══════════════════ PALETTES ═══════════════════ */
export const P = {
  done:    { bg: "#EDFAF4", fg: "#2E7D5F", fill: "#3D8B6E", ring: "#B5E2CC", grad: "linear-gradient(135deg,#2E7D5F,#5AAE8F)" },
  active:  { bg: "#EFF5FC", fg: "#2D6DB5", fill: "#5A9AD5", ring: "#BDD4EF", grad: "linear-gradient(135deg,#2D6DB5,#5A9AD5)" },
  pending: { bg: "#FFF8EE", fg: "#C07B1A", fill: "#E5963C", ring: "#F0D9A8", grad: "linear-gradient(135deg,#C07B1A,#E5A63B)" },
  draft:   { bg: "#F5F3EF", fg: "#8C7E6A", fill: "#B5A99A", ring: "#DDD7CC", grad: "linear-gradient(135deg,#8C7E6A,#B5A99A)" },
  ns:      { bg: "#FAF9F6", fg: "#B5A99A", fill: "#DDD7CC", ring: "#ECEAE6", grad: "linear-gradient(135deg,#B5A99A,#DDD7CC)" },
  crit:    { bg: "#FEF0ED", fg: "#D44A2E", fill: "#E8705A", ring: "#F5C5BA", grad: "linear-gradient(135deg,#D44A2E,#E8705A)" },
} as const;

/* ═══════════════════ STATUS MAP ═══════════════════ */
export const SM: Record<string, StatusMeta> = {
  complete: { label: "Done", p: P.done }, in_progress: { label: "Active", p: P.active },
  pending: { label: "Pending", p: P.pending }, draft: { label: "Draft", p: P.draft },
  not_started: { label: "Queued", p: P.ns },
};

/* ═══════════════════ TRADE INFO ═══════════════════ */
export const TI: Record<string, TradeInfo> = {
  Roofing:    { Icon: HammerI, c: "#C07B1A", bg: "linear-gradient(135deg,#fef3c7,#fde68a)", ring: "#E5A63B" },
  Electrical: { Icon: PlugI,   c: "#2D6DB5", bg: "linear-gradient(135deg,#E0ECF7,#BDD4EF)", ring: "#5A9AD5" },
  Plumbing:   { Icon: WrenchI, c: "#2D7D9E", bg: "linear-gradient(135deg,#E0F0F7,#B8DDE8)", ring: "#4AA0C0" },
  Painting:   { Icon: PaintI,  c: "#C05A7A", bg: "linear-gradient(135deg,#FCF0F4,#F5D5E0)", ring: "#E090A8" },
  HVAC:       { Icon: WindI,   c: "#2E7D5F", bg: "linear-gradient(135deg,#DDFAED,#B5E2CC)", ring: "#3D8B6E" },
  Flooring:   { Icon: BuildI,  c: "#7B5EA7", bg: "linear-gradient(135deg,#F0ECF8,#E0D4F0)", ring: "#8B7AAE" },
};
export const DEFAULT_TRADE: TradeInfo = { Icon: HammerI, c: "#8C7E6A", bg: "#F5F3EF", ring: "#DDD7CC" };

/* ═══════════════════ FORMATTERS ═══════════════════ */
export const fmt = (n: number): string => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;
export const fmtFull = (n: number): string => `$${n.toLocaleString()}`;
export const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/* ═══════════════════ CSS ═══════════════════ */
export const css = `
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
@keyframes critPulse{0%,100%{box-shadow:0 0 0 2px rgba(212,74,46,0.15)}50%{box-shadow:0 0 14px rgba(212,74,46,0.4)}}
@keyframes floatBreath{0%,100%{opacity:0.5}50%{opacity:0.8}}
::-webkit-scrollbar{width:10px}::-webkit-scrollbar-track{background:#F0EDE8;border-radius:5px}::-webkit-scrollbar-thumb{background:#C4B5A2;border-radius:5px;border:2px solid #F0EDE8}::-webkit-scrollbar-thumb:hover{background:#A89880}
.dep-handle{opacity:0;transition:opacity .15s;cursor:crosshair}
.gantt-wg-row:hover .dep-handle,.gantt-job-row:hover .dep-handle{opacity:1}
`;

/* ═══════════════════ SHARED TINY COMPONENTS ═══════════════════ */
export const Badge = ({ status }: { status: string }) => { const m = SM[status] || SM.draft; return <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: m.p.grad, color: "#fff" }}>{m.label}</span>; };
export const BudgetBar = ({ spent, invoiced, total, h = 5 }: { spent: number; invoiced: number; total: number; h?: number }) => { const t = total || 1; const sp = (spent / t) * 100, ip = (invoiced / t) * 100; return <div style={{ height: h, borderRadius: 10, overflow: "hidden", display: "flex", background: "#DDD7CC" }}>{sp > 0 && <div style={{ height: "100%", width: `${sp}%`, background: P.done.grad, transition: "width .6s" }} />}{ip > 0 && <div style={{ height: "100%", width: `${ip}%`, background: P.pending.grad, transition: "width .6s" }} />}</div>; };
export const Bar = ({ pct, grad }: { pct: number; grad: string }) => <div style={{ height: 4, borderRadius: 10, overflow: "hidden", background: "#DDD7CC" }}><div style={{ height: "100%", borderRadius: 10, width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: grad, transition: "width .6s" }} /></div>;

export function Donut({ size = 80, sw = 8, segments, children }: { size?: number; sw?: number; segments: { value: number; color: string }[]; children?: ReactNode }) {
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

export function TabButton({ label, icon: IconC, isActive, onClick }: { label: string; icon: (p: IP) => JSX.Element; isActive: boolean; onClick: () => void }) {
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
