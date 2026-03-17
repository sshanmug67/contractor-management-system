/**
 * StepReview — Summary card + "Create Project" confirmation
 *
 * File: src/components/scaffold/StepReview.tsx
 */

import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";

interface Props {
  wizard: ScaffoldWizardHook;
}

const TRADE_COLORS: Record<string, string> = {
  Demo: "#8C7E6A", Framing: "#C07B1A", Electrical: "#2D6DB5",
  Plumbing: "#2D7D9E", HVAC: "#2E7D5F", Drywall: "#7B5EA7",
  Painting: "#C05A7A", Flooring: "#9E5A3C",
};

export function StepReview({ wizard }: Props) {
  const { state, updateField, scaffoldStats } = wizard;

  const fmt = (n: number): string =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `$${n}`;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
      {/* Summary Card */}
      <div style={{
        background: "#fff", borderRadius: 14,
        border: "2px solid #ECEAE6", padding: 24, marginBottom: 16,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1814" }}>
              {state.projectName || "Untitled Project"}
            </div>
            <div style={{ fontSize: 13, color: "#8C7E6A", marginTop: 2 }}>
              {state.industry ? state.industry.replace(/_/g, " ") : ""}
              {state.projectSubtype
                ? ` · ${state.projectSubtype.replace(/_/g, " ")}`
                : ""}
            </div>
          </div>
          <span style={{
            padding: "4px 12px", borderRadius: 6,
            fontSize: 11, fontWeight: 700, color: "#fff",
            background:
              state.projectType === "contract"
                ? "linear-gradient(135deg, #C07B1A, #E5A63B)"
                : "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
          }}>
            {state.projectType === "contract" ? "Contract" : "Direct"}
          </span>
        </div>

        {/* KPI Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12, marginBottom: 20,
        }}>
          {[
            {
              label: "Budget",
              value: state.totalBudget ? fmt(state.totalBudget) : "—",
              color: "#1A1814",
            },
            {
              label: "Workgroups",
              value: String(scaffoldStats?.workgroupCount || 0),
              color: "#2D6DB5",
            },
            {
              label: "Jobs",
              value: String(scaffoldStats?.jobCount || 0),
              color: "#2D6DB5",
            },
            {
              label: "Est. Duration",
              value: `${scaffoldStats?.estimatedDays || 0} days`,
              color: "#2E7D5F",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#FAF9F6", borderRadius: 10,
                padding: 12, textAlign: "center",
              }}
            >
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18, fontWeight: 800, color: s.color,
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600, color: "#9C8E7C",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginTop: 2,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Workgroup List */}
        <div style={{
          borderTop: "1px solid #ECEAE6", paddingTop: 16,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#6B5F4F", marginBottom: 10,
          }}>
            Workgroups
          </div>
          {state.scaffold?.workgroups.map((wg, i) => {
            const jobCount = state.scaffold!.jobs.filter(
              (j) => j.workgroup_index === i
            ).length;
            const tradeColor = TRADE_COLORS[wg.trade] || "#8C7E6A";
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 0",
                  borderBottom:
                    i < (state.scaffold?.workgroups.length || 0) - 1
                      ? "1px solid #F5F3EF"
                      : "none",
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: tradeColor,
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 600, color: "#1A1814", flex: 1,
                }}>
                  {wg.title}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: tradeColor,
                }}>
                  {wg.trade}
                </span>
                <span style={{ fontSize: 12, color: "#8C7E6A" }}>
                  {jobCount} jobs
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save as Template */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
      }}>
        <input
          type="checkbox"
          id="save-tmpl"
          checked={state.saveAsTemplate}
          onChange={(e) => updateField("saveAsTemplate", e.target.checked)}
          style={{
            width: 16, height: 16, accentColor: "#3D6B5E",
            cursor: "pointer",
          }}
        />
        <label
          htmlFor="save-tmpl"
          style={{
            fontSize: 13, color: "#6B5F4F", cursor: "pointer",
          }}
        >
          Save this as a reusable template
        </label>
      </div>

      {state.saveAsTemplate && (
        <input
          placeholder="Template name"
          value={state.templateName}
          onChange={(e) => updateField("templateName", e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "2px solid #ECEAE6", fontSize: 14,
            fontFamily: "'Outfit', sans-serif", background: "#FAF9F6",
            outline: "none", marginBottom: 16,
          }}
        />
      )}

      {/* Ready Callout */}
      <div style={{
        padding: "14px 18px", borderRadius: 12,
        background: "#EDFAF4", border: "1.5px solid #B5E2CC",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 16 }}>🚀</span>
        <span style={{ fontSize: 13, color: "#2B5248", lineHeight: 1.5 }}>
          Ready to go! You'll be taken to your project dashboard where you
          can assign contractors and start tracking.
        </span>
      </div>

      {/* Error */}
      {state.createError && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: "#FEF0ED", border: "1.5px solid #F5C5BA",
        }}>
          <span style={{ fontSize: 13, color: "#D44A2E", fontWeight: 600 }}>
            {state.createError}
          </span>
        </div>
      )}
    </div>
  );
}
