import api from './api';
import type {
  BusinessProfile,
  BusinessProfileCreate,
  BusinessProfileUpdate,
  OnboardingStatus,
} from '../types/settings';

export const settingsService = {
  // ── Profile ────────────────────────────────────────

  getProfile: async (): Promise<BusinessProfile | null> => {
    try {
      const { data } = await api.get('/settings/profile');
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  createProfile: async (body: BusinessProfileCreate): Promise<BusinessProfile> => {
    const { data } = await api.post('/settings/profile', body);
    return data;
  },

  updateProfile: async (body: BusinessProfileUpdate): Promise<BusinessProfile> => {
    const { data } = await api.put('/settings/profile', body);
    return data;
  },

  updateAddress: async (body: Partial<BusinessProfile>): Promise<BusinessProfile> => {
    const { data } = await api.put('/settings/profile/address', body);
    return data;
  },

  // ── Onboarding ─────────────────────────────────────

  getOnboardingStatus: async (): Promise<OnboardingStatus> => {
    const { data } = await api.get('/settings/onboarding');
    return data;
  },

  completeOnboarding: async (step: number, complete: boolean): Promise<BusinessProfile> => {
    const { data } = await api.put('/settings/onboarding', { step, complete });
    return data;
  },
};
