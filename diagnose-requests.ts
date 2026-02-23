import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function diagnose() {
  console.log('=== REQUESTS DIAGNOSTIC ===\n')

  // 1. Check if ANY requests exist
  const { data: allRequests, error: reqErr } = await supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (reqErr) {
    console.log('ERROR querying requests table:', reqErr.message)
    console.log('  Code:', reqErr.code)
    console.log('  Details:', reqErr.details)
    console.log('  Hint:', reqErr.hint)
    return
  }

  console.log(`1. TOTAL REQUESTS IN TABLE: ${allRequests?.length ?? 0}`)

  if (allRequests && allRequests.length > 0) {
    console.log('\n   All requests:')
    for (const r of allRequests) {
      console.log(`   - ID: ${r.id}`)
      console.log(`     created_at: ${r.created_at}`)
      console.log(`     sheet_id: ${r.sheet_id}`)
      console.log(`     requestor_id (customer): ${r.requestor_id}`)
      console.log(`     requesting_from_id (supplier): ${r.requesting_from_id}`)
      console.log(`     processed: ${r.processed}`)
      console.log(`     created_by: ${r.created_by}`)
      console.log('')
    }
  }

  // 2. Check recent requests from last week (Jan 28 - Feb 6)
  const { data: recentRequests } = await supabase
    .from('requests')
    .select('*')
    .gte('created_at', '2026-01-28T00:00:00Z')
    .order('created_at', { ascending: false })

  console.log(`\n2. REQUESTS SINCE JAN 28: ${recentRequests?.length ?? 0}`)
  if (recentRequests && recentRequests.length > 0) {
    for (const r of recentRequests) {
      console.log(`   - ${r.created_at} | sheet: ${r.sheet_id} | from: ${r.requestor_id} | to: ${r.requesting_from_id}`)
    }
  }

  // 3. Look for Solenis / Martyna's company
  const { data: soleCompanies } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%solenis%')

  console.log(`\n3. COMPANIES MATCHING "solenis": ${soleCompanies?.length ?? 0}`)
  if (soleCompanies) {
    for (const c of soleCompanies) {
      console.log(`   - ${c.id}: ${c.name}`)
    }
  }

  // 4. Look for Martyna's user
  const { data: martynaUsers } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .or('email.ilike.%martyna%,email.ilike.%mikokowska%,email.ilike.%solenis%')

  console.log(`\n4. USERS MATCHING "martyna/mikokowska/solenis": ${martynaUsers?.length ?? 0}`)
  if (martynaUsers) {
    for (const u of martynaUsers) {
      console.log(`   - ${u.id}: ${u.email} | company_id: ${u.company_id} | role: ${u.role}`)
    }
  }

  // 5. Check if requesting_from_id on any request matches a Solenis company
  if (soleCompanies && soleCompanies.length > 0) {
    const soleIds = soleCompanies.map(c => c.id)
    const { data: soleRequests } = await supabase
      .from('requests')
      .select('*')
      .in('requesting_from_id', soleIds)

    console.log(`\n5. REQUESTS TO SOLENIS COMPANIES: ${soleRequests?.length ?? 0}`)
    if (soleRequests && soleRequests.length > 0) {
      for (const r of soleRequests) {
        console.log(`   - ${r.id} | created: ${r.created_at} | to: ${r.requesting_from_id}`)
      }
    }
  }

  // 6. Check RLS status on requests table
  const { data: rlsCheck, error: rlsErr } = await supabase
    .rpc('to_regclass', { arg: 'public.requests' })
    .maybeSingle()

  // Use raw SQL to check RLS
  const { data: rlsStatus, error: rlsStatusErr } = await supabase
    .from('pg_tables')
    .select('rowsecurity')
    .eq('schemaname', 'public')
    .eq('tablename', 'requests')
    .maybeSingle()

  // Fallback: just check if we get different results with/without service role
  console.log('\n6. RLS CHECK:')
  if (rlsStatusErr) {
    console.log('   Could not query pg_tables directly, trying alternate check...')
  } else if (rlsStatus) {
    console.log(`   RLS enabled on requests table: ${rlsStatus.rowsecurity}`)
  }

  // 7. Check policies
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'requests')

  if (polErr) {
    console.log('   Could not query pg_policies:', polErr.message)
  } else {
    console.log(`\n7. RLS POLICIES ON REQUESTS: ${policies?.length ?? 0}`)
    if (policies) {
      for (const p of policies) {
        console.log(`   - ${p.policyname}: ${p.cmd} | ${p.qual}`)
      }
    }
  }

  // 8. Check sheets with import_source = 'request' created recently
  const { data: requestSheets } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, requesting_company_id, import_source, created_at')
    .eq('import_source', 'request')
    .order('created_at', { ascending: false })
    .limit(20)

  console.log(`\n8. SHEETS WITH import_source='request': ${requestSheets?.length ?? 0}`)
  if (requestSheets && requestSheets.length > 0) {
    for (const s of requestSheets) {
      console.log(`   - ${s.id}: "${s.name}" | status: ${s.status} | company: ${s.company_id} | requesting_company: ${s.requesting_company_id} | created: ${s.created_at}`)
    }
  }

  // 9. Check auth.users for Martyna
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers()
  if (!authErr && authUsers) {
    const martynaAuth = authUsers.filter(u =>
      u.email?.toLowerCase().includes('martyna') ||
      u.email?.toLowerCase().includes('mikokowska') ||
      u.email?.toLowerCase().includes('solenis')
    )
    console.log(`\n9. AUTH USERS MATCHING "martyna/mikokowska/solenis": ${martynaAuth.length}`)
    for (const u of martynaAuth) {
      console.log(`   - ${u.id}: ${u.email} | confirmed: ${u.email_confirmed_at ? 'yes' : 'NO'} | last_sign_in: ${u.last_sign_in_at}`)
    }
  }

  console.log('\n=== DIAGNOSTIC COMPLETE ===')
}

diagnose().catch(console.error)
