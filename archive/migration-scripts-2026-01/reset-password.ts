import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'edb61517-78a7-4139-921d-d6d5db6e89ec',
    { password: 'stacksdata123' }
  )
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Password updated successfully for:', data.user.email)
    console.log('New password: stacksdata123')
  }
}

resetPassword()
