import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const newPassword = 'admin2026'  // Simple password for now

  console.log('Resetting admin password...\n')

  // Get the admin user
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const adminUser = authUsers.users.find(u => u.email === 'admin@stacksdata.com')

  if (!adminUser) {
    console.log('❌ admin@stacksdata.com not found in auth system')
    return
  }

  console.log(`Found admin user: ${adminUser.email}`)
  console.log(`User ID: ${adminUser.id}`)

  // Update the password
  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { password: newPassword }
  )

  if (error) {
    console.error('❌ Error updating password:', error)
    return
  }

  console.log('\n✅ Password reset successful!')
  console.log('\nAdmin credentials:')
  console.log('  Email: admin@stacksdata.com')
  console.log(`  Password: ${newPassword}`)
  console.log('\nYou can now sign in at http://localhost:3000')
}

main().catch(console.error)
