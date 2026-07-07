/**
 * Provision Sappi Alfeld workflow users + plant role assignments.
 *
 * Fill in ROSTER below with the REAL names and emails (from the Alfeld
 * Formblatt or your Sappi contact), then run:
 *
 *   Dev rehearsal:  npx tsx provision-sappi-alfeld-users.ts
 *   Production:     CUTOVER_CONFIRM=yes npx tsx --env-file=.env.production provision-sappi-alfeld-users.ts
 *
 * What it does per roster entry, idempotently:
 *   1. auth.admin.createUser with email_confirm: true. NO email is sent.
 *      If the auth user already exists it is reused, never duplicated.
 *   2. Upserts the public.users row (full_name, first/last name, company,
 *      role 'editor') keyed to the auth user id.
 *   3. Upserts the plant_role_assignments row for the Alfeld plant.
 *
 * It NEVER sends invitations. Sending login invites (password reset links)
 * is a separate deliberate step; see the note printed at the end.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const IS_PROD = SUPABASE_URL.includes('yrguoooxamecsjtkfqcw')

if (IS_PROD && process.env.CUTOVER_CONFIRM !== 'yes') {
  console.error('Refusing to run: target is PRODUCTION. Set CUTOVER_CONFIRM=yes explicitly.')
  process.exit(1)
}

type WorkflowRole =
  | 'requestor' | 'operator' | 'procurement' | 'incident_officer'
  | 'water_protection' | 'pqm' | 'security_specialist'
  | 'head_procurement' | 'operator_brk' | 'fire_protection'

// ============================================================================
// FILL THIS IN with the real Alfeld roster before running against prod.
// Entries with a null email are skipped with a warning, so partial rosters
// are fine; re-run any time as names are confirmed.
// Formblatt hints, for reference:
//   procurement:         B. Neumann, T. Grotian
//   incident_officer:    Richard Huster
//   water_protection:    H. Brix
//   pqm:                 (S. Berdzinski has an account already) R. Stephan
//   security_specialist: C. Brendes, J. Raudis
//   head_procurement:    D. Jeckstadt, C. Ahrens
//   operator_brk:        (P. Holzberger has an account already) T. Handke
//   fire_protection:     R. Ahrens
// ============================================================================
const ROSTER: Array<{
  firstName: string
  lastName: string
  email: string | null // real @sappi.com address, verified, or null to skip
  role: WorkflowRole
}> = [
  { firstName: '', lastName: 'Neumann', email: null, role: 'procurement' },
  { firstName: '', lastName: 'Grotian', email: null, role: 'procurement' },
  { firstName: 'Richard', lastName: 'Huster', email: null, role: 'incident_officer' },
  { firstName: '', lastName: 'Brix', email: null, role: 'water_protection' },
  { firstName: '', lastName: 'Stephan', email: null, role: 'pqm' },
  { firstName: '', lastName: 'Brendes', email: null, role: 'security_specialist' },
  { firstName: '', lastName: 'Raudis', email: null, role: 'security_specialist' },
  { firstName: '', lastName: 'Jeckstadt', email: null, role: 'head_procurement' },
  { firstName: '', lastName: 'Ahrens', email: null, role: 'head_procurement' },
  { firstName: '', lastName: 'Handke', email: null, role: 'operator_brk' },
  { firstName: '', lastName: 'Ahrens', email: null, role: 'fire_protection' },
]

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log(`Provisioning Sappi Alfeld users against ${IS_PROD ? 'PRODUCTION' : 'dev'} (${SUPABASE_URL})\n`)

  const { data: companies, error: ce } = await sb.from('companies').select('id, name').ilike('name', '%sappi%')
  if (ce || !companies || companies.length !== 1) {
    console.error('Expected exactly one Sappi company, got:', companies?.map(c => c.name), ce?.message)
    process.exit(1)
  }
  const company = companies[0]

  const { data: plant, error: pe } = await sb.from('plants').select('id, name').eq('company_id', company.id).eq('code', 'alfeld').single()
  if (pe || !plant) {
    console.error('Alfeld plant not found for', company.name, pe?.message)
    process.exit(1)
  }
  console.log(`Company: ${company.name} (${company.id})\nPlant:   ${plant.name} (${plant.id})\n`)

  let created = 0, reused = 0, assigned = 0, skipped = 0
  for (const person of ROSTER) {
    const label = `${person.role} ${person.firstName || '?'} ${person.lastName}`
    if (!person.email) {
      console.log(`  [skip] ${label}: no verified email in roster yet`)
      skipped++
      continue
    }
    const email = person.email.toLowerCase().trim()

    // 1. Auth user: create silently or reuse.
    let authId: string
    const { data: createdUser, error: createErr } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (createErr) {
      if (/already/i.test(createErr.message)) {
        const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 })
        const existing = list?.users.find(u => u.email === email)
        if (!existing) {
          console.log(`  [fail] ${label}: auth says exists but not found (${createErr.message})`)
          skipped++
          continue
        }
        authId = existing.id
        reused++
      } else {
        console.log(`  [fail] ${label}: ${createErr.message}`)
        skipped++
        continue
      }
    } else {
      authId = createdUser.user.id
      created++
    }

    // 2. public.users row.
    const fullName = `${person.firstName} ${person.lastName}`.trim()
    const { error: ue } = await sb.from('users').upsert(
      {
        id: authId,
        email,
        full_name: fullName,
        first_name: person.firstName || null,
        last_name: person.lastName,
        company_id: company.id,
        role: 'editor',
      },
      { onConflict: 'id' },
    )
    if (ue) {
      console.log(`  [fail] ${label}: users row: ${ue.message}`)
      skipped++
      continue
    }

    // 3. Role assignment.
    const { error: ae } = await sb.from('plant_role_assignments').upsert(
      { plant_id: plant.id, user_id: authId, role: person.role },
      { onConflict: 'plant_id,user_id,role', ignoreDuplicates: true },
    )
    if (ae) {
      console.log(`  [fail] ${label}: assignment: ${ae.message}`)
      skipped++
      continue
    }
    console.log(`  [ok]   ${label} -> ${email}`)
    assigned++
  }

  console.log(`\nDone. Auth created: ${created}  reused: ${reused}  roles assigned: ${assigned}  skipped: ${skipped}`)
  console.log('\nNo emails were sent. When you want these people to get login access,')
  console.log('send password-reset invites as a separate deliberate step (the app\'s')
  console.log('forgot-password flow, or auth.admin.generateLink type recovery per user).')
}

main()
