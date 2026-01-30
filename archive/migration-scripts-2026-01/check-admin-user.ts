import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Check if admin user exists in users table
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const adminAuthUser = authUsers.users.find(u => u.email === 'admin@stacksdata.com')

  console.log('Admin auth user ID:', adminAuthUser?.id)

  // Check users table
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@stacksdata.com')
    .maybeSingle()

  console.log('Admin user in users table:', dbUser)
  console.log('Error:', error)

  if (!dbUser && adminAuthUser) {
    console.log('\n❌ Admin user does not exist in users table!')
    console.log('Creating admin user record...')

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: adminAuthUser.id,
        email: 'admin@stacksdata.com',
        full_name: 'Super Admin',
        role: 'admin',
        company_id: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
    } else {
      console.log('✅ Admin user created:', newUser)
    }
  } else if (dbUser) {
    console.log('\n✅ Admin user exists in users table')
  }

  // Test sheets query
  console.log('\n=== Testing sheets query ===')
  const { data: sheets, error: sheetsError } = await supabase
    .from('sheets')
    .select('id, name, new_status')
    .limit(5)

  console.log('Sheets count:', sheets?.length || 0)
  console.log('Sheets error:', sheetsError)

  if (sheets && sheets.length > 0) {
    console.log('\nSample sheets:')
    sheets.forEach(s => {
      console.log(`  - ${s.name} (${s.new_status})`)
    })
  }
}

main().catch(console.error)
