import { supabase } from './src/migration/supabase-client.js'
import fs from 'fs'
import path from 'path'

async function applyMigration() {
  console.log('=== Applying Chemical Inventory Migration ===\n')

  // Read the SQL migration file
  const sqlPath = path.join(process.cwd(), 'migrations', 'create-chemical-inventory-tables.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  console.log('Executing SQL migration...\n')

  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('❌ Migration failed:', error)

    // Try splitting into individual statements
    console.log('\nTrying statement-by-statement execution...\n')

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5)

    for (const statement of statements) {
      if (statement.toLowerCase().includes('comment on')) continue // Skip comments for now

      const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })

      if (stmtError) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`)
        console.error(stmtError)
      } else {
        console.log(`✓ Executed: ${statement.substring(0, 60)}...`)
      }
    }
  } else {
    console.log('✅ Migration applied successfully!\n')
  }

  // Verify tables were created
  console.log('Verifying tables...\n')

  const { data: chemicalInventory, error: chemError } = await supabase
    .from('chemical_inventory')
    .select('count')
    .limit(1)

  const { data: sheetChemicals, error: sheetError } = await supabase
    .from('sheet_chemicals')
    .select('count')
    .limit(1)

  if (!chemError) {
    console.log('✅ chemical_inventory table created')
  } else {
    console.log('❌ chemical_inventory table not found:', chemError.message)
  }

  if (!sheetError) {
    console.log('✅ sheet_chemicals table created')
  } else {
    console.log('❌ sheet_chemicals table not found:', sheetError.message)
  }

  console.log('\nMigration complete!')
}

applyMigration().catch(console.error)
