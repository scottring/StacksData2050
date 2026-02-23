import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('=== INVESTIGATING JORGE\'S ACCOUNT ===\n')

  // Check trial_activity_events table (this is where the admin page gets activity counts)
  const { data: jorgeEvents } = await supabase
    .from('trial_activity_events')
    .select('*')
    .eq('email', 'jorge.garcia@saica.com')
    .order('created_at', { ascending: false })

  console.log('=== JORGE\'S ACTIVITY EVENTS ===')
  console.log(`Found ${jorgeEvents?.length || 0} events`)
  if (jorgeEvents?.length) {
    jorgeEvents.forEach(e => {
      console.log(`  ${e.created_at} | ${e.event_type} | user_id: ${e.user_id}`)
    })

    // Get unique user_ids from Jorge's events
    const userIds = [...new Set(jorgeEvents.map(e => e.user_id).filter(Boolean))]
    console.log('\nUnique user_ids in Jorge\'s events:')
    userIds.forEach(id => console.log(`  ${id}`))

    // Check if any of these user_ids exist in auth.users
    console.log('\nChecking if these IDs exist in auth.users:')
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const authIds = new Set(authUsers?.map(u => u.id))

    for (const userId of userIds) {
      const exists = authIds.has(userId)
      console.log(`  ${userId}: ${exists ? '✓ EXISTS in auth' : '❌ NOT in auth'}`)

      if (exists) {
        const authUser = authUsers?.find(u => u.id === userId)
        console.log(`    Email: ${authUser?.email}`)
        console.log(`    Last sign in: ${authUser?.last_sign_in_at}`)
      }
    }
  }

  // Also check other trial users
  console.log('\n=== ALL TRIAL ACTIVITY EVENTS ===')
  const { data: allEvents } = await supabase
    .from('trial_activity_events')
    .select('email, user_id, event_type, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Group by email
  const byEmail = new Map<string, any[]>()
  allEvents?.forEach(e => {
    const email = e.email?.toLowerCase() || 'unknown'
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email)!.push(e)
  })

  console.log('\nActivity by email:')
  for (const [email, events] of byEmail) {
    const userIds = [...new Set(events.map(e => e.user_id).filter(Boolean))]
    console.log(`  ${email}: ${events.length} events`)
    console.log(`    user_ids: ${userIds.join(', ') || 'none'}`)
  }
}

main().catch(console.error)
