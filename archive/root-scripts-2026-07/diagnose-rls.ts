import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

async function diagnoseRLS() {
  const url = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log('Diagnosing RLS issues...\n')

  // Use service role to check RLS status
  const adminClient = createClient(url, serviceKey)

  // Check if RLS is enabled on tables
  const { data: rlsStatus, error: rlsError } = await adminClient.rpc('check_table_rls')

  if (rlsError) {
    console.log('Cannot use check_table_rls RPC, trying raw SQL approach...\n')

    // Alternative: check users table for auth functions
    const { data: users, error: userError } = await adminClient
      .from('users')
      .select('id, email, company_id, role, is_super_admin')
      .in('email', ['kaisa.herranen@upm.com', 'tiia.aho@kemira.com'])

    if (userError) {
      console.log('User query error:', userError.message)
    } else {
      console.log('Demo users in database:')
      users?.forEach(u => {
        console.log(`  ${u.email}:`)
        console.log(`    - company_id: ${u.company_id}`)
        console.log(`    - role: ${u.role}`)
        console.log(`    - is_super_admin: ${u.is_super_admin}`)
      })
    }

    // Check company data for demo users
    const companyIds = users?.map(u => u.company_id).filter(Boolean) || []
    if (companyIds.length > 0) {
      const { data: companies } = await adminClient
        .from('companies')
        .select('id, name')
        .in('id', companyIds)

      console.log('\nDemo user companies:')
      companies?.forEach(c => console.log(`  ${c.id}: ${c.name}`))
    }

    // Check sheets for one of the companies
    if (companyIds[0]) {
      const { data: companySheets, count } = await adminClient
        .from('sheets')
        .select('id, name, company_id, requesting_company_id', { count: 'exact' })
        .or(`company_id.eq.${companyIds[0]},requesting_company_id.eq.${companyIds[0]}`)
        .limit(5)

      console.log(`\nSheets for company ${companyIds[0]}:`, count, 'total')
      companySheets?.forEach(s => console.log(`  - ${s.name}`))
    }
  } else {
    console.log('RLS status:', rlsStatus)
  }

  // Test if auth functions exist
  console.log('\n--- Testing auth helper functions ---')

  // Login as UPM user
  const userClient = createClient(url, anonKey!)
  const { data: auth } = await userClient.auth.signInWithPassword({
    email: 'kaisa.herranen@upm.com',
    password: 'demo2026'
  })

  if (auth.user) {
    console.log('Logged in as:', auth.user.email, '(UID:', auth.user.id, ')')

    // Try to call the auth helper functions
    const { data: userCompanyId, error: compErr } = await userClient.rpc('user_company_id')
    console.log('auth.user_company_id():', userCompanyId, compErr?.message || '')

    const { data: isSuperAdmin, error: saErr } = await userClient.rpc('is_super_admin')
    console.log('auth.is_super_admin():', isSuperAdmin, saErr?.message || '')

    // Check if the user's company_id matches their users table entry
    const { data: userRecord } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', auth.user.id)
      .single()

    console.log('User record company_id from users table:', userRecord?.company_id)

    if (userCompanyId && userRecord?.company_id) {
      if (userCompanyId === userRecord.company_id) {
        console.log('✅ user_company_id() matches users table')
      } else {
        console.log('❌ MISMATCH: user_company_id() does not match users table!')
      }
    }
  }
}

diagnoseRLS().catch(console.error)
