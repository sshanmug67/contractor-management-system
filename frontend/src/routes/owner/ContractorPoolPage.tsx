/**
 * ContractorPoolPage — Browse and Manage Contractors
 *
 * Features:
 *   - Stat cards (total, verified, pending, trades)
 *   - Search + trade/status filters
 *   - Card grid with contractor info
 *   - Slide-in detail drawer (workers, workgroups, verifications)
 *   - Add contractor modal
 *
 * Design: Matches CMS warm earth tone palette
 * File: routes/owner/ContractorPoolPage.tsx
 */

import { useState, useEffect, useCallback, type ReactNode } from "react";
import contractorService from "@/services/contractorService";
import type { ContractorDTO, ContractorDetailDTO, ContractorStatsDTO } from "@/services/contractorService";

/* ═══════════════════ STYLES ═══════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleUp{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.07);border-radius:10px}
`;

/* ═══════════════════ HELPERS ═══════════════════ */
const fmt = (n: number): string => `$${n.toLocaleString()}`;
const timeAgo = (dateStr: string | null): string => {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

/* ═══════════════════ VERIFICATION BADGE ═══════════════════ */
const VERIFY_STYLES: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  verified: { label: "Verified", color: "#2E7D5F", bg: "#EDFAF4", border: "#B5E2CC", icon: "✓" },
  pending:  { label: "Pending",  color: "#C07B1A", bg: "#FFF8EE", border: "#F0D9A8", icon: "◷" },
  flagged:  { label: "Flagged",  color: "#D44A2E", bg: "#FEF0ED", border: "#F5C5BA", icon: "!" },
};

function VerifyBadge({ status }: { status: string }) {
  const s = VERIFY_STYLES[status] || VERIFY_STYLES.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <span style={{ fontSize: 10 }}>{s.icon}</span>{s.label}
    </span>
  );
}

/* ═══════════════════ STAR RATING ═══════════════════ */
function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? "#E5963C" : i === full && half ? "url(#half)" : "#DDD7CC"} stroke="none">
          {i === full && half && (
            <defs><linearGradient id="half"><stop offset="50%" stopColor="#E5963C" /><stop offset="50%" stopColor="#DDD7CC" /></linearGradient></defs>
          )}
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size - 1, fontWeight: 700, color: "#8C7E6A", marginLeft: 3 }}>
        {rating > 0 ? rating.toFixed(1) : "—"}
      </span>
    </span>
  );
}

/* ═══════════════════ SKILL PILL ═══════════════════ */
function SkillPill({ skill }: { skill: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 5,
      fontSize: 11, fontWeight: 600, background: "#EFF5FC",
      color: "#2D6DB5", border: "1px solid #B3D4F0",
      whiteSpace: "nowrap",
    }}>
      {skill}
    </span>
  );
}

/* ═══════════════════ CONTRACTOR CARD ═══════════════════ */
function ContractorCard({ c, onClick, delay }: {
  c: ContractorDTO; onClick: () => void; delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  const location = [c.city, c.state].filter(Boolean).join(", ") || "No location";
  const activeSkills = (c.skills || []).slice(0, 4);
  const moreSkills = (c.skills || []).length - 4;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14, background: "#fff",
        border: `1.5px solid ${hovered ? "#A89880" : "#DDD7CC"}`,
        padding: "16px 18px", cursor: "pointer",
        transition: "all .2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 8px 24px -4px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.02)",
        animation: `scaleUp .35s ${delay}ms both`,
        opacity: c.is_active ? 1 : 0.55,
      }}
    >
      {/* Header: name + verification */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.01em", fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>
            {c.company_name}
          </h3>
          {c.owner_name && (
            <p style={{ fontSize: 12, color: "#8C7E6A", fontWeight: 500 }}>{c.owner_name}</p>
          )}
        </div>
        <VerifyBadge status={c.verification_status} />
      </div>

      {/* Location + contact */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 12, color: "#6B5F4F" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8C7E6A" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8C7E6A" strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
          </svg>
          {c.phone}
        </span>
      </div>

      {/* Rating */}
      <div style={{ marginBottom: 10 }}>
        <Stars rating={Number(c.rating) || 0} />
      </div>

      {/* Skills */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {activeSkills.map(s => <SkillPill key={s} skill={s} />)}
        {moreSkills > 0 && (
          <span style={{ fontSize: 11, color: "#8C7E6A", fontWeight: 600, padding: "2px 4px" }}>+{moreSkills}</span>
        )}
        {activeSkills.length === 0 && (
          <span style={{ fontSize: 11, color: "#B0A794", fontStyle: "italic" }}>No trades listed</span>
        )}
      </div>

      {/* Footer: license + last verified */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #ECEAE6" }}>
        <span style={{ fontSize: 11, color: "#9C8E7C" }}>
          {c.license_number ? `Lic: ${c.license_number}` : "No license"}
        </span>
        <span style={{ fontSize: 11, color: "#9C8E7C" }}>
          Verified: {timeAgo(c.last_verified_at)}
        </span>
      </div>

      {/* Hover hint */}
      <div style={{ textAlign: "right", marginTop: 4, height: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#3D6B5E", opacity: hovered ? 1 : 0, transition: "opacity .2s" }}>View details →</span>
      </div>
    </div>
  );
}

/* ═══════════════════ DETAIL DRAWER ═══════════════════ */
function ContractorDrawer({ contractorId, onClose }: {
  contractorId: string; onClose: () => void;
}) {
  const [detail, setDetail] = useState<ContractorDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "workers" | "workgroups" | "verifications">("info");

  useEffect(() => {
    setLoading(true);
    contractorService.getDetail(contractorId)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contractorId]);

  const c = detail?.contractor;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 998,
        animation: "fadeUp .2s both",
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        background: "#fff", zIndex: 999, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        animation: "slideIn .3s both",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}>
        {/* Drawer header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1A1814" }}>
              {loading ? "Loading..." : c?.company_name || "Contractor"}
            </h2>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 7, border: "1px solid #ECEAE6",
              background: "#FAFAF8", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14, color: "#8C7E6A",
            }}>✕</button>
          </div>
          {c && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <VerifyBadge status={c.verification_status} />
              <Stars rating={Number(c.rating) || 0} size={11} />
              {!c.is_active && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#D44A2E", background: "#FEF0ED", padding: "2px 6px", borderRadius: 4 }}>Inactive</span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #ECEAE6", padding: "0 20px", flexShrink: 0 }}>
          {(["info", "workers", "workgroups", "verifications"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 14px", border: "none", background: "none",
                fontSize: 12, fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? "#1A1814" : "#8C7E6A",
                borderBottom: activeTab === tab ? "2px solid #3D6B5E" : "2px solid transparent",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                textTransform: "capitalize", transition: "all .15s",
              }}
            >
              {tab}
              {tab === "workers" && detail && <span style={{ marginLeft: 4, fontSize: 10, color: "#9C8E7C" }}>({detail.workers.length})</span>}
              {tab === "workgroups" && detail && <span style={{ marginLeft: 4, fontSize: 10, color: "#9C8E7C" }}>({detail.active_workgroups.length})</span>}
              {tab === "verifications" && detail && <span style={{ marginLeft: 4, fontSize: 10, color: "#9C8E7C" }}>({detail.verifications.length})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#8C7E6A" }}>Loading details...</p>
            </div>
          ) : !c ? (
            <p style={{ fontSize: 14, color: "#D44A2E" }}>Contractor not found</p>
          ) : (
            <>
              {/* ── Info Tab ── */}
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Contact */}
                  <Section title="Contact">
                    <InfoRow label="Owner" value={c.owner_name || "—"} />
                    <InfoRow label="Email" value={c.email} />
                    <InfoRow label="Phone" value={c.phone} />
                    <InfoRow label="Address" value={[c.address_line1, c.city, c.state, c.zip_code].filter(Boolean).join(", ") || "—"} />
                  </Section>

                  {/* License & Insurance */}
                  <Section title="License & Insurance">
                    <InfoRow label="License #" value={c.license_number || "Not provided"} />
                    <InfoRow label="Last verified" value={c.last_verified_at ? new Date(c.last_verified_at).toLocaleDateString() : "Never"} />
                    {c.insurance_info && Object.keys(c.insurance_info).length > 0 && (
                      <InfoRow label="Insurance" value="On file" />
                    )}
                  </Section>

                  {/* Skills */}
                  <Section title="Trades & Skills">
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(c.skills || []).length > 0 ? (
                        c.skills.map(s => <SkillPill key={s} skill={s} />)
                      ) : (
                        <span style={{ fontSize: 12, color: "#9C8E7C", fontStyle: "italic" }}>No trades listed</span>
                      )}
                    </div>
                  </Section>

                  {/* Performance */}
                  <Section title="Performance">
                    <InfoRow label="Rating" value={Number(c.rating) > 0 ? `${Number(c.rating).toFixed(1)} / 5.0` : "No ratings yet"} />
                    <InfoRow label="Member since" value={new Date(c.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })} />
                  </Section>
                </div>
              )}

              {/* ── Workers Tab ── */}
              {activeTab === "workers" && (
                <div>
                  {detail!.workers.length === 0 ? (
                    <EmptyState text="No workers registered yet" sub="Workers self-identify via QR check-in" />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {detail!.workers.map((w, i) => (
                        <div key={w.id} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                          borderRadius: 10, background: i % 2 === 0 ? "#FAFAF8" : "#fff",
                          border: "1px solid #ECEAE6",
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "#fff",
                          }}>
                            {w.first_name[0]}{w.last_name[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1814" }}>{w.first_name} {w.last_name}</p>
                            <p style={{ fontSize: 11, color: "#8C7E6A" }}>{w.phone}{w.email ? ` · ${w.email}` : ""}</p>
                          </div>
                          <span style={{ fontSize: 11, color: "#9C8E7C" }}>
                            Last active: {timeAgo(w.last_active_at || w.first_seen_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Workgroups Tab ── */}
              {activeTab === "workgroups" && (
                <div>
                  {detail!.active_workgroups.length === 0 ? (
                    <EmptyState text="No active workgroups" sub="Assign this contractor to a workgroup from the project view" />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {detail!.active_workgroups.map((wg: any) => {
                        const statusColor = wg.status === "in_progress" ? "#2E7D5F" : wg.status === "pending" ? "#C07B1A" : "#2D6DB5";
                        return (
                          <div key={wg.id} style={{
                            padding: "10px 12px", borderRadius: 10,
                            border: "1px solid #ECEAE6", background: "#fff",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814" }}>{wg.title}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${statusColor}10`, color: statusColor, textTransform: "uppercase" }}>{wg.status}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#8C7E6A" }}>
                              {wg.trade && <span>{wg.trade} · </span>}
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(Number(wg.budget || 0))}</span>
                              {wg.worksites?.name && <span> · {wg.worksites.name}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Verifications Tab ── */}
              {activeTab === "verifications" && (
                <div>
                  {detail!.verifications.length === 0 ? (
                    <EmptyState text="No verifications on record" sub="Run a verification check to validate license and insurance" />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {detail!.verifications.map(v => {
                        const vs = v.status === "passed" ? { color: "#2E7D5F", bg: "#EDFAF4" }
                          : v.status === "failed" ? { color: "#D44A2E", bg: "#FEF0ED" }
                          : v.status === "expired" ? { color: "#C07B1A", bg: "#FFF8EE" }
                          : { color: "#8C7E6A", bg: "#F5F3EF" };
                        return (
                          <div key={v.id} style={{
                            padding: "10px 12px", borderRadius: 10,
                            border: "1px solid #ECEAE6", background: "#fff",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1814", textTransform: "capitalize" }}>{v.verification_type}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: vs.bg, color: vs.color, textTransform: "uppercase" }}>{v.status}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#8C7E6A" }}>
                              {v.verified_at && <span>Verified: {new Date(v.verified_at).toLocaleDateString()} · </span>}
                              {v.expires_at && <span>Expires: {new Date(v.expires_at).toLocaleDateString()}</span>}
                              {v.source_url && <span> · <a href={v.source_url} target="_blank" rel="noopener" style={{ color: "#2D6DB5" }}>Source</a></span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Small helper components ── */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 style={{ fontSize: 11, fontWeight: 800, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#8C7E6A", minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1A1814", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px" }}>
      <p style={{ fontSize: 14, color: "#6B5F4F", fontWeight: 600, marginBottom: 4 }}>{text}</p>
      <p style={{ fontSize: 12, color: "#9C8E7C" }}>{sub}</p>
    </div>
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export function ContractorPoolPage() {
  const [contractors, setContractors] = useState<ContractorDTO[]>([]);
  const [stats, setStats] = useState<ContractorStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Ready animation
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  // Fetch data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractorList, contractorStats] = await Promise.all([
        contractorService.list({
          search: search || undefined,
          trade: tradeFilter || undefined,
          status: statusFilter || undefined,
        }),
        contractorService.getStats(),
      ]);
      setContractors(contractorList);
      setStats(contractorStats);
    } catch (err: any) {
      setError(err?.message || "Failed to load contractors");
    } finally {
      setLoading(false);
    }
  }, [search, tradeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Available trades from stats
  const trades = stats?.trades || [];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#FCFBF9", fontFamily: "'Outfit', system-ui, sans-serif",
      opacity: ready ? 1 : 0, transition: "opacity .4s ease",
    }}>
      <style>{css}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "16px 24px 12px", background: "#fff", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>Contractor Pool</h1>
              <p style={{ fontSize: 13, color: "#8C7E6A" }}>Browse and manage contractors</p>
            </div>
          </div>
          <button
            onClick={() => {/* TODO: open add contractor modal */}}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              boxShadow: "0 2px 8px rgba(61,107,94,0.25)",
              transition: "all .15s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Contractor
          </button>
        </div>

        {/* ═══ STAT CARDS ═══ */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, animation: "fadeUp .3s .1s both" }}>
            {[
              { label: "Total", value: stats.total, color: "#1A1814", bg: "#fff" },
              { label: "Active", value: stats.active, color: "#2E7D5F", bg: "#EDFAF4" },
              { label: "Verified", value: stats.verified, color: "#2D6DB5", bg: "#EFF5FC" },
              { label: "Pending", value: stats.pending_verification, color: "#C07B1A", bg: "#FFF8EE" },
              { label: "Trades", value: stats.unique_trades, color: "#7B5EA7", bg: "#F8F4FC" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "10px 12px", borderRadius: 10, background: s.bg,
                border: "1px solid #ECEAE6", textAlign: "center",
              }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9C8E7C", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FILTER BAR ═══ */}
      <div style={{ padding: "10px 24px", background: "#fff", borderBottom: "1px solid #ECEAE6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, animation: "fadeUp .3s .15s both" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9C8E7C" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search contractors..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: "100%", padding: "7px 12px 7px 32px", borderRadius: 8,
              border: "1.5px solid #DDD7CC", fontSize: 13, fontFamily: "'Outfit', sans-serif",
              color: "#1A1814", outline: "none", background: "#FAFAF8",
              transition: "border-color .15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#3D6B5E"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#DDD7CC"; }}
          />
        </div>

        {/* Trade filter */}
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          style={{
            padding: "7px 28px 7px 10px", borderRadius: 8,
            border: "1.5px solid #DDD7CC", fontSize: 12, fontFamily: "'Outfit', sans-serif",
            color: tradeFilter ? "#1A1814" : "#9C8E7C", background: "#FAFAF8",
            cursor: "pointer", outline: "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239C8E7C' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">All trades</option>
          {trades.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "7px 28px 7px 10px", borderRadius: 8,
            border: "1.5px solid #DDD7CC", fontSize: 12, fontFamily: "'Outfit', sans-serif",
            color: statusFilter ? "#1A1814" : "#9C8E7C", background: "#FAFAF8",
            cursor: "pointer", outline: "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239C8E7C' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
        </select>

        {/* Result count */}
        <span style={{ fontSize: 12, color: "#9C8E7C", marginLeft: "auto" }}>
          {contractors.length} contractor{contractors.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ═══ CARD GRID ═══ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #ECEAE6", borderTopColor: "#3D6B5E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
            <p style={{ fontSize: 13, color: "#8C7E6A" }}>Loading contractors...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#D44A2E", marginBottom: 8 }}>Failed to load</p>
            <p style={{ fontSize: 13, color: "#8C7E6A", marginBottom: 16 }}>{error}</p>
            <button onClick={load} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #D44A2E, #E8705A)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Retry</button>
          </div>
        ) : contractors.length === 0 ? (
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1A1814", marginBottom: 4 }}>
              {search || tradeFilter || statusFilter ? "No contractors match your filters" : "No contractors yet"}
            </p>
            <p style={{ fontSize: 13, color: "#8C7E6A", marginBottom: 16 }}>
              {search || tradeFilter || statusFilter ? "Try adjusting your search or filters" : "Add your first contractor to start building your pool"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {contractors.map((c, i) => (
              <ContractorCard
                key={c.id}
                c={c}
                onClick={() => setSelectedId(c.id)}
                delay={i * 40 + 200}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ DETAIL DRAWER ═══ */}
      {selectedId && (
        <ContractorDrawer
          contractorId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export default ContractorPoolPage;
