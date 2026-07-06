import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function create() {
  // First create auth account
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'scott@stacksdata.com',
    password: 'demo2026',
    email_confirm: true,
  })

  if (error) {
    console.error('Auth create failed:', error.message)
    return
  }

  console.log('Auth user created:', data.user.id)

  // Create matching DB user record
  const { error: dbError } = await supabase
    .from('users')
    .insert({
      id: data.user.id,
      email: 'scott@stacksdata.com',
      full_name: 'Scott Kaufman',
      role: 'super_admin',
    })

  if (dbError) {
    console.error('DB insert failed:', dbError.message)
  } else {
    console.log('DB user created with super_admin role')
  }
}

create()
