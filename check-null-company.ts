import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  // Users with null company_id
  const { data: nullUsers, count } = await supabase
    .from('users')
    .select('id, email, role, is_super_admin, company_id', { count: 'exact' })
    .is('company_id', null)

  console.log(`Users with NULL company_id: ${count}`)
  nullUsers?.forEach(u => console.log(`  ${u.email} | role: ${u.role} | super_admin: ${u.is_super_admin}`))

  // Check Scott specifically
  const { data: scott } = await supabase
    .from('users')
    .select('id, email, role, is_super_admin, company_id')
    .eq('email', 'scott@stacksdata.com')
    .single()

  console.log(`\nScott's record:`, scott)
}

check()
