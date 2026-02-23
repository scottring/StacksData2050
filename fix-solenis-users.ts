import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SOLENIS_COMPANY_ID = '082f73e3-f597-4a86-a750-1ef30d191578'

// Auth users at Solenis who need public.users records
const SOLENIS_AUTH_USERS = [
  { id: 'd616ce03-dd8e-4e64-9a86-24e991394f3d', email: 'mkokowska@solenis.com', full_name: 'Martyna Kokowska' },
  { id: '82acc231-c25e-4a2e-a638-d76f7c7e0f57', email: 'tjaspaert@solenis.com', full_name: 'Tom Jaspaert' },
  { id: '4ac35170-68a7-4559-b8d1-01af52eed257', email: 'regulatoryrequestsemea@solenis.com', full_name: 'Regulatory Requests EMEA' },
  { id: '31652016-277e-4d3e-b2a1-da172a13ec0c', email: 'jifeng_wu@solenis.com', full_name: 'Jifeng Wu' },
]

async function fix() {
  console.log('=== FIX SOLENIS USERS ===\n')

  // Verify Solenis company exists
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', SOLENIS_COMPANY_ID)
    .single()

  if (!company) {
    console.log('ERROR: Solenis company not found!')
    return
  }
  console.log(`Company: ${company.name} (${company.id})\n`)

  for (const authUser of SOLENIS_AUTH_USERS) {
    // Check if a public.users record already exists for this auth ID
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, company_id')
      .eq('id', authUser.id)
      .single()

    if (existing) {
      if (existing.company_id === SOLENIS_COMPANY_ID) {
        console.log(`SKIP ${authUser.email} - already linked to Solenis`)
      } else {
        console.log(`UPDATE ${authUser.email} - exists but company_id is ${existing.company_id}, updating to Solenis`)
        const { error } = await supabase
          .from('users')
          .update({ company_id: SOLENIS_COMPANY_ID })
          .eq('id', authUser.id)
        if (error) {
          console.log(`  ERROR: ${error.message}`)
        } else {
          console.log(`  DONE`)
        }
      }
      continue
    }

    // Check if email conflicts with an existing record (different id)
    const { data: emailConflict } = await supabase
      .from('users')
      .select('id, email, company_id')
      .eq('email', authUser.email)
      .single()

    if (emailConflict) {
      console.log(`CONFLICT ${authUser.email} - exists with different id (${emailConflict.id}), updating id to match auth`)
      // Update the existing record's id to match the auth user id
      // This is tricky with PKs - instead, delete old and insert new
      const { error: delErr } = await supabase
        .from('users')
        .delete()
        .eq('id', emailConflict.id)
      if (delErr) {
        console.log(`  ERROR deleting old record: ${delErr.message}`)
        continue
      }
    }

    // Insert new record
    console.log(`INSERT ${authUser.email} -> Solenis`)
    const { error } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.full_name,
        company_id: SOLENIS_COMPANY_ID,
        role: 'user',
      })

    if (error) {
      console.log(`  ERROR: ${error.message}`)
    } else {
      console.log(`  DONE`)
    }
  }

  // Verify
  console.log('\n--- VERIFICATION ---')
  const { data: soleUsers } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('company_id', SOLENIS_COMPANY_ID)

  console.log(`Users linked to Solenis: ${soleUsers?.length ?? 0}`)
  for (const u of soleUsers || []) {
    console.log(`  - ${u.email} (${u.id}) | role: ${u.role}`)
  }

  // Check Martyna can now see requests
  const { data: martynaRequests } = await supabase
    .from('requests')
    .select('id, created_at, sheet:sheets(name)')
    .eq('requesting_from_id', SOLENIS_COMPANY_ID)

  console.log(`\nRequests to Solenis (what Martyna should see): ${martynaRequests?.length ?? 0}`)
  for (const r of martynaRequests || []) {
    const sheet = r.sheet as any
    console.log(`  - ${sheet?.name} (${r.created_at})`)
  }

  console.log('\n=== DONE ===')
}

fix().catch(console.error)
