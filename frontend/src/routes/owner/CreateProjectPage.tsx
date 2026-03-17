/**
 * CreateProjectPage — 5-Step Project Creation Wizard
 *
 * Step 1: Basics (name, type, industry)
 * Step 2: Choose path (template vs AI)
 * Step 3: Build plan (template picker / AI generation + scaffold editor)
 * Step 4: Payment settings
 * Step 5: Review + create
 *
 * Uses useScaffoldWizard hook for all state management.
 *
 * Route: /dashboard/projects/new
 * File: src/routes/owner/CreateProjectPage.tsx
 */

import { useNavigate } from "react-router-dom";
import { useScaffoldWizard } from "@/hooks/useScaffoldWizard";
import { StepBasics } from "@/components/scaffold/StepBasics";
import { StepPathChoice } from "@/components/scaffold/StepPathChoice";
import { StepBuildPlan } from "@/components/scaffold/StepBuildPlan";
import { StepSettings } from "@/components/scaffold/StepSettings";
import { StepReview } from "@/components/scaffold/StepReview";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{font-family:'Outfit',system-ui,sans-serif!important;box-sizing:border-box;margin:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#F0EDE8;border-radius:3px}::-webkit-scrollbar-thumb{background:#C4B5A2;border-radius:3px}
`;

const STEP_CONFIG = [
  { key: "basics", label: "Basics" },
  { key: "path_choice", label: "Choose Path" },
  { key: "build_plan", label: "Build Plan" },
  { key: "settings", label: "Settings" },
  { key: "review", label: "Review" },
] as const;

export function CreateProjectPage() {
  const navigate = useNavigate();
  const wizard = useScaffoldWizard();
  const { state, currentStepIndex, isFirstStep, isLastStep, canProceed } = wizard;

  const handleNext = async () => {
    if (isLastStep) {
      const result = await wizard.createProject();
      if (result?.project_id) {
        navigate(`/dashboard/projects/${result.project_id}`);
      }
    } else {
      wizard.nextStep();
    }
  };

  const handleExit = () => {
    navigate("/dashboard/projects");
  };

  // Step 3 (build_plan) is full-width — no footer, handles its own nav
  const isFullWidth = state.step === "build_plan" && state.scaffold !== null;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      fontFamily: "'Outfit', system-ui, sans-serif", background: "#F7F6F3",
    }}>
      <style>{css}</style>

      {/* ═══ Header ═══ */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ECEAE6", flexShrink: 0 }}>
        <div style={{ padding: "14px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1A1814", letterSpacing: "-0.02em" }}>
              Create new project
            </h1>
            <p style={{ fontSize: 13, color: "#8C7E6A", marginTop: 2 }}>
              Set up your project in minutes with AI-powered planning
            </p>
          </div>
          <button
            onClick={handleExit}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "1.5px solid #ECEAE6",
              background: "#fff", fontSize: 12, fontWeight: 700, color: "#6B5F4F",
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}
          >
            Exit
          </button>
        </div>

        {/* ═══ Step Tabs ═══ */}
        <div style={{ display: "flex", gap: 0, paddingLeft: 24, marginTop: 12 }}>
          {STEP_CONFIG.map((step, i) => {
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <button
                key={step.key}
                onClick={() => i <= currentStepIndex && wizard.setStep(step.key as any)}
                style={{
                  padding: "10px 18px", fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  border: "none",
                  borderBottom: `3px solid ${isActive ? "#3D6B5E" : "transparent"}`,
                  background: isActive ? "rgba(61,107,94,0.06)" : "transparent",
                  color: isActive ? "#1A1814" : isDone ? "#2E7D5F" : "#B5A99A",
                  cursor: i <= currentStepIndex ? "pointer" : "default",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "all .15s",
                }}
              >
                {isDone ? "✓ " : ""}{step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Progress Bar ═══ */}
      <div style={{ height: 4, background: "#ECEAE6", flexShrink: 0 }}>
        <div style={{
          height: "100%", borderRadius: "0 2px 2px 0",
          background: "linear-gradient(135deg, #3D6B5E, #5AAE8F)",
          width: `${((currentStepIndex + 1) / STEP_CONFIG.length) * 100}%`,
          transition: "width .4s ease",
        }} />
      </div>

      {/* ═══ Step Content ═══ */}
      <div style={{ flex: 1, overflow: isFullWidth ? "hidden" : "auto" }}>
        <div style={{
          animation: "fadeUp .3s ease",
          height: isFullWidth ? "100%" : "auto",
          display: isFullWidth ? "flex" : "block",
          flexDirection: "column",
        }}>
          {state.step === "basics" && <StepBasics wizard={wizard} />}
          {state.step === "path_choice" && <StepPathChoice wizard={wizard} />}
          {state.step === "build_plan" && <StepBuildPlan wizard={wizard} />}
          {state.step === "settings" && <StepSettings wizard={wizard} />}
          {state.step === "review" && <StepReview wizard={wizard} />}
        </div>
      </div>

      {/* ═══ Footer (hidden when scaffold editor is showing) ═══ */}
      {!isFullWidth && (
        <div style={{
          padding: "12px 24px", background: "#fff",
          borderTop: "1px solid #ECEAE6", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={wizard.prevStep}
            style={{
              padding: "10px 24px", borderRadius: 10,
              border: "2px solid #ECEAE6", background: "#fff",
              color: "#6B5F4F", fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              visibility: isFirstStep ? "hidden" : "visible",
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#B5A99A" }}>
              Step {currentStepIndex + 1} of {STEP_CONFIG.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              style={{
                padding: "10px 28px", borderRadius: 10,
                border: "none",
                background: canProceed
                  ? "linear-gradient(135deg, #3D6B5E, #5AAE8F)"
                  : "#DDD7CC",
                color: canProceed ? "#fff" : "#9C8E7C",
                fontWeight: 700, fontSize: 14,
                cursor: canProceed ? "pointer" : "not-allowed",
                fontFamily: "'Outfit', sans-serif",
                transition: "all .15s",
              }}
            >
              {state.isCreating
                ? "Creating..."
                : isLastStep
                ? "Create Project"
                : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateProjectPage;
