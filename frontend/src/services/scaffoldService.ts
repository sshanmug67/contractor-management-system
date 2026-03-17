/**
 * Scaffold & Template Service
 *
 * API calls for project creation:
 *   POST /api/projects/scaffold            → Generate scaffold from description
 *   POST /api/projects/scaffold/refine     → Refine existing scaffold
 *   POST /api/projects/create-from-scaffold → Create project from scaffold
 *   POST /api/projects/create-from-template/{id} → Create from template
 *   GET  /api/projects/quick-starts        → Get quick-start prompts
 *   GET  /api/templates                    → List templates
 *   GET  /api/templates/{id}               → Get full template
 *   POST /api/templates                    → Create template
 *   PUT  /api/templates/{id}               → Update template
 *   DELETE /api/templates/{id}             → Archive template
 *   POST /api/templates/{id}/duplicate     → Duplicate template
 *   POST /api/templates/from-project/{id}  → Extract template from project
 *
 * Pattern matches ganttService.ts — thin wrapper around apiClient.
 *
 * File: src/services/scaffoldService.ts
 */

import apiClient from "./api";
import type {
  ScaffoldRequest,
  ScaffoldResponse,
  RefineRequest,
  CreateFromScaffoldRequest,
  CreateFromTemplateRequest,
  CreateProjectResult,
  QuickStartTemplate,
  TemplateListItem,
  ProjectTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateFromProjectRequest,
} from "@/types/scaffold";

const scaffoldService = {
  // ═══════════════════════════════════════════════════════
  // SCAFFOLD (LLM generation)
  // ═══════════════════════════════════════════════════════

  /**
   * Generate a project scaffold from natural language description.
   * Calls Claude API on the backend → returns structured scaffold.
   * Typical response time: 3-8 seconds.
   */
  async generateScaffold(request: ScaffoldRequest): Promise<ScaffoldResponse> {
    const response = await apiClient.post("/projects/scaffold", request);
    return response.data;
  },

  /**
   * Refine an existing scaffold based on user feedback.
   * Sends current scaffold + feedback text to Claude.
   * Returns the complete modified scaffold (not a diff).
   */
  async refineScaffold(request: RefineRequest): Promise<ScaffoldResponse> {
    const response = await apiClient.post("/projects/scaffold/refine", request);
    return response.data;
  },

  /**
   * Get pre-filled prompt suggestions for common project types.
   * These are NOT templates — just prompt text for the AI path.
   */
  async getQuickStarts(): Promise<QuickStartTemplate[]> {
    const response = await apiClient.get("/projects/quick-starts");
    return response.data;
  },

  // ═══════════════════════════════════════════════════════
  // PROJECT CREATION
  // ═══════════════════════════════════════════════════════

  /**
   * Create a project from an edited scaffold.
   * Creates project + worksites + workgroups + jobs + dependencies
   * in a single transaction. Optionally saves as template.
   */
  async createFromScaffold(
    request: CreateFromScaffoldRequest
  ): Promise<CreateProjectResult> {
    const response = await apiClient.post(
      "/projects/create-from-scaffold",
      request
    );
    return response.data;
  },

  /**
   * Create a project from a saved template.
   * Loads the template's scaffold_data, applies user overrides
   * (budget, removals), and creates the project.
   */
  async createFromTemplate(
    templateId: string,
    request: CreateFromTemplateRequest
  ): Promise<CreateProjectResult> {
    const response = await apiClient.post(
      `/projects/create-from-template/${templateId}`,
      request
    );
    return response.data;
  },

  // ═══════════════════════════════════════════════════════
  // TEMPLATE CRUD
  // ═══════════════════════════════════════════════════════

  /**
   * List templates for the organization.
   * Returns lightweight items (no scaffold_data) for the grid.
   */
  async listTemplates(params?: {
    industry?: string;
    search?: string;
    include_system?: boolean;
    sort_by?: string;
    skip?: number;
    limit?: number;
  }): Promise<TemplateListItem[]> {
    const response = await apiClient.get("/templates", { params });
    return response.data;
  },

  /**
   * Get full template detail including scaffold_data.
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await apiClient.get(`/templates/${templateId}`);
    return response.data;
  },

  /**
   * Create a new custom template.
   */
  async createTemplate(
    request: CreateTemplateRequest
  ): Promise<ProjectTemplate> {
    const response = await apiClient.post("/templates", request);
    return response.data;
  },

  /**
   * Update template fields. Increments version automatically.
   */
  async updateTemplate(
    templateId: string,
    request: UpdateTemplateRequest
  ): Promise<ProjectTemplate> {
    const response = await apiClient.put(
      `/templates/${templateId}`,
      request
    );
    return response.data;
  },

  /**
   * Archive a template (soft-delete).
   */
  async archiveTemplate(
    templateId: string
  ): Promise<{ status: string; template_id: string }> {
    const response = await apiClient.delete(`/templates/${templateId}`);
    return response.data;
  },

  /**
   * Duplicate a template into the org as a new custom template.
   */
  async duplicateTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await apiClient.post(
      `/templates/${templateId}/duplicate`
    );
    return response.data;
  },

  /**
   * Extract a project's skeleton and save as a template.
   */
  async createFromProject(
    projectId: string,
    request: CreateFromProjectRequest
  ): Promise<ProjectTemplate> {
    const response = await apiClient.post(
      `/templates/from-project/${projectId}`,
      request
    );
    return response.data;
  },
};

export default scaffoldService;
