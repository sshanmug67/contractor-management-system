import api from './api';

export interface Branding {
  company_name: string;
  dba_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  industry: string | null;
  invoice_prefix: string;
  default_markup_pct: number;
  default_billing_cycle: string;
  default_payment_terms: number;
}

export const brandingService = {
  getBranding: async (): Promise<Branding | null> => {
    try {
      const { data } = await api.get('/branding');
      return data;
    } catch (err: any) {
      console.warn('Failed to load branding:', err?.message);
      return null;
    }
  },
};
