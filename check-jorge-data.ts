import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Jorge's current orphan public.users ID
  const jorgeUserId = 'e9739565-1ef2-49e5-a4d1-c0e3934abf1d'
  const jorgeEmail = 'jorge.garcia@saica.com'

  console.log('=== CHECKING ALL DATA TIED TO JORGE ===\n')
  console.log(`User ID: ${jorgeUserId}`)
  console.log(`Email: ${jorgeEmail}\n`)

  // 1. Trial activity events (by email)
  const { data: activityByEmail } = await supabase
    .from('trial_activity_events')
    .select('id')
    .eq('email', jorgeEmail)
  console.log(`trial_activity_events (by email): ${activityByEmail?.length || 0} records`)

  // 2. Trial activity events (by user_id)
  const { data: activityByUserId } = await supabase
    .from('trial_activity_events')
    .select('id')
    .eq('user_id', jorgeUserId)
  console.log(`trial_activity_events (by user_id): ${activityByUserId?.length || 0} records`)

  // 3. Answers submitted by this user
  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .eq('created_by', jorgeUserId)
  console.log(`answers (created_by): ${answers?.length || 0} records`)

  // 4. Sheets created by this user
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id')
    .eq('created_by', jorgeUserId)
  console.log(`sheets (created_by): ${sheets?.length || 0} records`)

  // 5. Discovery responses (by email)
  const { data: discovery } = await supabase
    .from('trial_discovery_responses')
    .select('id')
    .eq('email', jorgeEmail)
  console.log(`trial_discovery_responses (by email): ${discovery?.length || 0} records`)

  // 6. Check public.users record
  const { data: publicUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', jorgeUserId)
    .single()
  console.log(`\npublic.users record:`)
  if (publicUser) {
    console.log(`  ID: ${publicUser.id}`)
    console.log(`  Email: ${publicUser.email}`)
    console.log(`  Name: ${publicUser.full_name}`)
    console.log(`  Company ID: ${publicUser.company_id}`)
    console.log(`  Role: ${publicUser.role}`)
  }

  // 7. Check if company exists
  if (publicUser?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', publicUser.company_id)
      .single()
    console.log(`\nCompany:`)
    console.log(`  ID: ${company?.id}`)
    console.log(`  Name: ${company?.name}`)
  }

  console.log('\n=== SUMMARY ===')
  console.log('Data tied by EMAIL (will persist): activity_events, discovery_responses')
  console.log('Data tied by USER_ID (needs update if ID changes): activity_events.user_id, answers, sheets')
}

main().catch(console.error)
