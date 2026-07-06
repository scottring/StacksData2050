import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
)

async function main() {
  // Count total public.users
  const { count: totalUsers } = await s.from('users').select('*', { count: 'exact', head: true })
  console.log(`Total public.users: ${totalUsers}`)

  // Count non-placeholder users (real emails)
  const { data: realUsers } = await s.from('users')
    .select('id, email, full_name, role, company_id')
    .not('email', 'ilike', '%placeholder%')
    .not('email', 'is', null)
    .order('email')

  console.log(`Real email users: ${realUsers?.length}`)

  // Count auth users
  const { data: authData } = await s.auth.admin.listUsers({ perPage: 1000 })
  const authUsers = authData?.users || []
  console.log(`Auth users: ${authUsers.length}`)

  // Build set of auth user emails
  const authEmails = new Set(authUsers.map(u => u.email?.toLowerCase()))

  // Find real users WITH auth accounts
  const withAuth: any[] = []
  const withoutAuth: any[] = []

  for (const u of realUsers || []) {
    if (authEmails.has(u.email?.toLowerCase())) {
      withAuth.push(u)
    } else {
      withoutAuth.push(u)
    }
  }

  console.log(`\nReal users WITH auth account: ${withAuth.length}`)
  for (const u of withAuth) {
    console.log(`  ${u.email} (${u.full_name})`)
  }

  console.log(`\nReal users WITHOUT auth account: ${withoutAuth.length}`)
  // Group by company
  const companyIds = [...new Set(withoutAuth.map(u => u.company_id))]
  const { data: companies } = await s.from('companies').select('id, name').in('id', companyIds)
  const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

  const byCompany = new Map<string, any[]>()
  for (const u of withoutAuth) {
    const name = companyMap.get(u.company_id) || 'Unknown'
    if (!byCompany.has(name)) byCompany.set(name, [])
    byCompany.get(name)!.push(u)
  }

  for (const [company, users] of [...byCompany.entries()].sort()) {
    console.log(`\n  ${company}:`)
    for (const u of users) {
      console.log(`    ${u.email} (${u.full_name || 'no name'})`)
    }
  }

  // Count active companies with real users
  const activeCompanyIds = [...new Set((realUsers || []).map(u => u.company_id))]
  console.log(`\nActive companies (with real-email users): ${activeCompanyIds.length}`)
}

main()
