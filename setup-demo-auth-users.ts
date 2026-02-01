import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const DEMO_PASSWORD = 'demo2026'

// Demo users - these will be created or updated
const demoUsers = [
  {
    email: 'kaisa.herranen@upm.com',
    name: 'Kaisa Herranen',
    company: 'UPM'
  },
  {
    email: 'christian.torborg@sappi.com',
    name: 'Christian Torborg',
    company: 'Sappi'
  },
  {
    email: 'tiia.aho@kemira.com',
    name: 'Tiia Aho',
    company: 'Kemira Oyj'
  },
  {
    email: 'abdessamad.arbaoui@omya.com',
    name: 'Abdessamad Arbaoui',
    company: 'Omya'
  },
]

async function setupDemoAuthUsers() {
  console.log('Setting up demo auth users...\n')

  // Get all auth users (paginated)
  let allUsers: any[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error(`Error listing users page ${page}:`, error.message)
      break
    }
    allUsers = allUsers.concat(data.users)
    if (data.users.length < perPage) break
    page++
  }

  console.log(`Found ${allUsers.length} total auth users`)

  for (const user of demoUsers) {
    // Find user by email
    const existingUser = allUsers.find(u => u.email === user.email)

    if (existingUser) {
      // User exists, update password
      console.log(`\nUser ${user.email} exists in auth (ID: ${existingUser.id})`)
      console.log(`  Updating password...`)
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: DEMO_PASSWORD }
      )

      if (updateError) {
        console.error(`  Failed to update password:`, updateError.message)
      } else {
        console.log(`  Password updated successfully`)

        // Check users table
        const { data: usersTableUser } = await supabase
          .from('users')
          .select('id, email, company_id')
          .eq('email', user.email)
          .single()

        if (usersTableUser) {
          console.log(`  Users table ID: ${usersTableUser.id}`)
          console.log(`  Company ID: ${usersTableUser.company_id}`)

          // Update the users table if the auth ID is different
          if (usersTableUser.id !== existingUser.id) {
            console.log(`  ID mismatch! Updating users table to auth ID...`)

            // First delete the old record, then insert new one with correct ID
            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('id', usersTableUser.id)

            if (deleteError) {
              console.error(`  Failed to delete old user record:`, deleteError.message)
            } else {
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: existingUser.id,
                  email: user.email,
                  full_name: user.name,
                  company_id: usersTableUser.company_id,
                  role: 'user'
                })

              if (insertError) {
                console.error(`  Failed to insert updated user record:`, insertError.message)
              } else {
                console.log(`  Users table ID updated to ${existingUser.id}`)
              }
            }
          }
        } else {
          console.log(`  User not found in users table, creating...`)
          // Get company ID for UPM
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('name', user.company)
            .single()

          if (company) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: existingUser.id,
                email: user.email,
                full_name: user.name,
                company_id: company.id,
                role: 'user'
              })

            if (insertError) {
              console.error(`  Failed to create user record:`, insertError.message)
            } else {
              console.log(`  Created user record with company ${user.company}`)
            }
          }
        }
      }
    } else {
      // Create new auth user with the same ID as in users table
      console.log(`Creating auth user for ${user.email}...`)

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: user.name
        }
      })

      if (createError) {
        console.error(`Failed to create auth user for ${user.email}:`, createError.message)
      } else {
        console.log(`  Created auth user: ${newUser.user?.id}`)

        // Update users table to use the auth ID
        if (newUser.user && newUser.user.id !== user.id) {
          console.log(`  Updating users table ID from ${user.id} to ${newUser.user.id}`)

          const { error: updateError } = await supabase
            .from('users')
            .update({ id: newUser.user.id })
            .eq('id', user.id)

          if (updateError) {
            console.error(`  Failed to update users table:`, updateError.message)
          } else {
            console.log(`  Updated users table ID successfully`)
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Demo Account Setup Complete!')
  console.log('='.repeat(60))
  console.log('\nDemo Credentials:')
  demoUsers.forEach(u => {
    console.log(`  ${u.company.padEnd(15)} ${u.email}`)
  })
  console.log(`\nPassword for all accounts: ${DEMO_PASSWORD}`)
  console.log('='.repeat(60))
}

setupDemoAuthUsers().catch(console.error)
