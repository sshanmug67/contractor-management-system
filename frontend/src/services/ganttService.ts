/**
 * Gantt Service
 *
 * API calls to the dependency analysis endpoints:
 *   GET  /api/dependencies/gantt/{project_id}   → Full GanttData (cache-first)
 *   POST /api/dependencies/preview              → Preview change impact
 *   POST /api/dependencies/apply                → Apply dependency changes
 *   POST /api/dependencies/scenarios            → What-if delay simulation
 *
 * Pattern matches dashboardService.ts — thin wrapper around api.ts
 */

import apiClient from './api';
import type {
  GanttDataResponse,
  PreviewRequest,
  PreviewResponse,
  ApplyRequest,
  ApplyResponse,
  ScenarioRequest,
  ScenarioResponse,
  SensitivityReport,
} from '@/types/gantt';

const ganttService = {
  /**
   * Fetch full GanttData for a project.
   * Backend serves from Redis cache (10min TTL).
   * Response is ~29KB for the richest project (Westfield).
   */
  async getGanttData(projectId: string): Promise<GanttDataResponse> {
    const response = await apiClient.get(`/dependencies/gantt/${projectId}`);
    return response.data;
  },

  /**
   * Preview the impact of proposed dependency changes.
   * Validates the new graph and returns impact analysis
   * (critical path changes, duration delta, affected workgroups).
   *
   * Used by the drag-and-drop dependency editor before committing.
   */
  async previewChanges(request: PreviewRequest): Promise<PreviewResponse> {
    const response = await apiClient.post('/dependencies/preview', request);
    return response.data;
  },

  /**
   * Apply dependency changes to the database.
   * Invalidates Redis cache and fires the refresh worker.
   * After this returns, the next getGanttData call will have fresh data.
   */
  async applyChanges(request: ApplyRequest): Promise<ApplyResponse> {
    const response = await apiClient.post('/dependencies/apply', request);
    return response.data;
  },

  /**
   * Run what-if delay scenarios.
   * "If wg3 is delayed 5 days, what happens?"
   * Returns per-scenario impact without modifying any data.
   */
  async runScenarios(request: ScenarioRequest): Promise<ScenarioResponse> {
    const response = await apiClient.post('/dependencies/scenarios', request);
    return response.data;
  },

  async getSensitivity(projectId: string): Promise<SensitivityReport> {
    const response = await apiClient.get(`/dependencies/sensitivity/${projectId}`);
    return response.data;
  },
  
  async refreshSensitivity(projectId: string): Promise<SensitivityReport> {
    const response = await apiClient.post(`/dependencies/sensitivity/${projectId}/refresh`);
    return response.data;
  },
};

export default ganttService;
