import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const tables = ['sheets', 'requests', 'request_tags', 'sheet_tags', 'invitations', 'companies', 'request_custom_questions', 'company_questions']
  
  for (const table of tables) {
    const { data } = await supabase.rpc('exec_sql', { 
      sql: `SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = '${table}' ORDER BY cmd` 
    })
    console.log(`\n${table}:`)
    if (data && Array.isArray(data)) {
      data.forEach((p: any) => console.log(`  ${p.cmd}: ${p.policyname}`))
    } else {
      // Try alternative approach
      const { data: d2, error } = await supabase.from(table).select('*').limit(0)
      console.log(`  Query test: ${error ? 'ERROR: ' + error.message : 'OK'}`)
    }
  }
}

check()
