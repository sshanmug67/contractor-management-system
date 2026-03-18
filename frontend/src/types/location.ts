/**
 * Business Location Types
 *
 * Org-level saved addresses (offices, warehouses, client sites)
 * that can be linked to worksites and jobs via the LocationPicker.
 *
 * File: src/types/location.ts
 */

export interface BusinessLocation {
  id: string;
  org_id: string;
  name: string;
  location_type: LocationType;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_fence_radius_m: number;
  google_place_id: string | null;
  verification_status: VerificationStatus;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LocationType =
  | 'office'
  | 'warehouse'
  | 'yard'
  | 'shop'
  | 'storage'
  | 'branch'
  | 'client_site'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'other';

export type VerificationStatus = 'verified' | 'unverified' | 'failed';

export interface CreateLocationRequest {
  name: string;
  location_type?: LocationType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_fence_radius_m?: number;
  google_place_id?: string;
  is_default?: boolean;
  auto_verify?: boolean;
}

export interface UpdateLocationRequest {
  name?: string;
  location_type?: LocationType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_fence_radius_m?: number;
  is_default?: boolean;
}

export interface AddressVerification {
  is_valid: boolean;
  status: VerificationStatus;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  geocode?: {
    lat: number;
    lng: number;
    formatted_address: string;
    place_id: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  };
}

export interface WorksiteFromLocation {
  id: string;
  project_id: string;
  business_location_id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  geo_latitude: number | null;
  geo_longitude: number | null;
  status: string;
}

/** Display helpers */
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  office: 'Office',
  warehouse: 'Warehouse',
  yard: 'Yard',
  shop: 'Shop',
  storage: 'Storage',
  branch: 'Branch',
  client_site: 'Client Site',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  other: 'Other',
};

export const formatLocationAddress = (loc: BusinessLocation): string => {
  const parts = [loc.address_line1, loc.address_line2, loc.city, loc.state, loc.zip_code];
  return parts.filter(Boolean).join(', ');
};
