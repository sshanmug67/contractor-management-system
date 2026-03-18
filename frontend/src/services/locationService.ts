/**
 * Location Service
 *
 * API calls for business location management.
 * Endpoint: /api/locations
 *
 * File: src/services/locationService.ts
 */

import apiClient from './api';
import type {
  BusinessLocation,
  CreateLocationRequest,
  UpdateLocationRequest,
  AddressVerification,
  WorksiteFromLocation,
} from '@/types/location';

const locationService = {
  /** List locations with optional filters and search */
  async list(params?: {
    location_type?: string;
    is_active?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<BusinessLocation[]> {
    const { data } = await apiClient.get('/locations/', { params });
    return data;
  },

  /** Get a single location by ID */
  async get(id: string): Promise<BusinessLocation> {
    const { data } = await apiClient.get(`/locations/${id}`);
    return data;
  },

  /** Create a new location (with optional auto-verify) */
  async create(location: CreateLocationRequest): Promise<BusinessLocation> {
    const { data } = await apiClient.post('/locations/', location);
    return data;
  },

  /** Update an existing location */
  async update(id: string, updates: UpdateLocationRequest): Promise<BusinessLocation> {
    const { data } = await apiClient.put(`/locations/${id}`, updates);
    return data;
  },

  /** Delete a location (soft-delete if worksites reference it) */
  async delete(id: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await apiClient.delete(`/locations/${id}`);
    return data;
  },

  /** Verify a free-text address without creating a location */
  async verify(address: string): Promise<AddressVerification> {
    const { data } = await apiClient.post('/locations/verify', { address });
    return data;
  },

  /** Auto-create a worksite from a business location (idempotent) */
  async createWorksite(locationId: string, projectId: string): Promise<WorksiteFromLocation> {
    const { data } = await apiClient.post(`/locations/${locationId}/worksite`, {
      project_id: projectId,
    });
    return data;
  },

  /** Set a location as the org's default */
  async setDefault(id: string): Promise<BusinessLocation> {
    const { data } = await apiClient.put(`/locations/${id}/default`, {});
    return data;
  },
};

export default locationService;
