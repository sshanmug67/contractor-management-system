/**
 * StepSettings — Payment terms, retainage, draw frequency
 *
 * File: src/components/scaffold/StepSettings.tsx
 */

import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";

interface Props {
  wizard: ScaffoldWizardHook;
}

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: { value: any; label: string }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div style={{
      display: "flex", gap: 0, borderRadius: 10,
      overflow: "hidden", border: "2px solid #ECEAE6",
    }}>
      {options.map((opt) => {
        const isOn = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: 10, fontSize: 13, fontWeight: 700,
              textAlign: "center", cursor: "pointer", border: "none",
              fontFamily: "'Outfit', sans-serif", transition: "all .15s",
              background: isOn
                ? "linear-gradient(135deg, #3D6B5E, #5AAE8F)"
                : "#FAF9F6",
              color: isOn ? "#fff" : "#8C7E6A",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StepSettings({ wizard }: Props) {
  const { state, updateSettings } = wizard;
  const isContract = state.projectType === "contract";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Contractor Payments */}
        <div style={{
          background: "#fff", borderRadius: 14,
          border: "2px solid #ECEAE6", padding: 20,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#1A1814", marginBottom: 16,
          }}>
            Contractor payments
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#6B5F4F",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 6,
            }}>
              Payment terms
            </div>
            <ToggleRow
              options={[
                { value: 15, label: "Net 15" },
                { value: 30, label: "Net 30" },
                { value: 45, label: "Net 45" },
              ]}
              value={state.settings.contractor_payment_terms}
              onChange={(v) => updateSettings("contractor_payment_terms", v)}
            />
          </div>

          <div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#6B5F4F",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 6,
            }}>
              Sub-retainage
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <input
                type="range" min="0" max="20" step="1"
                value={Math.round(state.settings.sub_retainage_pct * 100)}
                onChange={(e) =>
                  updateSettings(
                    "sub_retainage_pct",
                    parseInt(e.target.value) / 100
                  )
                }
                style={{ flex: 1, accentColor: "#3D6B5E" }}
              />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14, fontWeight: 700, color: "#1A1814",
                minWidth: 40, textAlign: "right",
              }}>
                {Math.round(state.settings.sub_retainage_pct * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Client Billing */}
        {isContract ? (
          <div style={{
            background: "#FFF8EE", borderRadius: 14,
            border: "2px solid #F0D9A8", padding: 20,
            animation: "fadeUp .25s ease",
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#C07B1A", marginBottom: 16,
            }}>
              Client billing
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "#6B5F4F",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 6,
              }}>
                Client payment terms
              </div>
              <ToggleRow
                options={[
                  { value: 30, label: "Net 30" },
                  { value: 45, label: "Net 45" },
                  { value: 60, label: "Net 60" },
                ]}
                value={state.settings.client_payment_terms || 30}
                onChange={(v) => updateSettings("client_payment_terms", v)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "#6B5F4F",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 6,
              }}>
                Retainage held
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range" min="0" max="20" step="1"
                  value={Math.round(state.settings.retainage_pct * 100)}
                  onChange={(e) =>
                    updateSettings(
                      "retainage_pct",
                      parseInt(e.target.value) / 100
                    )
                  }
                  style={{ flex: 1, accentColor: "#C07B1A" }}
                />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 700, color: "#C07B1A",
                  minWidth: 40, textAlign: "right",
                }}>
                  {Math.round(state.settings.retainage_pct * 100)}%
                </span>
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "#6B5F4F",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 6,
              }}>
                Draw frequency
              </div>
              <ToggleRow
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "milestone", label: "Milestone" },
                  { value: "manual", label: "Manual" },
                ]}
                value={state.settings.draw_frequency}
                onChange={(v) => updateSettings("draw_frequency", v)}
              />
            </div>
          </div>
        ) : (
          <div style={{
            background: "#FAF9F6", borderRadius: 14,
            border: "2px solid #DDD7CC", padding: 20,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#8C7E6A", marginBottom: 16,
            }}>
              Client billing
            </div>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 13, color: "#B5A99A" }}>
                No client billing for Direct projects
              </div>
              <div style={{ fontSize: 12, color: "#DDD7CC", marginTop: 4 }}>
                Switch to Contract type to configure
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Callout */}
      <div style={{
        marginTop: 20, padding: "14px 18px", borderRadius: 12,
        background: "#EFF5FC", border: "1.5px solid #BDD4EF",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <span style={{ fontSize: 13, color: "#2D6DB5", lineHeight: 1.5 }}>
          Payment terms affect your cash flow projections. Net 15 for
          contractors means faster payments but tighter cash position.
        </span>
      </div>
    </div>
  );
}
