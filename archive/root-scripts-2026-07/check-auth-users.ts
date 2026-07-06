import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const emails = [
    'kaisa.herranen@upm.com',
    'christian.torborg@sappi.com',
    'tiia.aho@kemira.com',
    'scott@stacksdata.com'
  ]

  for (const email of emails) {
    // Check users table
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single()

    // Check auth users
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.find(u => u.email === email)

    console.log(`${email}:`)
    console.log(`  DB user: ${dbUser ? `${dbUser.id} (${dbUser.role})` : 'NOT FOUND'}`)
    console.log(`  Auth user: ${authUser ? authUser.id : 'NOT FOUND'}`)
    console.log()
  }
}

check()
