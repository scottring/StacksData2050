import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: 'web/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL = 'scott.kaufman@stacksdata.com'
const NEW_PASSWORD = 'dev2026'

async function main() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('list error', listError)
    process.exit(1)
  }
  const user = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (!user) {
    console.error(`No auth user found for ${EMAIL}`)
    process.exit(1)
  }
  console.log(`Found user ${user.id}, resetting password`)
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: NEW_PASSWORD })
  if (error) {
    console.error('reset error', error)
    process.exit(1)
  }
  console.log(`Password reset to ${NEW_PASSWORD} for ${EMAIL}`)
}

main()
