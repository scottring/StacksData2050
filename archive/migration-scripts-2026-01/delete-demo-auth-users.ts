import { supabase } from './src/migration/supabase-client.js'

async function deleteAuthUsers() {
  const emails = ['sarah.johnson@acme.com', 'thomas.mueller@premiumpolymers.com']

  const { data } = await supabase.auth.admin.listUsers()

  for (const email of emails) {
    const user = data?.users.find(u => u.email === email)
    if (user) {
      await supabase.auth.admin.deleteUser(user.id)
      console.log('✅ Deleted auth user:', email)
    } else {
      console.log('⚠️  User not found:', email)
    }
  }

  console.log('\nDone!')
}

deleteAuthUsers()
