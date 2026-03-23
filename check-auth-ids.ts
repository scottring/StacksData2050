import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const emails = ['kaisa.herranen@upm.com', 'christian.torborg@sappi.com', 'tiia.aho@kemira.com', 'scott@stacksdata.com']
  
  for (const email of emails) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = users?.find(u => u.email === email)
    
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single()
    
    console.log(`${email}:`)
    console.log(`  Auth ID: ${authUser?.id || 'NONE'}`)
    console.log(`  DB ID:   ${dbUser?.id || 'NONE'}`)
    console.log(`  Match:   ${authUser?.id === dbUser?.id}`)
    console.log()
  }
}

check()
