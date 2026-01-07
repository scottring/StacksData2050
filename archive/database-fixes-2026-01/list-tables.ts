import { supabase } from './src/migration/supabase-client.js';

async function listTables() {
  // Check for user/person related tables
  const tables = ['users', 'persons', 'profiles', 'customers', 'suppliers']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    if (!error) {
      console.log(`✅ Table exists: ${table}`)
      if (data && data.length > 0) {
        console.log(`   Sample columns:`, Object.keys(data[0]).slice(0, 10).join(', '))
      }
    }
  }
}

listTables().catch(console.error)
