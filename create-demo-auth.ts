import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const demoUsers = [
  { email: 'kaisa.herranen@upm.com', dbId: '3ed3110d-990b-402e-912a-17095cbeb7ef' },
  { email: 'christian.torborg@sappi.com', dbId: '6a4b5cd2-340d-4ebd-9f5f-bad46362e600' },
  { email: 'tiia.aho@kemira.com', dbId: '1e118b2b-754c-498f-82db-4f19f9d56f0f' },
]

async function createAuthUsers() {
  for (const user of demoUsers) {
    // Create auth user with the SAME id as the DB user
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'demo2026',
      email_confirm: true,
      user_metadata: { full_name: user.email.split('@')[0].replace('.', ' ') },
      id: user.dbId,  // Match the existing DB user id
    })

    if (error) {
      console.error(`Failed ${user.email}:`, error.message)
    } else {
      console.log(`Created auth account for ${user.email} (id: ${data.user.id})`)
    }
  }
}

createAuthUsers()
