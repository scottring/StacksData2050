import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function diagnose() {
  console.log('=== DEEPER DIAGNOSTIC ===\n')

  // 1. Search ALL auth users (paginated) for mikokowska/solenis
  console.log('1. SEARCHING ALL AUTH USERS...')
  let page = 1
  let allAuthUsers: any[] = []
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error || !users || users.length === 0) break
    allAuthUsers.push(...users)
    if (users.length < 100) break
    page++
  }
  console.log(`   Total auth users: ${allAuthUsers.length}`)

  const matchingAuth = allAuthUsers.filter(u =>
    u.email?.toLowerCase().includes('miko') ||
    u.email?.toLowerCase().includes('solenis') ||
    u.email?.toLowerCase().includes('martyna')
  )
  console.log(`   Matching miko/solenis/martyna: ${matchingAuth.length}`)
  for (const u of matchingAuth) {
    console.log(`   - ${u.id}: ${u.email} | confirmed: ${u.email_confirmed_at ? 'yes' : 'NO'} | last_sign_in: ${u.last_sign_in_at}`)
  }

  // 2. List ALL auth users with their emails for manual review
  console.log(`\n2. ALL AUTH USER EMAILS:`)
  for (const u of allAuthUsers) {
    console.log(`   - ${u.email} (${u.id})`)
  }

  // 3. Get ALL public.users records
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, company_id, role')

  console.log(`\n3. ALL PUBLIC USERS: ${allUsers?.length ?? 0}`)
  if (allUsers) {
    for (const u of allUsers) {
      console.log(`   - ${u.email} | company: ${u.company_id} | role: ${u.role}`)
    }
  }

  // 4. Check which company_id maps to Solenis
  const soleId = '082f73e3-f597-4a86-a750-1ef30d191578'
  console.log(`\n4. USERS WITH SOLENIS COMPANY (${soleId}):`)
  const { data: soleUsers } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('company_id', soleId)

  console.log(`   Found: ${soleUsers?.length ?? 0}`)
  if (soleUsers) {
    for (const u of soleUsers) {
      console.log(`   - ${u.email} (${u.id}) | role: ${u.role}`)
    }
  }

  // 5. Check RLS on requests table via SQL
  console.log('\n5. RLS CHECK VIA SQL:')
  const { data: rlsData, error: rlsErr } = await supabase.rpc('check_rls_status', {})
  if (rlsErr) {
    console.log('   RPC not available, checking via raw query...')
    // Try a different approach - query as anon to see if RLS blocks
    const anonClient = createClient(
      process.env.SUPABASE_URL!,
      // Use a fake JWT to test - actually let's just check the count difference
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Service role bypasses RLS, so count should be 20
    const { count: serviceCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
    console.log(`   Service role sees ${serviceCount} requests (bypasses RLS)`)
  }

  // 6. Who is the requesting_from_id company on Christian's requests?
  console.log('\n6. IDENTIFYING CHRISTIAN:')
  // Christian sent requests "last Wednesday" - that's Feb 4 or Jan 29
  // The requests from 9567b9ac (Feb 3-4) to Solenis seem like Christian's
  const christianCompanyId = '9567b9ac-1c12-457f-8e49-321519c267b3'
  const { data: christianCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', christianCompanyId)
    .single()
  console.log(`   Company ${christianCompanyId}: ${christianCompany?.name ?? 'NOT FOUND'}`)

  const createdBy = '6a4b5cd2-340d-4ebd-9f5f-bad46362e600'
  const { data: christianUser } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('id', createdBy)
    .single()
  console.log(`   User ${createdBy}: ${christianUser?.email ?? 'NOT FOUND'} | role: ${christianUser?.role}`)

  console.log('\n=== DIAGNOSTIC COMPLETE ===')
}

diagnose().catch(console.error)
