/**
 * useScaffoldWizard — State management for the Create Project wizard
 *
 * Manages:
 *   - Step navigation (basics → path → build → settings → review)
 *   - Scaffold generation (AI) and template loading
 *   - Scaffold editing (add/remove/edit WGs, jobs, deps)
 *   - Project creation (from scaffold or template)
 *
 * Pattern matches useDashboardPortfolio.ts — useState + useCallback.
 *
 * File: src/hooks/useScaffoldWizard.ts
 */

import { useState, useCallback } from "react";
import scaffoldService from "@/services/scaffoldService";
import type {
  WizardState,
  WizardStep,
  BuildPath,
  GraphMode,
  ProjectType,
  ProjectSettings,
  ScaffoldResponse,
  ScaffoldWorkgroup,
  ScaffoldJob,
  TemplateListItem,
  QuickStartTemplate,
  CreateProjectResult,
  INITIAL_WIZARD_STATE,
} from "@/types/scaffold";
import { DEFAULT_PROJECT_SETTINGS } from "@/types/scaffold";

const STEPS: WizardStep[] = ["basics", "path_choice", "build_plan", "settings", "review"];

export function useScaffoldWizard() {
  const [state, setState] = useState<WizardState>({
    step: "basics",
    buildPath: null,
    graphMode: "simple",
    projectName: "",
    projectType: "direct",
    industry: "",
    projectSubtype: "",
    clientName: "",
    contractValue: null,
    totalBudget: null,
    startDate: null,
    selectedTemplateId: null,
    description: "",
    numWorksites: 1,
    targetDuration: "",
    scaffold: null,
    isGenerating: false,
    generateError: null,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
    saveAsTemplate: false,
    templateName: "",
    isCreating: false,
    createError: null,
  });

  // ═══════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════

  const setStep = useCallback((step: WizardStep) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((s) => {
      const idx = STEPS.indexOf(s.step);
      if (idx < STEPS.length - 1) return { ...s, step: STEPS[idx + 1] };
      return s;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => {
      const idx = STEPS.indexOf(s.step);
      if (idx > 0) return { ...s, step: STEPS[idx - 1] };
      return s;
    });
  }, []);

  const currentStepIndex = STEPS.indexOf(state.step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // ═══════════════════════════════════════════════════════
  // FIELD UPDATES
  // ═══════════════════════════════════════════════════════

  const updateField = useCallback(
    <K extends keyof WizardState>(field: K, value: WizardState[K]) => {
      setState((s) => ({ ...s, [field]: value }));
    },
    []
  );

  const updateSettings = useCallback(
    <K extends keyof ProjectSettings>(field: K, value: ProjectSettings[K]) => {
      setState((s) => ({
        ...s,
        settings: { ...s.settings, [field]: value },
      }));
    },
    []
  );

  const setBuildPath = useCallback((path: BuildPath) => {
    setState((s) => ({ ...s, buildPath: path }));
  }, []);

  const setGraphMode = useCallback((mode: GraphMode) => {
    setState((s) => ({ ...s, graphMode: mode }));
  }, []);

  // ═══════════════════════════════════════════════════════
  // SCAFFOLD GENERATION (AI)
  // ═══════════════════════════════════════════════════════

  const generateScaffold = useCallback(async () => {
    setState((s) => ({ ...s, isGenerating: true, generateError: null }));
    try {
      const scaffold = await scaffoldService.generateScaffold({
        description: state.description,
        project_type: state.projectType,
        industry: state.industry || null,
        budget: state.totalBudget,
        target_duration_days: state.targetDuration
          ? parseInt(state.targetDuration) || null
          : null,
        num_worksites: state.numWorksites,
      });
      setState((s) => ({ ...s, scaffold, isGenerating: false }));
      return scaffold;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setState((s) => ({
        ...s,
        isGenerating: false,
        generateError: msg,
      }));
      return null;
    }
  }, [
    state.description,
    state.industry,
    state.projectSubtype,
    state.totalBudget,
    state.targetDuration,
    state.numWorksites,
  ]);

  const refineScaffold = useCallback(
    async (feedback: string) => {
      if (!state.scaffold) return null;
      setState((s) => ({ ...s, isGenerating: true, generateError: null }));
      try {
        const scaffold = await scaffoldService.refineScaffold({
          current_scaffold: state.scaffold,
          feedback,
        });
        setState((s) => ({ ...s, scaffold, isGenerating: false }));
        return scaffold;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        setState((s) => ({
          ...s,
          isGenerating: false,
          generateError: msg,
        }));
        return null;
      }
    },
    [state.scaffold]
  );

  // ═══════════════════════════════════════════════════════
  // TEMPLATE LOADING
  // ═══════════════════════════════════════════════════════

  const loadTemplate = useCallback(async (templateId: string) => {
    setState((s) => ({ ...s, isGenerating: true, generateError: null }));
    try {
      const template = await scaffoldService.getTemplate(templateId);
      setState((s) => ({
        ...s,
        scaffold: template.scaffold_data,
        selectedTemplateId: templateId,
        isGenerating: false,
        // Apply default settings from template
        settings: {
          ...s.settings,
          ...(template.default_settings || {}),
          project_type: template.project_type_default || s.settings.project_type,
        },
        industry: template.industry || s.industry,
        projectSubtype: template.project_subtype || s.projectSubtype,
      }));
      return template;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load template";
      setState((s) => ({
        ...s,
        isGenerating: false,
        generateError: msg,
      }));
      return null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // SCAFFOLD EDITING
  // ═══════════════════════════════════════════════════════

  const setScaffold = useCallback((scaffold: ScaffoldResponse) => {
    setState((s) => ({ ...s, scaffold }));
  }, []);

  const updateWorkgroup = useCallback(
    (index: number, updates: Partial<ScaffoldWorkgroup>) => {
      setState((s) => {
        if (!s.scaffold) return s;
        const wgs = [...s.scaffold.workgroups];
        wgs[index] = { ...wgs[index], ...updates };
        return { ...s, scaffold: { ...s.scaffold, workgroups: wgs } };
      });
    },
    []
  );

  const removeWorkgroup = useCallback((index: number) => {
    setState((s) => {
      if (!s.scaffold) return s;
      const wgs = s.scaffold.workgroups.filter((_, i) => i !== index);
      // Remap dependency indices and job workgroup_index
      const idxMap: Record<number, number> = {};
      let ni = 0;
      s.scaffold.workgroups.forEach((_, i) => {
        if (i !== index) {
          idxMap[i] = ni++;
        }
      });
      wgs.forEach((wg) => {
        wg.depends_on_indices = wg.depends_on_indices
          .filter((d) => d !== index && idxMap[d] !== undefined)
          .map((d) => idxMap[d]);
      });
      const jobs = s.scaffold.jobs
        .filter((j) => j.workgroup_index !== index)
        .map((j) => ({
          ...j,
          workgroup_index: idxMap[j.workgroup_index] ?? j.workgroup_index,
        }));
      return {
        ...s,
        scaffold: {
          ...s.scaffold,
          workgroups: wgs,
          jobs,
          trade_count: new Set(wgs.map((w) => w.trade).filter(Boolean)).size,
        },
      };
    });
  }, []);

  const addWorkgroup = useCallback((wg: ScaffoldWorkgroup) => {
    setState((s) => {
      if (!s.scaffold) return s;
      return {
        ...s,
        scaffold: {
          ...s.scaffold,
          workgroups: [...s.scaffold.workgroups, wg],
          trade_count: new Set(
            [...s.scaffold.workgroups, wg].map((w) => w.trade).filter(Boolean)
          ).size,
        },
      };
    });
  }, []);

  const duplicateWorkgroup = useCallback((index: number) => {
    setState((s) => {
      if (!s.scaffold) return s;
      const orig = s.scaffold.workgroups[index];
      const newWg: ScaffoldWorkgroup = {
        ...orig,
        title: `${orig.title} (Copy)`,
        depends_on_indices: [...orig.depends_on_indices],
      };
      const newIdx = s.scaffold.workgroups.length;
      // Copy jobs too
      const origJobs = s.scaffold.jobs.filter(
        (j) => j.workgroup_index === index
      );
      const newJobs = origJobs.map((j) => ({
        ...j,
        workgroup_index: newIdx,
      }));
      return {
        ...s,
        scaffold: {
          ...s.scaffold,
          workgroups: [...s.scaffold.workgroups, newWg],
          jobs: [...s.scaffold.jobs, ...newJobs],
        },
      };
    });
  }, []);

  const updateJob = useCallback(
    (jobIndex: number, updates: Partial<ScaffoldJob>) => {
      setState((s) => {
        if (!s.scaffold) return s;
        const jobs = [...s.scaffold.jobs];
        jobs[jobIndex] = { ...jobs[jobIndex], ...updates };
        return { ...s, scaffold: { ...s.scaffold, jobs } };
      });
    },
    []
  );

  const removeJob = useCallback((jobIndex: number) => {
    setState((s) => {
      if (!s.scaffold) return s;
      return {
        ...s,
        scaffold: {
          ...s.scaffold,
          jobs: s.scaffold.jobs.filter((_, i) => i !== jobIndex),
        },
      };
    });
  }, []);

  const addJob = useCallback((job: ScaffoldJob) => {
    setState((s) => {
      if (!s.scaffold) return s;
      return {
        ...s,
        scaffold: { ...s.scaffold, jobs: [...s.scaffold.jobs, job] },
      };
    });
  }, []);

  const addDependency = useCallback(
    (wgIndex: number, dependsOnIndex: number) => {
      setState((s) => {
        if (!s.scaffold) return s;
        const wgs = [...s.scaffold.workgroups];
        if (
          !wgs[wgIndex].depends_on_indices.includes(dependsOnIndex) &&
          wgIndex !== dependsOnIndex
        ) {
          wgs[wgIndex] = {
            ...wgs[wgIndex],
            depends_on_indices: [
              ...wgs[wgIndex].depends_on_indices,
              dependsOnIndex,
            ],
          };
        }
        return { ...s, scaffold: { ...s.scaffold, workgroups: wgs } };
      });
    },
    []
  );

  const removeDependency = useCallback(
    (wgIndex: number, dependsOnIndex: number) => {
      setState((s) => {
        if (!s.scaffold) return s;
        const wgs = [...s.scaffold.workgroups];
        wgs[wgIndex] = {
          ...wgs[wgIndex],
          depends_on_indices: wgs[wgIndex].depends_on_indices.filter(
            (d) => d !== dependsOnIndex
          ),
        };
        return { ...s, scaffold: { ...s.scaffold, workgroups: wgs } };
      });
    },
    []
  );

  // ═══════════════════════════════════════════════════════
  // PROJECT CREATION
  // ═══════════════════════════════════════════════════════

  const createProject = useCallback(async (): Promise<CreateProjectResult | null> => {
    if (!state.scaffold) return null;
    setState((s) => ({ ...s, isCreating: true, createError: null }));
    try {
      const result = await scaffoldService.createFromScaffold({
        scaffold: state.scaffold,
        project_settings: {
          ...state.settings,
          project_type: state.projectType,
          industry: state.industry || null,
          project_subtype: state.projectSubtype || null,
          client_name: state.clientName || null,
          contract_value: state.contractValue,
        },
        project_name: state.projectName,
        project_description: state.description,
        total_budget: state.totalBudget,
        start_date: state.startDate,
        save_as_template: state.saveAsTemplate,
        template_name: state.templateName || null,
      });
      setState((s) => ({ ...s, isCreating: false }));
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Project creation failed";
      setState((s) => ({ ...s, isCreating: false, createError: msg }));
      return null;
    }
  }, [state]);

  // ═══════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════

  const scaffoldStats = state.scaffold
    ? {
        workgroupCount: state.scaffold.workgroups.length,
        jobCount: state.scaffold.jobs.length,
        tradeCount: new Set(
          state.scaffold.workgroups.map((w) => w.trade).filter(Boolean)
        ).size,
        estimatedDays: state.scaffold.estimated_duration_days,
      }
    : null;

  const canProceed = (() => {
    switch (state.step) {
      case "basics":
        return state.projectName.trim().length > 0;
      case "path_choice":
        return state.buildPath !== null;
      case "build_plan":
        return state.scaffold !== null && state.scaffold.workgroups.length > 0;
      case "settings":
        return true;
      case "review":
        return !state.isCreating;
      default:
        return false;
    }
  })();

  return {
    state,
    // Navigation
    setStep,
    nextStep,
    prevStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    canProceed,
    steps: STEPS,
    // Field updates
    updateField,
    updateSettings,
    setBuildPath,
    setGraphMode,
    // Scaffold generation
    generateScaffold,
    refineScaffold,
    loadTemplate,
    // Scaffold editing
    setScaffold,
    updateWorkgroup,
    removeWorkgroup,
    addWorkgroup,
    duplicateWorkgroup,
    updateJob,
    removeJob,
    addJob,
    addDependency,
    removeDependency,
    // Project creation
    createProject,
    // Computed
    scaffoldStats,
  };
}

export type ScaffoldWizardHook = ReturnType<typeof useScaffoldWizard>;
