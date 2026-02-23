import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('\n=== FULL AUDIT OF ALL TRIAL USERS ===\n')

  // 1. Get all trial invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('email, accepted_at, sent_at, expires_at')
    .eq('invitation_type', 'trial')
    .order('email')

  console.log(`Total trial invitations: ${invitations?.length}\n`)

  // 2. Get all auth users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const authByEmail = new Map(authUsers?.map(u => [u.email?.toLowerCase(), u]) || [])

  // 3. Get all public users
  const { data: publicUsers } = await supabase
    .from('users')
    .select('id, email, full_name, company_id, companies(name)')

  const publicByEmail = new Map(publicUsers?.map(u => [u.email?.toLowerCase(), u]) || [])
  const publicById = new Map(publicUsers?.map(u => [u.id, u]) || [])

  // 4. Analyze each trial invitation
  console.log('EMAIL                                    | AUTH? | PUBLIC? | IDs MATCH? | STATUS')
  console.log('-'.repeat(100))

  let working = 0
  let broken = 0
  let notSignedUp = 0

  for (const inv of invitations || []) {
    const email = inv.email.toLowerCase()
    const authUser = authByEmail.get(email)
    const publicUser = publicByEmail.get(email)

    const hasAuth = !!authUser
    const hasPublic = !!publicUser
    const idsMatch = hasAuth && hasPublic && authUser.id === publicUser.id

    let status = ''
    if (!hasAuth && !hasPublic) {
      status = 'NOT SIGNED UP YET'
      notSignedUp++
    } else if (hasAuth && hasPublic && idsMatch) {
      status = '✓ WORKING'
      working++
    } else if (hasAuth && hasPublic && !idsMatch) {
      status = '✗ BROKEN - ID MISMATCH'
      broken++
    } else if (hasAuth && !hasPublic) {
      status = '✗ BROKEN - NO PUBLIC RECORD'
      broken++
    } else if (!hasAuth && hasPublic) {
      status = '✗ BROKEN - NO AUTH RECORD'
      broken++
    }

    const authStr = hasAuth ? 'YES' : 'NO '
    const publicStr = hasPublic ? 'YES' : 'NO '
    const matchStr = idsMatch ? 'YES' : (hasAuth && hasPublic ? 'NO!' : 'N/A')

    console.log(`${email.padEnd(40)} | ${authStr}   | ${publicStr}     | ${matchStr.padEnd(10)} | ${status}`)

    // If broken, show the IDs
    if (status.includes('BROKEN')) {
      if (authUser) console.log(`    auth.users ID:   ${authUser.id}`)
      if (publicUser) console.log(`    public.users ID: ${publicUser.id}`)
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log(`SUMMARY:`)
  console.log(`  Working correctly: ${working}`)
  console.log(`  Broken (need fix): ${broken}`)
  console.log(`  Not signed up yet: ${notSignedUp}`)
  console.log(`  Total invitations: ${invitations?.length}`)
}

main().catch(console.error)
