import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: 'web/.env.local' })

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data } = await s.from('users').select('role').not('role', 'is', null).limit(5000)
  const roles = new Set((data || []).map((r) => r.role))
  console.log('Distinct role values:', [...roles])
}
main()
