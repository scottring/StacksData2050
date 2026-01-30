import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createTestUser() {
  // Create a new auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@stacksdata.com',
    password: 'admin123',
    email_confirm: true
  })
  
  if (authError) {
    console.error('Error creating auth user:', authError.message)
    
    // If user exists, update password
    if (authError.message.includes('already')) {
      console.log('User exists, fetching and updating...')
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users.users.find(u => u.email === 'admin@stacksdata.com')
      
      if (existingUser) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: 'admin123' }
        )
        if (updateError) {
          console.error('Error updating password:', updateError)
          return
        }
        console.log('Password updated for existing user')
        
        // Also create/update public.users record
        await supabase.from('users').upsert({
          id: existingUser.id,
          email: 'admin@stacksdata.com',
          full_name: 'Admin User',
          role: 'super_admin'
        })
        console.log('Public users record updated')
      }
    }
    return
  }
  
  console.log('Auth user created:', authData.user.email)
  
  // Create public.users record
  const { error: userError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: 'admin@stacksdata.com',
    full_name: 'Admin User',
    role: 'super_admin'
  })
  
  if (userError) {
    console.error('Error creating public user:', userError.message)
  } else {
    console.log('Public user created')
  }
  
  console.log('\nLogin credentials:')
  console.log('Email: admin@stacksdata.com')
  console.log('Password: admin123')
}

createTestUser()
