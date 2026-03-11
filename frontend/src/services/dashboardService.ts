import apiClient from './api';
import type { OwnerDashboardData } from '@/types/dashboard';

export const dashboardService = {
  /**
   * Fetch the full owner dashboard payload.
   * Single API call returns project + worksites + workgroups + jobs + budget.
   */
  async getOwnerDashboard(projectId?: string): Promise<OwnerDashboardData> {
    const params = projectId ? { project_id: projectId } : {};
    const { data } = await apiClient.get('/dashboard/owner', { params });
    return data;
  },
};

export default dashboardService;
