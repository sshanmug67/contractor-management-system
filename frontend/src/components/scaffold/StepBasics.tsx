/**
 * StepBasics — Project name, type, industry, contract details
 *
 * File: src/components/scaffold/StepBasics.tsx
 */

import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";
import { INDUSTRIES, SUBTYPES } from "@/types/scaffold";

interface Props {
  wizard: ScaffoldWizardHook;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "2px solid #ECEAE6", fontSize: 14,
  fontFamily: "'Outfit', sans-serif", outline: "none",
  background: "#FAF9F6", transition: "border .15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "#6B5F4F",
  textTransform: "uppercase" as const, letterSpacing: "0.06em",
  marginBottom: 6, display: "block",
};

export function StepBasics({ wizard }: Props) {
  const { state, updateField, updateSettings } = wizard;
  const subtypes = SUBTYPES[state.industry] || [];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
      {/* Project Name */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Project name</label>
        <input
          style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }}
          placeholder="e.g. Johnson Kitchen Remodel"
          value={state.projectName}
          onChange={(e) => updateField("projectName", e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "#3D6B5E")}
          onBlur={(e) => (e.target.style.borderColor = "#ECEAE6")}
        />
      </div>

      {/* Project Type Toggle */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Project type</label>
        <div style={{
          display: "flex", gap: 0, borderRadius: 10,
          overflow: "hidden", border: "2px solid #ECEAE6",
        }}>
          {(["direct", "contract"] as const).map((type) => {
            const isOn = state.projectType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  updateField("projectType", type);
                  updateSettings("project_type", type);
                }}
                style={{
                  flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 700,
                  textAlign: "center" as const, cursor: "pointer",
                  transition: "all .15s", border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  background: isOn
                    ? "linear-gradient(135deg, #3D6B5E, #5AAE8F)"
                    : "#FAF9F6",
                  color: isOn ? "#fff" : "#8C7E6A",
                }}
              >
                <div>{type === "direct" ? "Direct" : "Contract"}</div>
                <div style={{
                  fontSize: 11, fontWeight: 500, opacity: 0.8, marginTop: 2,
                }}>
                  {type === "direct"
                    ? "You manage contractors directly"
                    : "Working under a client contract"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Industry + Subtype */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Industry</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={state.industry}
            onChange={(e) => {
              updateField("industry", e.target.value);
              updateField("projectSubtype", "");
            }}
          >
            <option value="">Select industry...</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Project subtype</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={state.projectSubtype}
            onChange={(e) => updateField("projectSubtype", e.target.value)}
            disabled={subtypes.length === 0}
          >
            <option value="">
              {subtypes.length === 0 ? "Select industry first" : "Select subtype..."}
            </option>
            {subtypes.map((sub) => (
              <option key={sub.value} value={sub.value}>{sub.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contract Details (conditional) */}
      {state.projectType === "contract" && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 24,
          background: "#FFF8EE", border: "1.5px solid #F0D9A8",
          animation: "fadeUp .25s ease",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#C07B1A" }}>
              Contract details
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Client name</label>
              <input
                style={inputStyle}
                placeholder="Client company"
                value={state.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Contract value</label>
              <input
                style={{
                  ...inputStyle,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                placeholder="$0.00"
                value={state.contractValue ? `$${state.contractValue.toLocaleString()}` : ""}
                onChange={(e) => {
                  const num = parseFloat(e.target.value.replace(/[$,]/g, ""));
                  updateField("contractValue", isNaN(num) ? null : num);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Budget + Start Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Estimated budget</label>
          <input
            style={{
              ...inputStyle,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            placeholder="$0.00"
            value={state.totalBudget ? `$${state.totalBudget.toLocaleString()}` : ""}
            onChange={(e) => {
              const num = parseFloat(e.target.value.replace(/[$,]/g, ""));
              updateField("totalBudget", isNaN(num) ? null : num);
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Target start date</label>
          <input
            type="date"
            style={inputStyle}
            value={state.startDate || ""}
            onChange={(e) => updateField("startDate", e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}
