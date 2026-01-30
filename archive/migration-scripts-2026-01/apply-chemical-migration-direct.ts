import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function applyMigration() {
  console.log('=== Creating Chemical Inventory Tables ===\n')

  // Create chemical_inventory table
  console.log('Creating chemical_inventory table...')
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql_query: `
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
        is_pfas BOOLEAN DEFAULT false,
        is_reach_svhc BOOLEAN DEFAULT false,
        is_prop65 BOOLEAN DEFAULT false,
        is_epa_tosca BOOLEAN DEFAULT false,
        is_rohs BOOLEAN DEFAULT false,
        is_food_contact_restricted BOOLEAN DEFAULT false,
        risk_level TEXT CHECK (risk_level IN ('high', 'medium', 'low')),
        warnings TEXT[],
        restrictions TEXT[],
        hazards TEXT[],
        last_updated TIMESTAMP DEFAULT NOW(),
        data_source TEXT DEFAULT 'pubchem',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL })

    if (createError) {
      console.error('Error creating tables via RPC:', createError)
      console.log('\nTrying direct table access method...\n')

      // Alternative: Use Supabase management API or direct table creation
      // For now, let's just try to verify if tables exist
    }
  }

  // Verify tables exist
  console.log('\nVerifying table creation...\n')

  const { error: chemError } = await supabase
    .from('chemical_inventory')
    .select('id')
    .limit(1)

  const { error: sheetError } = await supabase
    .from('sheet_chemicals')
    .select('id')
    .limit(1)

  if (!chemError) {
    console.log('✅ chemical_inventory table exists')
  } else {
    console.log('❌ Need to create chemical_inventory table')
    console.log('   Error:', chemError.message)
  }

  if (!sheetError) {
    console.log('✅ sheet_chemicals table exists')
  } else {
    console.log('❌ sheet_chemicals table not found:', sheetError.message)
  }
}

applyMigration().catch(console.error)
