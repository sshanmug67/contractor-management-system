import apiClient from './api';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types/project';
import type { ApiResponse, ApiListResponse, PaginationParams, FilterParams } from '@/types/api';

export const projectService = {
  async list(params?: PaginationParams & FilterParams): Promise<ApiListResponse<Project>> {
    const { data } = await apiClient.get('/projects', { params });
    return data;
  },

  async get(id: string): Promise<ApiResponse<Project>> {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },

  async create(project: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const { data } = await apiClient.post('/projects', project);
    return data;
  },

  async update(id: string, updates: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    const { data } = await apiClient.put(`/projects/${id}`, updates);
    return data;
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`/projects/${id}`);
    return data;
  },
};

export default projectService;
