/**
 * Contractor Service
 *
 * API calls for the Contractor Pool page.
 * Endpoint: /api/contractors
 */

import apiClient from './api';

export interface ContractorDTO {
  id: string;
  org_id: string;
  company_name: string;
  owner_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string;
  phone: string;
  license_number: string | null;
  insurance_info: Record<string, unknown> | null;
  skills: string[];
  rating: number;
  performance: Record<string, unknown> | null;
  verification_status: 'verified' | 'pending' | 'flagged';
  last_verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractorDetailDTO {
  contractor: ContractorDTO;
  workers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    first_seen_at: string;
    last_active_at: string | null;
  }>;
  active_workgroups: Array<{
    id: string;
    title: string;
    trade: string | null;
    status: string;
    budget: number;
    worksites?: { name: string };
  }>;
  verifications: Array<{
    id: string;
    verification_type: string;
    status: string;
    source_url: string | null;
    details: Record<string, unknown> | null;
    verified_at: string | null;
    expires_at: string | null;
    created_at: string;
  }>;
}

export interface ContractorStatsDTO {
  total: number;
  active: number;
  verified: number;
  pending_verification: number;
  flagged: number;
  unique_trades: number;
  trades: string[];
}

export interface ContractorCreateDTO {
  company_name: string;
  owner_name?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  email: string;
  phone: string;
  license_number?: string;
  skills?: string[];
}

const contractorService = {
  async list(params?: {
    trade?: string;
    status?: string;
    search?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<ContractorDTO[]> {
    const { data } = await apiClient.get('/contractors', { params });
    return data;
  },

  async getStats(): Promise<ContractorStatsDTO> {
    const { data } = await apiClient.get('/contractors/stats/summary');
    return data;
  },

  async getDetail(id: string): Promise<ContractorDetailDTO> {
    const { data } = await apiClient.get(`/contractors/${id}`);
    return data;
  },

  async create(contractor: ContractorCreateDTO): Promise<ContractorDTO> {
    const { data } = await apiClient.post('/contractors', contractor);
    return data;
  },

  async update(id: string, updates: Partial<ContractorCreateDTO>): Promise<ContractorDTO> {
    const { data } = await apiClient.patch(`/contractors/${id}`, updates);
    return data;
  },

  async deactivate(id: string): Promise<void> {
    await apiClient.delete(`/contractors/${id}`);
  },

  async searchBySkills(skills: string[]): Promise<ContractorDTO[]> {
    const { data } = await apiClient.get('/contractors/search/by-skills', {
      params: { skills: skills.join(',') },
    });
    return data;
  },

  async getWorkers(contractorId: string): Promise<ContractorDetailDTO['workers']> {
    const { data } = await apiClient.get(`/contractors/${contractorId}/workers`);
    return data;
  },

  async getVerifications(contractorId: string): Promise<ContractorDetailDTO['verifications']> {
    const { data } = await apiClient.get(`/contractors/${contractorId}/verifications`);
    return data;
  },
};

export default contractorService;
