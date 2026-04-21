import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, is_super_admin, company_id')
    .is('company_id', null)
    .limit(20)

  if (error) { console.error('Error:', error); return }
  console.log(`Users with NULL company_id: ${data?.length}`)
  data?.forEach(u => console.log(`  ${u.email} | role: ${u.role} | super_admin: ${u.is_super_admin} | company_id: ${u.company_id}`))

  // Scott
  const { data: scott, error: e2 } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'scott@stacksdata.com')
    .maybeSingle()

  console.log('\nScott:', scott || 'NOT FOUND', e2 || '')
}

check()
