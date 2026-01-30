import { supabase } from './src/migration/supabase-client.js'

async function createSuperAdminUser() {
  const email = 'scott.kaufman@stacksdata.com'
  const password = 'ChangeMe123!' // You'll change this after first login

  console.log('\n=== Creating Super Admin User ===\n')

  // First, get or create the Stacks Data company
  let stacksCompanyId: string

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%stacks data%')
    .limit(1)
    .single()

  if (existingCompany) {
    console.log(`Found company: ${existingCompany.name}`)
    stacksCompanyId = existingCompany.id
  } else {
    console.log('Creating Stacks Data company...')
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: 'Stacks Data' }])
      .select()
      .single()

    if (companyError || !newCompany) {
      console.error('Error creating company:', companyError?.message)
      return
    }

    stacksCompanyId = newCompany.id
    console.log(`Created company: ${newCompany.name}`)
  }

  console.log(`Company ID: ${stacksCompanyId}\n`)

  // Create auth user via Admin API
  console.log(`Creating auth user: ${email}`)

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  })

  if (authError) {
    if (authError.message.includes('already')) {
      console.log('✅ Auth user already exists')

      // Get the existing user
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users.find(u => u.email === email)

      if (!existing) {
        console.error('Could not find existing auth user')
        return
      }

      console.log(`Auth User ID: ${existing.id}\n`)

      // Check if user record exists
      const { data: existingUserRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', existing.id)
        .single()

      if (existingUserRecord) {
        console.log('User record exists, updating to super admin...')

        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_super_admin: true,
            role: 'admin',
            company_id: stacksCompanyId
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Error updating user:', updateError.message)
          return
        }

        console.log('✅ Updated to super admin!')
      } else {
        console.log('Creating user record...')

        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: existing.id,
            email: email,
            company_id: stacksCompanyId,
            is_super_admin: true,
            role: 'admin'
          }])

        if (insertError) {
          console.error('Error creating user record:', insertError.message)
          return
        }

        console.log('✅ Created user record as super admin!')
      }
    } else {
      console.error('Error creating auth user:', authError.message)
      return
    }
  } else {
    console.log(`✅ Created auth user`)
    console.log(`Auth User ID: ${authUser.user.id}\n`)

    // Create user record in users table
    console.log('Creating user record in database...')

    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        email: email,
        company_id: stacksCompanyId,
        is_super_admin: true,
        role: 'admin'
      }])

    if (userError) {
      console.error('Error creating user record:', userError.message)
      return
    }

    console.log('✅ Created user record as super admin!')
  }

  console.log('\n🎉 Setup complete!')
  console.log('\nLogin credentials:')
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${password}`)
  console.log('\n⚠️  Please change your password after first login!')
  console.log('\nYou can now:')
  console.log('  1. Navigate to http://localhost:3000/login (or your app URL)')
  console.log('  2. Login with the credentials above')
  console.log('  3. Access all association data as super admin')
}

createSuperAdminUser().catch(console.error)
