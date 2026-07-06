import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: 'web/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: pubUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role, has_logged_in, company_id')
    .or('email.ilike.%scott%,email.ilike.%kaufman%,full_name.ilike.%scott%')
    .limit(20)
  console.log('public.users matches:')
  console.table(pubUsers)

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const matches = list.users.filter(
    (u) =>
      u.email?.toLowerCase().includes('scott') ||
      u.email?.toLowerCase().includes('kaufman')
  )
  console.log('\nauth.users matches:')
  console.table(matches.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })))
}

main()
