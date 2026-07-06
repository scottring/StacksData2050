import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, company_id')
    .is('company_id', null)
    .limit(20)

  if (error) { console.error('Error:', error); return }
  console.log(`Users with NULL company_id: ${data?.length}`)
  data?.forEach(u => console.log(`  ${u.email} | role: ${u.role}`))

  // Scott
  const { data: scott } = await supabase
    .from('users')
    .select('id, email, role, company_id')
    .eq('email', 'scott@stacksdata.com')
    .maybeSingle()

  console.log('\nScott:', scott || 'NOT FOUND')

  // Total user count
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
  console.log(`\nTotal users: ${count}`)
}

check()
