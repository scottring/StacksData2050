import { supabase } from './src/migration/supabase-client.js'

async function checkPolicies() {
  console.log('=== Checking RLS policies on tag tables ===\n')

  const tables = ['sheet_tags', 'question_tags', 'tags']

  for (const table of tables) {
    console.log(`\n--- ${table} ---`)

    // Try to read the table with service role
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`❌ Error reading ${table}:`, error.message)
    } else {
      console.log(`✅ Can read ${table}: ${data?.length || 0} rows returned`)
    }
  }
}

checkPolicies().catch(console.error)
