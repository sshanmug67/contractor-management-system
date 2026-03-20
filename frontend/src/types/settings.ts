// ── Business Profile Types ────────────────────────────

export type BusinessType =
  | 'sole_proprietorship'
  | 'llc'
  | 'corporation'
  | 's_corp'
  | 'partnership'
  | 'nonprofit'
  | 'other';

export type Industry =
  | 'equipment_rental'
  | 'general_contracting'
  | 'property_management'
  | 'logistics'
  | 'service_company'
  | 'landscaping'
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'construction'
  | 'other';

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | '28day';

export interface BusinessProfile {
  id: string;
  org_id: string;
  company_name: string;
  dba_name?: string;
  ein?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  geo_latitude?: number;
  geo_longitude?: number;
  business_type?: BusinessType;
  industry?: Industry;
  onboarding_complete: boolean;
  onboarding_step: number;
  default_payment_terms: number;
  default_billing_cycle: BillingCycle;
  default_markup_pct: number;
  invoice_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileCreate {
  company_name: string;
  dba_name?: string;
  ein?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_type?: BusinessType;
  industry?: Industry;
}

export interface BusinessProfileUpdate extends Partial<Omit<BusinessProfile,
  'id' | 'org_id' | 'created_at' | 'updated_at' | 'onboarding_complete' | 'onboarding_step'
>> {}

export interface OnboardingStatus {
  has_profile: boolean;
  onboarding_complete: boolean;
  onboarding_step: number;
  company_name?: string;
  missing_fields: string[];
}

// ── Display helpers ──────────────────────────────────

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_proprietorship: 'Sole Proprietorship',
  llc: 'LLC',
  corporation: 'Corporation',
  s_corp: 'S-Corp',
  partnership: 'Partnership',
  nonprofit: 'Nonprofit',
  other: 'Other',
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  equipment_rental: 'Equipment Rental',
  general_contracting: 'General Contracting',
  property_management: 'Property Management',
  logistics: 'Logistics & Transport',
  service_company: 'Service Company',
  landscaping: 'Landscaping',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  construction: 'Construction',
  other: 'Other',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  '28day': '28-Day',
};
