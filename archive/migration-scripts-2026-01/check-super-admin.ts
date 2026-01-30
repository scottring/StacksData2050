import { supabase } from './src/migration/supabase-client.js'

async function checkSuperAdmin() {
  // Check for super admins
  const { data: superAdmins } = await supabase
    .from('users')
    .select('email, is_super_admin, role, companies(name)')
    .eq('is_super_admin', true)

  console.log('\n=== SUPER ADMINS ===\n')
  if (superAdmins && superAdmins.length > 0) {
    for (const user of superAdmins) {
      console.log(`${user.email}`)
      console.log(`  Company: ${(user.companies as any)?.name}`)
      console.log(`  Role: ${user.role}`)
      console.log('')
    }
  } else {
    console.log('No super admins found\n')
  }

  // Check StacksData users
  const { data: stacksUsers } = await supabase
    .from('users')
    .select('id, email, is_super_admin, role, companies(name)')
    .ilike('email', '%stacksdata%')

  console.log('=== STACKSDATA USERS ===\n')
  for (const user of stacksUsers || []) {
    console.log(`${user.email}`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Company: ${(user.companies as any)?.name}`)
    console.log(`  Super Admin: ${user.is_super_admin || false}`)
    console.log(`  Role: ${user.role || 'none'}`)
    console.log('')
  }
}

checkSuperAdmin().catch(console.error)
