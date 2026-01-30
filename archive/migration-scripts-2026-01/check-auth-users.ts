import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkAuthUsers() {
  // Check auth.users via Admin API
  const { data: authUsers, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error fetching auth users:', error)
    return
  }

  console.log(`Total auth users: ${authUsers.users.length}`)
  console.log('\nAuth users:')
  authUsers.users.forEach(u => {
    console.log(`- ${u.email} | ID: ${u.id} | Created: ${u.created_at}`)
  })

  // Check public.users table
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('*')

  if (dbError) {
    console.error('Error fetching DB users:', dbError)
    return
  }

  console.log(`\nTotal public.users: ${dbUsers?.length || 0}`)

  if (dbUsers && dbUsers.length > 0) {
    console.log('\nPublic users:')
    dbUsers.forEach(u => {
      console.log(`- ${u.email} | Company: ${u.company_id || 'NONE'} | Role: ${u.role} | SuperAdmin: ${u.is_super_admin}`)
    })
  } else {
    console.log('❌ No users in public.users table!')
    console.log('\nThis is the problem - auth users exist but they are not in the public.users table.')
    console.log('The dashboard queries public.users to get company_id and is_super_admin.')
  }
}

checkAuthUsers()
