// Cloudflare Worker bindings
export interface Env {
  DB: D1Database;
  ENTRA_TENANT_ID: string;
  ENTRA_TENANT_DOMAIN: string;
  ENTRA_CLIENT_ID: string;
  ENTRA_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

// Session user from Entra ID
export interface SessionUser {
  sub: string;        // Entra object ID
  email: string;
  name: string;
  exp: number;        // expiry timestamp
}

// D1 row types
export interface SabreProperty {
  id: number;
  gds_property_id: string;
  property_chain: string;
  property_name: string;
  street_address: string | null;
  city_address: string | null;
  state_province: string | null;
  country_address: string | null;
  zip_postal_code: string | null;
  primary_airport: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ChainCode {
  code: string;
  name: string;
}

export interface PhutProject {
  id: string;
  name: string;
  owner_sub: string;
  created_at: string;
  updated_at: string;
}

export interface RatePeriod {
  rate: number;
  begin_date: string;  // mm/dd/yy
  end_date: string;    // mm/dd/yy
  currency: string;    // 3-letter code
}

export interface PhutEntry {
  id: number;
  project_id: string;
  property_name: string;
  is_gds_flag: string;
  property_chain: string | null;
  gds_property_id: string | null;
  street_address: string | null;
  city_address: string | null;
  state_province: string | null;
  country_address: string | null;
  zip_postal_code: string | null;
  primary_airport: string | null;
  supplier_property_id: string | null;
  channel_code: string | null;
  rate_periods: string;  // JSON array of RatePeriod
  property_tier: string | null;
  property_note: string | null;
  green_property: string;
  custom_tag1: string;
  custom_tag2: string;
  custom_tag3: string;
  custom_tag4: string;
  sort_order: number;
  created_at: string;
}

// Validation result
export interface ValidationError {
  field: string;
  message: string;
}

export interface EntryValidation {
  entry_id: number;
  property_name: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
