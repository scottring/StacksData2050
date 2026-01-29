import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check test supplier's company
const { data: user } = await supabase
  .from('users')
  .select('id, email, full_name, company_id')
  .eq('email', 'smkaufman+supplier@gmail.com')
  .single()

if (user) {
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', user.company_id)
    .single()
  console.log('Test supplier user:')
  console.log('  Email:', user.email)
  console.log('  Name:', user.full_name)
  console.log('  Company:', company?.name, '(id:', company?.id + ')')
} else {
  console.log('Test supplier user not found in users table!')
}
