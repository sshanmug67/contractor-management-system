/**
 * StepBuildPlan — Template picker / AI description + ScaffoldEditor
 *
 * Shows either:
 *   - TemplatePicker (if path=template, no scaffold yet)
 *   - AI description form (if path=ai, no scaffold yet)
 *   - ScaffoldEditor (once scaffold is loaded/generated)
 *
 * File: src/components/scaffold/StepBuildPlan.tsx
 */

import { useState, useEffect } from "react";
import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";
import type { TemplateListItem, QuickStartTemplate } from "@/types/scaffold";
import scaffoldService from "@/services/scaffoldService";
import { ScaffoldEditor } from "./ScaffoldEditor";

interface Props {
  wizard: ScaffoldWizardHook;
}

export function StepBuildPlan({ wizard }: Props) {
  const { state } = wizard;

  // Once we have a scaffold, show the editor (full-width)
  if (state.scaffold) {
    return <ScaffoldEditor wizard={wizard} />;
  }

  // Otherwise, show the input form for the chosen path
  if (state.buildPath === "template") {
    return <TemplatePicker wizard={wizard} />;
  }

  return <AIDescriptionForm wizard={wizard} />;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE PICKER
// ═══════════════════════════════════════════════════════════

function TemplatePicker({ wizard }: { wizard: ScaffoldWizardHook }) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    scaffoldService.listTemplates({ include_system: true }).then((data) => {
      setTemplates(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = templates.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.industry || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (templateId: string) => {
    setSelected(templateId);
    await wizard.loadTemplate(templateId);
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1814" }}>
            Choose a template
          </div>
          <div style={{ fontSize: 13, color: "#8C7E6A" }}>
            Select a starting structure for your project
          </div>
        </div>
        <input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 220, padding: "8px 12px", borderRadius: 8,
            border: "1.5px solid #ECEAE6", fontSize: 13,
            fontFamily: "'Outfit', sans-serif", background: "#FAF9F6",
            outline: "none",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{
            width: 32, height: 32, border: "3px solid #ECEAE6",
            borderTopColor: "#3D6B5E", borderRadius: "50%",
            animation: "spin 1s linear infinite", margin: "0 auto 12px",
          }} />
          <p style={{ fontSize: 13, color: "#8C7E6A" }}>Loading templates...</p>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
        }}>
          {filtered.map((t) => {
            const isSel = selected === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelect(t.id)}
                style={{
                  background: isSel ? "#EDFAF4" : "#fff",
                  borderRadius: 12,
                  border: `2px solid ${isSel ? "#3D6B5E" : "#ECEAE6"}`,
                  padding: 16, cursor: "pointer", transition: "all .15s",
                  boxShadow: isSel
                    ? "0 0 0 2px rgba(61,107,94,0.15)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSel) e.currentTarget.style.borderColor = "#3D6B5E";
                }}
                onMouseLeave={(e) => {
                  if (!isSel) e.currentTarget.style.borderColor = "#ECEAE6";
                }}
              >
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 8,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1814" }}>
                    {t.name}
                  </span>
                  {isSel && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 5,
                      fontSize: 10, fontWeight: 700,
                      background: "#EDFAF4", color: "#2E7D5F",
                    }}>
                      Selected
                    </span>
                  )}
                </div>
                {t.industry && (
                  <span style={{
                    display: "inline-flex", padding: "2px 8px",
                    borderRadius: 5, fontSize: 10, fontWeight: 700,
                    background: "#F5F3EF", color: "#8C7E6A", marginBottom: 8,
                  }}>
                    {t.industry.replace(/_/g, " ")}
                  </span>
                )}
                <div style={{
                  display: "flex", gap: 16, marginTop: 10,
                  fontSize: 12, color: "#8C7E6A",
                }}>
                  <span>
                    <strong style={{ color: "#1A1814" }}>{t.workgroup_count}</strong> workgroups
                  </span>
                  <span>
                    <strong style={{ color: "#1A1814" }}>{t.job_count}</strong> jobs
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#B5A99A", marginTop: 6 }}>
                  Used {t.usage_count} times
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div style={{
              gridColumn: "1 / -1", padding: 40, textAlign: "center",
              color: "#8C7E6A", fontSize: 14,
            }}>
              No templates found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AI DESCRIPTION FORM
// ═══════════════════════════════════════════════════════════

function AIDescriptionForm({ wizard }: { wizard: ScaffoldWizardHook }) {
  const { state, updateField, generateScaffold } = wizard;
  const [quickStarts, setQuickStarts] = useState<QuickStartTemplate[]>([]);

  useEffect(() => {
    scaffoldService.getQuickStarts().then(setQuickStarts).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    await generateScaffold();
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{
          fontSize: 12, fontWeight: 700, color: "#6B5F4F",
          textTransform: "uppercase" as const, letterSpacing: "0.06em",
          marginBottom: 6, display: "block",
        }}>
          Describe your project
        </label>
        <textarea
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: "2px solid #ECEAE6", fontSize: 14, lineHeight: 1.6,
            fontFamily: "'Outfit', sans-serif", background: "#FAF9F6",
            outline: "none", resize: "vertical", minHeight: 120,
          }}
          placeholder="Tell us what needs to be done..."
          value={state.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </div>

      {/* Quick Starts */}
      {quickStarts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 12, fontWeight: 700, color: "#6B5F4F",
            textTransform: "uppercase" as const, letterSpacing: "0.06em",
            marginBottom: 8, display: "block",
          }}>
            Quick starts
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {quickStarts.map((qs) => (
              <button
                key={qs.id}
                onClick={() => {
                  updateField("description", qs.prompt);
                  updateField("industry", qs.industry);
                  updateField("projectSubtype", qs.project_subtype);
                }}
                style={{
                  padding: "8px 16px", borderRadius: 20,
                  border: "2px solid #ECEAE6", fontSize: 13,
                  fontWeight: 600, color: "#6B5F4F", cursor: "pointer",
                  background: "#FAF9F6", fontFamily: "'Outfit', sans-serif",
                  transition: "all .15s", display: "inline-flex",
                  alignItems: "center", gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3D6B5E";
                  e.currentTarget.style.color = "#3D6B5E";
                  e.currentTarget.style.background = "#EDFAF4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#ECEAE6";
                  e.currentTarget.style.color = "#6B5F4F";
                  e.currentTarget.style.background = "#FAF9F6";
                }}
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extra fields */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        marginBottom: 20,
      }}>
        <div>
          <label style={{
            fontSize: 12, fontWeight: 700, color: "#6B5F4F",
            textTransform: "uppercase" as const, letterSpacing: "0.06em",
            marginBottom: 6, display: "block",
          }}>
            Number of worksites
          </label>
          <input
            type="number"
            min="1"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "2px solid #ECEAE6", fontSize: 14,
              fontFamily: "'Outfit', sans-serif", background: "#FAF9F6",
              outline: "none",
            }}
            value={state.numWorksites}
            onChange={(e) =>
              updateField("numWorksites", parseInt(e.target.value) || 1)
            }
          />
        </div>
        <div>
          <label style={{
            fontSize: 12, fontWeight: 700, color: "#6B5F4F",
            textTransform: "uppercase" as const, letterSpacing: "0.06em",
            marginBottom: 6, display: "block",
          }}>
            Target duration
          </label>
          <input
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "2px solid #ECEAE6", fontSize: 14,
              fontFamily: "'Outfit', sans-serif", background: "#FAF9F6",
              outline: "none",
            }}
            placeholder="e.g. 90 days"
            value={state.targetDuration}
            onChange={(e) => updateField("targetDuration", e.target.value)}
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!state.description.trim() || state.isGenerating}
        style={{
          width: "100%", padding: 14, borderRadius: 10, border: "none",
          background:
            state.description.trim() && !state.isGenerating
              ? "linear-gradient(135deg, #3D6B5E, #5AAE8F)"
              : "#DDD7CC",
          color: state.description.trim() ? "#fff" : "#9C8E7C",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {state.isGenerating ? (
          <>
            <div style={{
              width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            Generating...
          </>
        ) : (
          <>✨ Generate project plan</>
        )}
      </button>

      {/* Error */}
      {state.generateError && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: "#FEF0ED", border: "1.5px solid #F5C5BA",
        }}>
          <span style={{ fontSize: 13, color: "#D44A2E", fontWeight: 600 }}>
            {state.generateError}
          </span>
        </div>
      )}
    </div>
  );
}
