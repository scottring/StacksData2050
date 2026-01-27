import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function debugAuth() {
  // Get the user
  const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(
    'edb61517-78a7-4139-921d-d6d5db6e89ec'
  )
  
  if (getUserError) {
    console.error('Error getting user:', getUserError)
    return
  }
  
  console.log('User found:')
  console.log('  ID:', user.user.id)
  console.log('  Email:', user.user.email)
  console.log('  Email confirmed:', user.user.email_confirmed_at)
  console.log('  Created:', user.user.created_at)
  console.log('  Last sign in:', user.user.last_sign_in_at)
  
  // Try to sign in with the password we just set
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'scott.kaufman+1@stacksdata.com',
    password: 'stacksdata123'
  })
  
  if (signInError) {
    console.log('\nSign in test FAILED:', signInError.message)
  } else {
    console.log('\nSign in test SUCCEEDED!')
    console.log('Session:', signInData.session ? 'Created' : 'None')
  }
}

debugAuth()
