import { supabase } from './src/migration/supabase-client.js'

async function checkRoleConstraint() {
  // Get a sample of existing roles
  const { data: users } = await supabase
    .from('users')
    .select('role')
    .not('role', 'is', null)
    .limit(20)

  const uniqueRoles = [...new Set(users?.map(u => u.role))].filter(Boolean)

  console.log('Existing role values in database:', uniqueRoles)
  console.log('\nTrying to create user with "editor" role...')
}

checkRoleConstraint()
