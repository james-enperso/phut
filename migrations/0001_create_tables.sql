-- Sabre hotel properties (pre-loaded from flat file)
CREATE TABLE IF NOT EXISTS sabre_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gds_property_id TEXT NOT NULL,
  property_chain TEXT NOT NULL,
  property_name TEXT NOT NULL,
  street_address TEXT,
  city_address TEXT,
  state_province TEXT,
  country_address TEXT,
  zip_postal_code TEXT,
  primary_airport TEXT,
  latitude REAL,
  longitude REAL,
  UNIQUE(gds_property_id, property_chain)
);

CREATE INDEX IF NOT EXISTS idx_sp_city ON sabre_properties(city_address);
CREATE INDEX IF NOT EXISTS idx_sp_country ON sabre_properties(country_address);
CREATE INDEX IF NOT EXISTS idx_sp_airport ON sabre_properties(primary_airport);
CREATE INDEX IF NOT EXISTS idx_sp_chain ON sabre_properties(property_chain);
CREATE INDEX IF NOT EXISTS idx_sp_name ON sabre_properties(property_name COLLATE NOCASE);

-- Chain code reference
CREATE TABLE IF NOT EXISTS chain_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- User sessions (Entra ID)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_sub TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sess_sub ON sessions(user_sub);
CREATE INDEX IF NOT EXISTS idx_sess_exp ON sessions(expires_at);

-- PHUT projects
CREATE TABLE IF NOT EXISTS phut_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_sub TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proj_owner ON phut_projects(owner_sub);

-- PHUT entries (rows in the CSV)
CREATE TABLE IF NOT EXISTS phut_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES phut_projects(id) ON DELETE CASCADE,

  property_name TEXT NOT NULL,
  is_gds_flag TEXT NOT NULL DEFAULT 'Y',
  property_chain TEXT,
  gds_property_id TEXT,

  street_address TEXT,
  city_address TEXT,
  state_province TEXT,
  country_address TEXT,
  zip_postal_code TEXT,
  primary_airport TEXT,

  supplier_property_id TEXT,
  channel_code TEXT,

  rate_periods TEXT DEFAULT '[]',

  property_tier TEXT,
  property_note TEXT,
  green_property TEXT DEFAULT 'N',
  custom_tag1 TEXT DEFAULT 'N',
  custom_tag2 TEXT DEFAULT 'N',
  custom_tag3 TEXT DEFAULT 'N',
  custom_tag4 TEXT DEFAULT 'N',

  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ent_project ON phut_entries(project_id);
