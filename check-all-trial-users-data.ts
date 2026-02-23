import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const orphanedUsers = [
  'jorge.garcia@saica.com',
  'javierm.lopez@saica.com',
  'tiia.aho@kemira.com',
  'christian.torborg@sappi.com',
  'abdessamad.arbaoui@omya.com',
  'kaisa.herranen@upm.com',
  'nicole.rugen-penkalla@kemira.com',
  'patricia.cebollada@saica.com',
]

async function main() {
  console.log('=== CHECKING ALL DATA FOR ORPHANED TRIAL USERS ===\n')

  // Get all public.users records for these emails
  const { data: publicUsers } = await supabase
    .from('users')
    .select('id, email, full_name, company_id')
    .in('email', orphanedUsers.map(e => e.toLowerCase()))

  const usersByEmail = new Map(publicUsers?.map(u => [u.email?.toLowerCase(), u]) || [])

  console.log('EMAIL                              | ANSWERS | SHEETS | ACTIVITY | SAFE TO FIX?')
  console.log('-'.repeat(85))

  let allSafe = true

  for (const email of orphanedUsers) {
    const publicUser = usersByEmail.get(email.toLowerCase())

    if (!publicUser) {
      console.log(`${email.padEnd(34)} | NO PUBLIC.USERS RECORD`)
      continue
    }

    const userId = publicUser.id

    // Check answers
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('created_by', userId)

    // Check sheets
    const { data: sheets } = await supabase
      .from('sheets')
      .select('id')
      .eq('created_by', userId)

    // Check activity (by email - will persist)
    const { data: activity } = await supabase
      .from('trial_activity_events')
      .select('id')
      .eq('email', email.toLowerCase())

    const answerCount = answers?.length || 0
    const sheetCount = sheets?.length || 0
    const activityCount = activity?.length || 0
    const isSafe = answerCount === 0 && sheetCount === 0

    if (!isSafe) allSafe = false

    const safeStr = isSafe ? '✓ YES' : '❌ NO - HAS DATA'

    console.log(
      `${email.padEnd(34)} | ${String(answerCount).padEnd(7)} | ${String(sheetCount).padEnd(6)} | ${String(activityCount).padEnd(8)} | ${safeStr}`
    )
  }

  console.log('\n' + '='.repeat(85))

  if (allSafe) {
    console.log('\n✓ ALL USERS SAFE TO FIX - No answers or sheets will be lost')
    console.log('  Activity events are tied to EMAIL and will persist automatically')
  } else {
    console.log('\n⚠️  SOME USERS HAVE DATA - Need to update user_id references after fix')
  }
}

main().catch(console.error)
