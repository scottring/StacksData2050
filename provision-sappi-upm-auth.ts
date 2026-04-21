import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Toggle this to false when ready to actually provision
const DRY_RUN = true

const TEMP_PASSWORD = 'StacksData2026!'

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  Sappi + UPM Auth Provisioning`)
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE -- creating accounts'}`)
  console.log(`${'='.repeat(60)}\n`)

  // Step 1: Find Sappi and UPM companies
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name')
    .or('name.ilike.%sappi%,name.ilike.%upm%')

  if (compErr) {
    console.error('Failed to query companies:', compErr.message)
    process.exit(1)
  }

  if (!companies || companies.length === 0) {
    console.error('No companies found matching Sappi or UPM')
    process.exit(1)
  }

  console.log('Companies found:')
  companies.forEach(c => console.log(`  ${c.name} (${c.id})`))

  // Step 2: Get all users for these companies
  const companyIds = companies.map(c => c.id)
  const companyMap = new Map(companies.map(c => [c.id, c.name]))

  const { data: dbUsers, error: userErr } = await supabase
    .from('users')
    .select('id, email, full_name, role, company_id')
    .in('company_id', companyIds)
    .order('company_id')

  if (userErr) {
    console.error('Failed to query users:', userErr.message)
    process.exit(1)
  }

  if (!dbUsers || dbUsers.length === 0) {
    console.log('No users found for these companies.')
    process.exit(0)
  }

  console.log(`\nFound ${dbUsers.length} users in the DB for Sappi/UPM:\n`)
  dbUsers.forEach(u => {
    console.log(`  ${companyMap.get(u.company_id)?.padEnd(20)} ${(u.full_name || 'no name').padEnd(30)} ${u.email || 'no email'}`)
  })

  // Step 3: Get all existing auth users (paginated)
  let allAuthUsers: any[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error(`Error listing auth users (page ${page}):`, error.message)
      break
    }
    allAuthUsers = allAuthUsers.concat(data.users)
    if (data.users.length < perPage) break
    page++
  }

  console.log(`\nTotal existing auth accounts: ${allAuthUsers.length}`)

  const authByEmail = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u]))
  const authById = new Set(allAuthUsers.map(u => u.id))

  // Step 4: Determine who needs provisioning
  const needsProvisioning: typeof dbUsers = []
  const alreadyProvisioned: typeof dbUsers = []
  const skipped: { user: typeof dbUsers[0]; reason: string }[] = []

  for (const user of dbUsers) {
    if (!user.email) {
      skipped.push({ user, reason: 'no email address' })
      continue
    }

    const hasAuthByEmail = authByEmail.has(user.email.toLowerCase())
    const hasAuthById = authById.has(user.id)

    if (hasAuthByEmail || hasAuthById) {
      alreadyProvisioned.push(user)
    } else {
      needsProvisioning.push(user)
    }
  }

  // Report
  console.log(`\n${'='.repeat(60)}`)
  console.log('  REPORT')
  console.log(`${'='.repeat(60)}`)

  if (alreadyProvisioned.length > 0) {
    console.log(`\nAlready have auth accounts (${alreadyProvisioned.length}):`)
    alreadyProvisioned.forEach(u => {
      const company = companyMap.get(u.company_id)
      console.log(`  [OK] ${company} -- ${u.full_name} <${u.email}>`)
    })
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (${skipped.length}):`)
    skipped.forEach(({ user, reason }) => {
      const company = companyMap.get(user.company_id)
      console.log(`  [SKIP] ${company} -- ${user.full_name || 'unnamed'} -- ${reason}`)
    })
  }

  const sappiNeed = needsProvisioning.filter(u => companyMap.get(u.company_id)?.toLowerCase().includes('sappi'))
  const upmNeed = needsProvisioning.filter(u => companyMap.get(u.company_id)?.toLowerCase().includes('upm'))

  console.log(`\nNeed provisioning: ${needsProvisioning.length} total`)
  console.log(`  Sappi: ${sappiNeed.length}`)
  console.log(`  UPM:   ${upmNeed.length}`)

  if (needsProvisioning.length > 0) {
    console.log(`\nUsers to provision:`)
    needsProvisioning.forEach(u => {
      const company = companyMap.get(u.company_id)
      console.log(`  [NEED] ${company} -- ${u.full_name} <${u.email}> (DB id: ${u.id})`)
    })
  }

  // Step 5: Provision (or dry-run report)
  if (needsProvisioning.length === 0) {
    console.log('\nAll users already have auth accounts. Nothing to do.')
    return
  }

  if (DRY_RUN) {
    console.log(`\n${'='.repeat(60)}`)
    console.log('  DRY RUN -- no accounts created')
    console.log(`  To provision for real, set DRY_RUN = false in the script`)
    console.log(`${'='.repeat(60)}`)
    return
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('  PROVISIONING AUTH ACCOUNTS')
  console.log(`${'='.repeat(60)}\n`)

  let created = 0
  let failed = 0

  for (const user of needsProvisioning) {
    const company = companyMap.get(user.company_id)

    const { data, error } = await supabase.auth.admin.createUser({
      id: user.id,  // Use the SAME UUID as the users table -- critical for FK matching
      email: user.email,
      password: TEMP_PASSWORD,
      email_confirm: true,  // Mark email as confirmed so they can log in immediately
      user_metadata: {
        full_name: user.full_name || '',
      },
    })

    if (error) {
      console.error(`  [FAIL] ${company} -- ${user.full_name} <${user.email}>: ${error.message}`)
      failed++
    } else {
      console.log(`  [CREATED] ${company} -- ${user.full_name} <${user.email}> (auth id: ${data.user.id})`)
      created++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  DONE: ${created} created, ${failed} failed`)
  console.log(`  Temp password: ${TEMP_PASSWORD}`)
  console.log(`${'='.repeat(60)}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
