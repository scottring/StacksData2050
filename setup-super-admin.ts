import { supabase } from './src/migration/supabase-client.js'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupSuperAdmin() {
  console.log('\n=== SUPER ADMIN SETUP ===\n')

  // First, check for existing super admins
  const { data: existingSuperAdmins } = await supabase
    .from('users')
    .select('email, is_super_admin, role')
    .eq('is_super_admin', true)

  if (existingSuperAdmins && existingSuperAdmins.length > 0) {
    console.log('Existing super admins:')
    existingSuperAdmins.forEach(u => console.log(`  - ${u.email}`))
    console.log('')
  }

  // Show all StacksData users
  const { data: stacksUsers } = await supabase
    .from('users')
    .select('email, id, is_super_admin, role, companies(name)')

  const stacksDataUsers = (stacksUsers || []).filter(u =>
    u.email.toLowerCase().includes('stacksdata') ||
    u.email.toLowerCase().includes('scott.kaufman')
  )

  if (stacksDataUsers.length > 0) {
    console.log('StacksData/Scott Kaufman users found:')
    stacksDataUsers.forEach(u => {
      console.log(`  - ${u.email} (Super Admin: ${u.is_super_admin || false})`)
    })
    console.log('')
  }

  // Ask which email to make super admin
  const email = await question('Enter email to make super admin (or press Enter to use scott.kaufman@stacksdata.com): ')
  const targetEmail = email.trim() || 'scott.kaufman@stacksdata.com'

  console.log(`\nSetting ${targetEmail} as super admin...\n`)

  // Update the user
  const { data, error } = await supabase
    .from('users')
    .update({
      is_super_admin: true,
      role: 'admin'
    })
    .eq('email', targetEmail)
    .select()

  if (error) {
    console.error('Error:', error.message)

    // Check if user exists
    const { data: checkUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', targetEmail)
      .single()

    if (!checkUser) {
      console.log('\n⚠️  User not found in database.')
      console.log('\nTo create this user, either:')
      console.log('1. Sign up through the web app with this email')
      console.log('2. Use Supabase dashboard to create the auth user')
      console.log('\nThen run this script again.')
    }
  } else if (data && data.length > 0) {
    console.log('✅ Successfully set super admin!')
    console.log(`\nUser: ${data[0].email}`)
    console.log(`Super Admin: ${data[0].is_super_admin}`)
    console.log(`Role: ${data[0].role}`)
  } else {
    console.log('⚠️  No user updated. User may not exist in database.')
  }

  rl.close()
}

setupSuperAdmin().catch(console.error)
