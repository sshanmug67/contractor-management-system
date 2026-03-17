/**
 * StepPathChoice — "From Template" vs "Describe with AI" fork
 *
 * File: src/components/scaffold/StepPathChoice.tsx
 */

import type { ScaffoldWizardHook } from "@/hooks/useScaffoldWizard";
import type { BuildPath } from "@/types/scaffold";

interface Props {
  wizard: ScaffoldWizardHook;
}

const paths: {
  key: BuildPath;
  icon: string;
  gradient: string;
  title: string;
  desc: string;
  badges: { label: string; bg: string; color: string }[];
}[] = [
  {
    key: "template",
    icon: "📋",
    gradient: "linear-gradient(135deg, #C07B1A, #E5A63B)",
    title: "From a template",
    desc: "Pick from proven project structures. Great if you've done this type of work before.",
    badges: [
      { label: "Instant", bg: "#F5F3EF", color: "#8C7E6A" },
    ],
  },
  {
    key: "ai",
    icon: "✨",
    gradient: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
    title: "Describe with AI",
    desc: "Tell us what you're building and AI will generate the full project plan with trades and timeline.",
    badges: [
      { label: "AI-powered", bg: "#EDFAF4", color: "#2E7D5F" },
      { label: "~10 sec", bg: "#F5F3EF", color: "#8C7E6A" },
    ],
  },
];

export function StepPathChoice({ wizard }: Props) {
  const { state, setBuildPath } = wizard;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 24px", textAlign: "center" }}>
      <h3 style={{
        fontSize: 18, fontWeight: 800, color: "#1A1814", marginBottom: 4,
      }}>
        How would you like to build your project plan?
      </h3>
      <p style={{ fontSize: 14, color: "#8C7E6A", marginBottom: 28 }}>
        Choose a starting point — you can always edit everything later
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {paths.map((path) => {
          const isSelected = state.buildPath === path.key;
          return (
            <div
              key={path.key}
              onClick={() => setBuildPath(path.key)}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: `2px solid ${isSelected ? "#3D6B5E" : "#ECEAE6"}`,
                padding: 28,
                textAlign: "left",
                cursor: "pointer",
                transition: "all .15s",
                boxShadow: isSelected
                  ? "0 0 0 2px rgba(61,107,94,0.15), 0 4px 16px rgba(61,107,94,0.08)"
                  : "none",
                ...(isSelected ? { background: "#EDFAF4" } : {}),
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "#3D6B5E";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(61,107,94,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "#ECEAE6";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: path.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 22, filter: "brightness(10)" }}>{path.icon}</span>
              </div>

              <div style={{
                fontSize: 16, fontWeight: 800, color: "#1A1814", marginBottom: 4,
              }}>
                {path.title}
              </div>

              <p style={{
                fontSize: 13, color: "#8C7E6A", lineHeight: 1.5,
              }}>
                {path.desc}
              </p>

              <div style={{
                marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6,
              }}>
                {isSelected && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 6,
                    fontSize: 11, fontWeight: 700,
                    background: "#EDFAF4", color: "#2E7D5F",
                  }}>
                    Selected
                  </span>
                )}
                {path.badges.map((badge) => (
                  <span
                    key={badge.label}
                    style={{
                      padding: "3px 10px", borderRadius: 6,
                      fontSize: 11, fontWeight: 700,
                      background: badge.bg, color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
