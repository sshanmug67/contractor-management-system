import { create } from 'zustand';
import { brandingService, type Branding } from '@/services/brandingService';

interface BrandingState {
  branding: Branding | null;
  isLoaded: boolean;
  isLoading: boolean;
  fetchBranding: () => Promise<void>;
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: null,
  isLoaded: false,
  isLoading: false,

  fetchBranding: async () => {
    // Skip if already loaded or currently loading
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    try {
      const branding = await brandingService.getBranding();
      set({ branding, isLoaded: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));

// ── Selectors (convenience) ─────────────────────────────

export const useCompanyName = () =>
  useBrandingStore((s) => s.branding?.company_name ?? 'CMS');

export const useCompanyLogo = () =>
  useBrandingStore((s) => s.branding?.logo_url);

export const useInvoicePrefix = () =>
  useBrandingStore((s) => s.branding?.invoice_prefix ?? 'INV');

export const useCompanyAddress = () =>
  useBrandingStore((s) => {
    const b = s.branding;
    if (!b?.address_line1) return null;
    return {
      line1: b.address_line1,
      line2: b.address_line2,
      city: b.city,
      state: b.state,
      zip: b.zip_code,
      country: b.country,
    };
  });
