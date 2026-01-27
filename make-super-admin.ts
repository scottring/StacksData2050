import { supabase } from './src/migration/supabase-client.js'

async function makeSuperAdmin() {
  const targetEmail = 'scott.kaufman@stacksdata.com'

  console.log(`\n=== Making ${targetEmail} a super admin ===\n`)

  // First check if user exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('email, is_super_admin, role, companies(name)')
    .eq('email', targetEmail)
    .single()

  if (checkError || !existingUser) {
    console.log('❌ User not found in database.')
    console.log('\nSearching for any scott.kaufman or stacksdata users...\n')

    const { data: allUsers } = await supabase
      .from('users')
      .select('email, is_super_admin')
      .or('email.ilike.%scott.kaufman%,email.ilike.%stacksdata%')

    if (allUsers && allUsers.length > 0) {
      console.log('Found these users:')
      allUsers.forEach(u => console.log(`  - ${u.email} (Super Admin: ${u.is_super_admin || false})`))
      console.log('\nEdit this script to use one of these emails instead.')
    } else {
      console.log('No StacksData users found.')
      console.log('\nYou need to:')
      console.log('1. Sign up through the web app')
      console.log('2. Or create user through Supabase Auth dashboard')
      console.log('3. Then run this script again')
    }
    return
  }

  console.log('Found user:')
  console.log(`  Email: ${existingUser.email}`)
  console.log(`  Company: ${(existingUser.companies as any)?.name || 'None'}`)
  console.log(`  Current Super Admin: ${existingUser.is_super_admin || false}`)
  console.log(`  Current Role: ${existingUser.role || 'none'}`)
  console.log('')

  // Update to super admin
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({
      is_super_admin: true,
      role: 'admin'
    })
    .eq('email', targetEmail)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Error updating user:', updateError.message)
    return
  }

  console.log('✅ Successfully updated!')
  console.log(`  Email: ${updated.email}`)
  console.log(`  Super Admin: ${updated.is_super_admin}`)
  console.log(`  Role: ${updated.role}`)
  console.log('\n🎉 You can now login and access all association data!')
}

makeSuperAdmin().catch(console.error)
