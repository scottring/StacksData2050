import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('\n=== INVESTIGATING BROKEN USER RECORDS ===\n')

  // 1. Get ALL auth.users and look for Saica users
  console.log('1. Checking ALL auth.users for Saica emails...')
  const { data: { users: allAuthUsers } } = await supabase.auth.admin.listUsers()

  console.log(`Total auth users: ${allAuthUsers?.length}`)

  // Find any auth users with saica in email
  const saicaAuthUsers = allAuthUsers?.filter(u =>
    u.email?.toLowerCase().includes('saica') ||
    u.email?.toLowerCase().includes('jorge') ||
    u.email?.toLowerCase().includes('javier')
  ) || []

  console.log(`\nAuth users matching saica/jorge/javier:`)
  for (const user of saicaAuthUsers) {
    console.log(`  - ${user.email}`)
    console.log(`    auth.users ID: ${user.id}`)
    console.log(`    Created: ${user.created_at}`)
    console.log(`    Last sign in: ${user.last_sign_in_at || 'never'}`)
    console.log(`    Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
  }

  // 2. Get current public.users for Saica
  console.log('\n2. Checking current public.users for Saica...')
  const { data: saicaPublicUsers } = await supabase
    .from('users')
    .select('id, email, full_name, company_id, created_at')
    .ilike('email', '%saica%')

  console.log(`\nPublic users with saica in email:`)
  for (const user of saicaPublicUsers || []) {
    console.log(`  - ${user.email} (${user.full_name})`)
    console.log(`    public.users ID: ${user.id}`)
    console.log(`    Created: ${user.created_at}`)

    // Check if this ID matches any auth user
    const matchingAuth = allAuthUsers?.find(a => a.id === user.id)
    if (matchingAuth) {
      console.log(`    ✓ MATCHES auth user: ${matchingAuth.email}`)
    } else {
      console.log(`    ✗ NO MATCHING AUTH USER - BROKEN!`)
    }
  }

  // 3. Find the mismatch
  console.log('\n3. Finding auth users WITHOUT public.users records...')
  const publicUserIds = new Set(saicaPublicUsers?.map(u => u.id) || [])

  for (const authUser of saicaAuthUsers) {
    if (!publicUserIds.has(authUser.id)) {
      console.log(`  Auth user ${authUser.email} (${authUser.id}) has NO public.users record`)
    }
  }

  // 4. Check if there are duplicate emails in public.users
  console.log('\n4. Checking for duplicate/orphaned public.users records...')
  const saicaEmails = new Set(saicaAuthUsers.map(u => u.email?.toLowerCase()))

  for (const publicUser of saicaPublicUsers || []) {
    const hasMatchingAuth = saicaAuthUsers.some(a => a.id === publicUser.id)
    const emailInAuth = saicaEmails.has(publicUser.email?.toLowerCase())

    if (!hasMatchingAuth) {
      console.log(`  ORPHANED: ${publicUser.email} (public.users ID: ${publicUser.id})`)
      console.log(`    Email exists in auth? ${emailInAuth ? 'YES' : 'NO'}`)

      if (emailInAuth) {
        const correctAuthUser = saicaAuthUsers.find(a => a.email?.toLowerCase() === publicUser.email?.toLowerCase())
        if (correctAuthUser) {
          console.log(`    CORRECT auth ID should be: ${correctAuthUser.id}`)
        }
      }
    }
  }
}

main().catch(console.error)
