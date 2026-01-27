-- Migration: Create Chemical Inventory and Sheet Chemicals Tables
-- Purpose: Convert CAS number text fields to normalized chemical entities with regulatory data
-- Date: 2026-01-13

-- ============================================================================
-- Table: chemical_inventory
-- Purpose: Store unique chemicals with enriched PubChem data and regulatory flags
-- ============================================================================

CREATE TABLE IF NOT EXISTS chemical_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cas_number TEXT UNIQUE NOT NULL,
  pubchem_cid INTEGER,
  chemical_name TEXT,
  molecular_formula TEXT,
  molecular_weight NUMERIC,
  synonyms TEXT[],
  iupac_name TEXT,
  inchi_key TEXT,

  -- Regulatory flags
  is_pfas BOOLEAN DEFAULT false,
  is_reach_svhc BOOLEAN DEFAULT false,
  is_prop65 BOOLEAN DEFAULT false,
  is_epa_tosca BOOLEAN DEFAULT false,
  is_rohs BOOLEAN DEFAULT false,
  is_food_contact_restricted BOOLEAN DEFAULT false,

  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('high', 'medium', 'low')),
  warnings TEXT[],
  restrictions TEXT[],
  hazards TEXT[],

  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  data_source TEXT DEFAULT 'pubchem',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Table: sheet_chemicals
-- Purpose: Junction table linking chemicals to sheets with concentration data
-- ============================================================================

CREATE TABLE IF NOT EXISTS sheet_chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  chemical_id UUID NOT NULL REFERENCES chemical_inventory(id) ON DELETE CASCADE,

  -- Concentration data from list table
  concentration NUMERIC,
  concentration_unit TEXT,

  -- Link back to original data
  list_table_row_id UUID,
  answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure uniqueness per row in list table
  UNIQUE(sheet_id, chemical_id, list_table_row_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Chemical inventory lookups
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_cas
  ON chemical_inventory(cas_number);

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_pubchem
  ON chemical_inventory(pubchem_cid)
  WHERE pubchem_cid IS NOT NULL;

-- Regulatory flag indexes (for compliance dashboards)
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_pfas
  ON chemical_inventory(is_pfas)
  WHERE is_pfas = true;

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_reach
  ON chemical_inventory(is_reach_svhc)
  WHERE is_reach_svhc = true;

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_prop65
  ON chemical_inventory(is_prop65)
  WHERE is_prop65 = true;

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_risk_level
  ON chemical_inventory(risk_level)
  WHERE risk_level = 'high';

-- Sheet chemicals lookups
CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_sheet
  ON sheet_chemicals(sheet_id);

CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_chemical
  ON sheet_chemicals(chemical_id);

CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_row
  ON sheet_chemicals(list_table_row_id)
  WHERE list_table_row_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_answer
  ON sheet_chemicals(answer_id)
  WHERE answer_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS) - To be configured based on auth requirements
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read
-- TODO: Refine policies based on user roles and company access
CREATE POLICY "Allow authenticated read access to chemical_inventory"
  ON chemical_inventory
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read access to sheet_chemicals"
  ON sheet_chemicals
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role has full access (for migration scripts)
CREATE POLICY "Allow service role full access to chemical_inventory"
  ON chemical_inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to sheet_chemicals"
  ON sheet_chemicals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE chemical_inventory IS
  'Normalized chemical entities enriched with PubChem data and regulatory flags. Each unique CAS number appears once.';

COMMENT ON TABLE sheet_chemicals IS
  'Junction table linking chemicals to supplier sheets with concentration data from biocides list tables.';

COMMENT ON COLUMN chemical_inventory.cas_number IS
  'Chemical Abstracts Service registry number (e.g., "50-00-0" for formaldehyde)';

COMMENT ON COLUMN chemical_inventory.is_pfas IS
  'Per- and polyfluoroalkyl substances flag - EU restriction pending';

COMMENT ON COLUMN chemical_inventory.is_reach_svhc IS
  'EU REACH Substance of Very High Concern flag';

COMMENT ON COLUMN chemical_inventory.is_prop65 IS
  'California Proposition 65 listed chemical flag';

COMMENT ON COLUMN sheet_chemicals.concentration IS
  'Chemical concentration value from supplier disclosure';

COMMENT ON COLUMN sheet_chemicals.concentration_unit IS
  'Unit of measurement (e.g., "% w/w", "ppm", "mg/kg")';
