import { useState, useEffect, useRef } from "react";

/* ═══════════════════ MOCK DATA ═══════════════════ */
const MOCK_STATS = {
  activeProjects: 3, onTrack: 3, delayed: 0,
  pendingWorkgroups: 7, pendingInvoices: 3,
  totalSpent: 228000, totalInvoiced: 273000, totalBudget: 353000,
  totalJobsDone: 22, totalJobs: 63,
};

const MOCK_PROJECTS = [
  { id: "1", title: "Westfield Office", subtitle: "Buildout Phase 2", status: "active", sitesCount: 2, workgroupsCount: 8, jobsCount: 22, jobsDone: 11, totalBudget: 120000, totalSpent: 64000, totalInvoiced: 18000, startDate: "2025-10-31", endDate: "2026-06-29",
    pendingInvoices: [
      { contractor: "Spark Electric Co", job: "Main panel upgrade", amount: 6000 },
      { contractor: "Premium Floors", job: "Install LVP flooring", amount: 6000 },
    ]
  },
  { id: "2", title: "Johnson Residence", subtitle: "Kitchen Remodel", status: "active", sitesCount: 1, workgroupsCount: 6, jobsCount: 15, jobsDone: 9, totalBudget: 48000, totalSpent: 28000, totalInvoiced: 7000, startDate: "2026-01-14", endDate: "2026-04-14",
    pendingInvoices: [
      { contractor: "Premium Floors", job: "Remove old carpet", amount: 1500 },
    ]
  },
  { id: "3", title: "ABC Properties", subtitle: "Multi-Site Renovation", status: "active", sitesCount: 3, workgroupsCount: 9, jobsCount: 26, jobsDone: 2, totalBudget: 185000, totalSpent: 8000, totalInvoiced: 38000, startDate: "2026-02-28", endDate: "2026-09-29",
    pendingInvoices: []
  },
];

const MOCK_INSIGHTS = [
  { id: "i1", severity: "critical", text: "Westfield Office: You've paid 53% of budget but only 50% work is done. Monitor closely." },
  { id: "i2", severity: "warning", text: "7 workgroups pending contractor response for over 12 hours." },
  { id: "i3", severity: "success", text: "Johnson Residence is 60% complete and only 58% of budget spent — on track." },
];

const MOCK_ACTIVITY = [
  { id: "a1", type: "success", text: 'Spark Electric completed "Rewire main panel"', time: "15h ago", site: "123 Main St" },
  { id: "a2", type: "info", text: "Bob Watts checked in at 123 Main St", time: "17h ago", site: "123 Main St" },
  { id: "a3", type: "warning", text: "Spark Electric Co submitted invoice for $6,000", time: "18h ago", site: "123 Main St" },
  { id: "a4", type: "warning", text: "Lone Star Tile submitted invoice for $1,500", time: "Yesterday", site: "42 Maple Dr" },
  { id: "a5", type: "info", text: "Woodcraft Plus accepted Cabinets workgroup", time: "Yesterday", site: "456 Oak Ave" },
];

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(n%1000===0?0:1)}K` : `$${n}`;
const fmtFull = (n) => `$${n.toLocaleString()}`;
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

/* ═══════════════════ DONUT CHART ═══════════════════ */
function Donut({ size = 100, strokeWidth = 10, segments, centerLabel, centerValue, centerSub }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0EDE8" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => {
          const dash = (seg.value / 100) * circ;
          const thisOffset = offset;
          offset += dash;
          return dash > 0 ? (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-thisOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease" }}
            />
          ) : null;
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {centerLabel && <span style={{ fontSize: 8, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.08em" }}>{centerLabel}</span>}
        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: size > 90 ? 18 : 14, fontWeight: 800, color: "#1A1814", lineHeight: 1.1 }}>{centerValue}</span>
        {centerSub && <span style={{ fontSize: 9, fontWeight: 600, color: "#9C8E7C", marginTop: 1 }}>{centerSub}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN ═══════════════════ */
export default function OwnerDashboard() {
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const s = MOCK_STATS;
  const greeting = time.getHours() < 12 ? "Good morning" : time.getHours() < 17 ? "Good afternoon" : "Good evening";
  const budgetHealth = pct(s.totalSpent + s.totalInvoiced, s.totalBudget);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#F7F6F3",
      fontFamily: "'Outfit', system-ui, sans-serif",
      opacity: ready ? 1 : 0, transition: "opacity .45s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideR { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        @keyframes scaleUp { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes gradMove { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:10px}
      `}</style>

      {/* ═══════ HEADER ═══════ */}
      <header style={{
        padding: "18px 32px 14px", flexShrink: 0,
        background: "#fff", borderBottom: "1px solid #ECEAE6",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
              {greeting}, Tom
            </h1>
            <p style={{ fontSize: 13, color: "#8C7E6A", fontWeight: 500, marginTop: 2 }}>
              {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {s.activeProjects} active projects
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{
              position: "relative", width: 38, height: 38, borderRadius: 10,
              border: "1px solid #ECEAE6", background: "#FAFAF8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C7E6A" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: 4, background: "#E55A3C", border: "2px solid #fff" }} />
            </button>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #3D6B5E, #5A9E8A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff",
            }}>TW</div>
          </div>
        </div>
      </header>

      {/* ═══════ ACTION BAR ═══════ */}
      {(s.pendingInvoices > 0 || s.pendingWorkgroups > 0) && (
        <div style={{
          padding: "10px 32px", background: "#FFF9F0", borderBottom: "1px solid #F0E6D4",
          display: "flex", alignItems: "center", gap: 14, animation: "fadeUp .4s .1s both",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: 4, background: "#E5963C", animation: "pulse 2s infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#8B6914", flex: 1 }}>
            {s.pendingWorkgroups + s.pendingInvoices} items need your attention — {s.pendingWorkgroups} workgroups, {s.pendingInvoices} invoices
          </span>
          <button style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: "linear-gradient(135deg, #E5963C, #D4841F)", border: "none", color: "#fff",
            boxShadow: "0 2px 8px rgba(229,150,60,0.25)",
          }}>Review All →</button>
        </div>
      )}

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px" }}>

        {/* ── PORTFOLIO SUMMARY ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 28, animation: "fadeUp .5s .12s both" }}>
          {[
            { label: "Total Budget", value: fmtFull(s.totalBudget), color: "#1A1814", accent: "#3D6B5E", bg: "#fff" },
            { label: "Total Paid", value: fmtFull(s.totalSpent), sub: `${pct(s.totalSpent, s.totalBudget)}% of budget`, color: "#3D8B6E", accent: "#3D8B6E", bg: "#FAFFF8" },
            { label: "Pending Invoices", value: fmtFull(s.totalInvoiced), sub: `${s.pendingInvoices} invoices to review`, color: "#C07B1A", accent: "#E5963C", bg: "#FFFCF5", urgent: true },
            { label: "Work Complete", value: `${pct(s.totalJobsDone, s.totalJobs)}%`, sub: `${s.totalJobsDone} of ${s.totalJobs} jobs`, color: "#2D6DB5", accent: "#2D6DB5", bg: "#F8FAFF" },
          ].map((card, i) => (
            <div key={card.label} style={{
              padding: "16px 18px", borderRadius: 14, background: card.bg,
              border: "1px solid #ECEAE6", animation: `fadeUp .4s ${i * 50 + 150}ms both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em" }}>{card.label}</span>
                {card.urgent && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#E5963C", animation: "pulse 2s infinite" }} />}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 24, fontWeight: 800, color: card.color, letterSpacing: "-0.03em" }}>{card.value}</span>
              {card.sub && <p style={{ fontSize: 11, color: "#9C8E7C", fontWeight: 500, marginTop: 4 }}>{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* ── SECTION: MY PROJECTS ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: "linear-gradient(180deg, #3D6B5E, #5AAE8F)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1A1814" }}>My Projects</h2>
          </div>
        </div>

        {/* ── PROJECT CARDS GRID (2 columns) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {MOCK_PROJECTS.map((proj, i) => {
            const isH = hovered === proj.id;
            const jobPct = pct(proj.jobsDone, proj.jobsCount);
            const paidPct = pct(proj.totalSpent, proj.totalBudget);
            const invoicedPct = pct(proj.totalInvoiced, proj.totalBudget);
            const remaining = proj.totalBudget - proj.totalSpent - proj.totalInvoiced;
            const remainingPct = pct(remaining, proj.totalBudget);

            // The key insight: paid vs work done gap
            const gap = paidPct - jobPct;
            let healthLabel, healthColor, healthBg;
            if (gap > 15) { healthLabel = "Overpaying"; healthColor = "#D44A2E"; healthBg = "#FEF0ED"; }
            else if (gap > 5) { healthLabel = "Watch"; healthColor = "#C07B1A"; healthBg = "#FFF8EE"; }
            else if (gap < -10) { healthLabel = "Great Value"; healthColor = "#3D8B6E"; healthBg = "#EDFAF4"; }
            else { healthLabel = "On Track"; healthColor = "#3D8B6E"; healthBg = "#EDFAF4"; }

            const hasPending = proj.pendingInvoices.length > 0;
            const pendingTotal = proj.pendingInvoices.reduce((a, inv) => a + inv.amount, 0);

            return (
              <div key={proj.id}
                onMouseEnter={() => setHovered(proj.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderRadius: 20, background: "#fff", border: `1px solid ${isH ? "#D0CABE" : "#ECEAE6"}`,
                  overflow: "hidden", cursor: "pointer",
                  transition: "all .25s ease",
                  transform: isH ? "translateY(-2px)" : "none",
                  boxShadow: isH ? "0 12px 32px -8px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                  animation: `scaleUp .45s ${i * 80 + 350}ms both`,
                }}>

                {/* ── Card Layout: Bento style ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", minHeight: 220 }}>

                  {/* LEFT: Main info + budget donut */}
                  <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
                    {/* Title + Health */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.01em" }}>{proj.title}</h3>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: healthBg, color: healthColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>{healthLabel}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#9C8E7C", fontWeight: 500 }}>
                        {proj.subtitle} · {proj.sitesCount} sites · {proj.workgroupsCount} trades
                      </p>
                    </div>

                    {/* Budget donut + legend */}
                    <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
                      <Donut
                        size={110} strokeWidth={12}
                        segments={[
                          { value: paidPct, color: "#3D8B6E" },
                          { value: invoicedPct, color: "#E5963C" },
                        ]}
                        centerLabel="Budget"
                        centerValue={fmt(proj.totalBudget)}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "Paid", value: fmt(proj.totalSpent), pctVal: `${paidPct}%`, color: "#3D8B6E", dot: "#3D8B6E" },
                          { label: "Invoiced", value: fmt(proj.totalInvoiced), pctVal: `${invoicedPct}%`, color: "#C07B1A", dot: "#E5963C" },
                          { label: "Remaining", value: fmt(remaining), pctVal: `${remainingPct}%`, color: "#9C8E7C", dot: "#E0DCD5" },
                        ].map(item => (
                          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 3, background: item.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: "#8C7E6A", fontWeight: 500, minWidth: 52 }}>{item.label}</span>
                            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</span>
                            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 600, color: "#B5A99A" }}>{item.pctVal}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Stacked info panels */}
                  <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #F0EDE8" }}>

                    {/* RIGHT TOP: Work vs Payment */}
                    <div style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", justifyContent: "center", borderBottom: "1px solid #F0EDE8" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                        Paid vs Done
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Donut
                          size={56} strokeWidth={7}
                          segments={[{ value: jobPct, color: "#2D6DB5" }]}
                          centerValue={`${jobPct}%`}
                        />
                        <div>
                          <p style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 700, color: "#2D6DB5" }}>{proj.jobsDone}/{proj.jobsCount} jobs</p>
                          <p style={{ fontSize: 10, color: "#9C8E7C", marginTop: 2 }}>work done</p>
                        </div>
                      </div>
                      {/* Gap indicator */}
                      <div style={{
                        padding: "5px 8px", borderRadius: 6,
                        background: gap > 5 ? "#FEF0ED" : gap < -5 ? "#EDFAF4" : "#F8F8F6",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: gap > 5 ? "#D44A2E" : gap < -5 ? "#3D8B6E" : "#8C7E6A" }}>
                          {gap > 5 ? `↑ Paid ${gap}% more than work done` : gap < -5 ? `✓ Work ahead of payment` : `≈ Paid & work aligned`}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT BOTTOM: Pending Invoices */}
                    <div style={{ flex: 1, padding: "14px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                        Pending Invoices
                      </span>
                      {hasPending ? (
                        <>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 800, color: "#C07B1A" }}>{proj.pendingInvoices.length}</span>
                            <span style={{ fontSize: 11, color: "#9C8E7C" }}>totaling</span>
                            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 700, color: "#C07B1A" }}>{fmtFull(pendingTotal)}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {proj.pendingInvoices.slice(0, 2).map((inv, j) => (
                              <div key={j} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 4, height: 4, borderRadius: 2, background: "#E5963C", flexShrink: 0 }} />
                                <span style={{ fontSize: 10, color: "#8C7E6A", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.contractor}</span>
                                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 700, color: "#C07B1A", marginLeft: "auto", flexShrink: 0 }}>{fmt(inv.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>✓</span>
                          <span style={{ fontSize: 12, color: "#3D8B6E", fontWeight: 600 }}>All clear</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom bar: Timeline + Quick link */}
                <div style={{
                  padding: "8px 22px", background: "#FAFAF8", borderTop: "1px solid #F0EDE8",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 11, color: "#9C8E7C", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#B5A99A" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(proj.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(proj.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3D6B5E", display: "flex", alignItems: "center", gap: 3, opacity: isH ? 1 : 0, transition: "opacity .2s" }}>
                    View details
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TWO COLUMN: INSIGHTS + ACTIVITY ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* AI Insights */}
          <div style={{ animation: "fadeUp .45s .6s both" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid #ECEAE6" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg, #3D6B5E, #2D6DB5, #8B5FA8)", backgroundSize: "200% 100%", animation: "gradMove 6s ease infinite" }} />
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1A1814" }}>AI Insights</span>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#3D8B6E", padding: "3px 10px", borderRadius: 20, background: "#EDFAF4" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3D8B6E", animation: "pulse 2s infinite" }} />Live
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {MOCK_INSIGHTS.map((ins, i) => {
                    const sev = ins.severity === "critical"
                      ? { bg: "#FEF0ED", border: "#F5C5BA", color: "#9E3623", icon: "▲" }
                      : ins.severity === "warning"
                      ? { bg: "#FFF8EE", border: "#F0D9A8", color: "#7A5610", icon: "●" }
                      : { bg: "#EDFAF4", border: "#B5E2CC", color: "#2B6B52", icon: "✓" };
                    return (
                      <div key={ins.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: sev.bg, border: `1px solid ${sev.border}`, animation: `slideR .35s ${i * 60 + 700}ms both` }}>
                        <span style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: `${sev.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: sev.color, fontWeight: 700, marginTop: 1 }}>{sev.icon}</span>
                        <p style={{ fontSize: 12, color: sev.color, lineHeight: 1.5, fontWeight: 500 }}>{ins.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Activity + Quick Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .45s .65s both" }}>

            {/* Needs Attention mini */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { v: s.pendingWorkgroups, l: "Pending WGs", color: "#C07B1A", bg: "#FFF8EE", border: "#F0D9A8" },
                { v: s.pendingInvoices, l: "Invoices", color: "#D44A2E", bg: "#FEF0ED", border: "#F5C5BA" },
                { v: s.activeProjects, l: "Active Sites", color: "#2D6DB5", bg: "#EFF5FC", border: "#BDD4EF" },
              ].map((item, i) => (
                <div key={item.l} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center", background: item.bg, border: `1px solid ${item.border}`, cursor: "pointer", animation: `scaleUp .3s ${i * 40 + 700}ms both` }}>
                  <p style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.v}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: item.color, opacity: 0.7, marginTop: 3 }}>{item.l}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={{ borderRadius: 16, padding: "16px 18px", background: "#fff", border: "1px solid #ECEAE6", flex: 1 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9C8E7C" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Recent Activity
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {MOCK_ACTIVITY.map((item, i) => {
                  const dotColor = item.type === "success" ? "#3D8B6E" : item.type === "warning" ? "#E5963C" : "#2D6DB5";
                  return (
                    <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: `slideR .3s ${i * 40 + 800}ms both` }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: "#3D3529", fontWeight: 500, lineHeight: 1.4 }}>{item.text}</p>
                        <p style={{ fontSize: 10, color: "#B0A794", marginTop: 1 }}>{item.time} · {item.site}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Agent Status */}
            <div style={{
              borderRadius: 14, padding: "12px 14px",
              background: "linear-gradient(135deg, #F0F7F4, #EEF3F9)",
              border: "1px solid #D5E3DA",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /><circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#2B5248" }}>AI Agent Active</p>
                <p style={{ fontSize: 11, color: "#6B917F", fontWeight: 500 }}>Monitoring 8 workgroups across 3 worksites</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
