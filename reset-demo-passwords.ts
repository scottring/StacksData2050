import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const users = [
  { id: '3ed3110d-990b-402e-912a-17095cbeb7ef', email: 'kaisa.herranen@upm.com' },
  { id: '6a4b5cd2-340d-4ebd-9f5f-bad46362e600', email: 'christian.torborg@sappi.com' },
  { id: '1e118b2b-754c-498f-82db-4f19f9d56f0f', email: 'tiia.aho@kemira.com' },
]

async function resetPasswords() {
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'demo2026',
    })
    if (error) {
      console.error(`Failed ${user.email}:`, error.message)
    } else {
      console.log(`Reset password for ${user.email}`)
    }
  }
}

resetPasswords()
