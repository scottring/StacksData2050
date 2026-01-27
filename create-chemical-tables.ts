import { supabase } from './src/migration/supabase-client.js'

async function createChemicalTables() {
  console.log('=== Creating Chemical Inventory & Sheet Chemicals Tables ===\n')

  console.log('📋 Please run the following SQL in your Supabase SQL Editor:\n')
  console.log('Dashboard > SQL Editor > New Query\n')
  console.log('=' .repeat(80))
  console.log(`
-- Create chemical_inventory table
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

-- Create sheet_chemicals junction table
CREATE TABLE IF NOT EXISTS sheet_chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  chemical_id UUID NOT NULL REFERENCES chemical_inventory(id) ON DELETE CASCADE,
  concentration NUMERIC,
  concentration_unit TEXT,
  list_table_row_id UUID,
  answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sheet_id, chemical_id, list_table_row_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_cas ON chemical_inventory(cas_number);
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_pfas ON chemical_inventory(is_pfas) WHERE is_pfas = true;
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_reach ON chemical_inventory(is_reach_svhc) WHERE is_reach_svhc = true;
CREATE INDEX IF NOT EXISTS idx_chemical_inventory_prop65 ON chemical_inventory(is_prop65) WHERE is_prop65 = true;
CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_sheet ON sheet_chemicals(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_chemical ON sheet_chemicals(chemical_id);

-- Enable RLS
ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow authenticated read access to chemical_inventory"
  ON chemical_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to sheet_chemicals"
  ON sheet_chemicals FOR SELECT TO authenticated USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access to chemical_inventory"
  ON chemical_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to sheet_chemicals"
  ON sheet_chemicals FOR ALL TO service_role USING (true) WITH CHECK (true);
`)
  console.log('=' .repeat(80))
  console.log('\n✅ After running the SQL above, verify tables were created:\n')

  // Try to verify if tables exist
  console.log('Checking if tables exist...\n')

  const { error: chemError } = await supabase
    .from('chemical_inventory')
    .select('id')
    .limit(0)

  const { error: sheetChemError } = await supabase
    .from('sheet_chemicals')
    .select('id')
    .limit(0)

  if (!chemError) {
    console.log('✅ chemical_inventory table found')
  } else if (chemError.code === '42P01') {
    console.log('❌ chemical_inventory table does not exist yet')
    console.log('   Please run the SQL above in Supabase dashboard')
  } else {
    console.log('⚠️  chemical_inventory status:', chemError.message)
  }

  if (!sheetChemError) {
    console.log('✅ sheet_chemicals table found')
  } else if (sheetChemError.code === '42P01') {
    console.log('❌ sheet_chemicals table does not exist yet')
    console.log('   Please run the SQL above in Supabase dashboard')
  } else {
    console.log('⚠️  sheet_chemicals status:', sheetChemError.message)
  }

  if (!chemError && !sheetChemError) {
    console.log('\n🎉 Both tables exist! Ready to proceed with migration.')
    console.log('\nNext step: Run the CAS number migration script')
    console.log('  npx tsx migrate-cas-numbers-to-inventory.ts')
  }
}

createChemicalTables().catch(console.error)
