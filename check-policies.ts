import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  // Use raw SQL to check policies
  const { data, error } = await supabase.rpc('get_policies_info')
  if (error) {
    // Function doesn't exist, try direct query via pg endpoint
    console.log('rpc failed, trying direct...')
  }
  
  // Check if tables have RLS enabled
  const tables = ['sheets', 'requests', 'request_tags', 'sheet_tags', 'invitations', 'companies', 'request_custom_questions', 'company_questions']
  
  for (const table of tables) {
    // Test insert as a regular user by checking if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', table)
      .single()
    
    if (rlsError) {
      // pg_class not accessible, try another way
      // Just test if we can read from these tables
      console.log(`${table}: can't check RLS status directly`)
    }
  }
}

check()
