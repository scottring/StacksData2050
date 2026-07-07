/**
 * Seed Sappi Alfeld plant + role assignments for Product Introduction Workflow.
 *
 * Run after 20260421000002_product_introduction_workflow.sql is applied.
 *
 * Idempotent: uses upsert-style logic so re-running is safe.
 *
 * Usage:
 *   cd stacks
 *   npx tsx seed-sappi-workflow.ts
 *
 * Prereqs:
 *   - Sappi's company exists in public.companies (search by name "Sappi")
 *   - Per-role users exist in public.users (optional — role assignments
 *     skipped for missing users, logged as warnings)
 *
 * What this seeds:
 *   - One plant row: Sappi Alfeld (code "alfeld")
 *   - plant_role_assignments for each named person on the Formblatt,
 *     looked up by email/name (skipped if user not in DB yet)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load .env only — matches the convention used by other utility scripts
// in this directory. Avoid .env.local, which points at local Supabase.
dotenv.config()

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type WorkflowRole =
  | 'requestor'
  | 'operator'
  | 'procurement'
  | 'incident_officer'
  | 'water_protection'
  | 'pqm'
  | 'security_specialist'
  | 'head_procurement'
  | 'operator_brk'
  | 'fire_protection'

// Named approvers from MP_04_02_04_001_01 Formblatt.
// Emails are placeholders — fill in real addresses once users are created
// in Stacks, or match by name via a lookup.
const ALFELD_ROLE_ASSIGNMENTS: Array<{
  role: WorkflowRole
  // Any of these identifiers can be used to find the user:
  nameHints: string[]
}> = [
  { role: 'procurement', nameHints: ['B. Neumann', 'T. Grotian'] },
  { role: 'incident_officer', nameHints: ['Richard Huster'] },
  { role: 'water_protection', nameHints: ['H. Brix'] },
  { role: 'pqm', nameHints: ['S. Berdzinski', 'R. Stephan'] },
  { role: 'security_specialist', nameHints: ['C. Brendes', 'J. Raudis'] },
  { role: 'head_procurement', nameHints: ['D. Jeckstadt', 'C. Ahrens'] },
  { role: 'operator_brk', nameHints: ['T. Handke', 'P. Holzberger'] },
  { role: 'fire_protection', nameHints: ['R. Ahrens'] },
]

async function main() {
  console.log('Seeding Sappi Alfeld workflow configuration...\n')

  // 1. Find Sappi's company record
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%sappi%')

  if (companyError) {
    console.error('Error finding Sappi company:', companyError)
    process.exit(1)
  }

  if (!companies || companies.length === 0) {
    console.error('No company matching "Sappi" found in public.companies')
    console.error('Create the Sappi tenant first, then re-run.')
    process.exit(1)
  }

  if (companies.length > 1) {
    console.log('Multiple Sappi companies found:')
    companies.forEach((c) => console.log(`  - ${c.id}  ${c.name}`))
    console.log('Update this script with a specific company_id.')
    process.exit(1)
  }

  const sappi = companies[0]
  console.log(`Sappi company: ${sappi.id}  ${sappi.name}\n`)

  // 2. Upsert Alfeld plant
  const { data: existingPlant } = await supabase
    .from('plants')
    .select('id')
    .eq('company_id', sappi.id)
    .eq('code', 'alfeld')
    .maybeSingle()

  let plantId: string
  if (existingPlant) {
    plantId = existingPlant.id
    console.log(`Plant already exists: ${plantId}  (alfeld)`)
  } else {
    const { data: newPlant, error: plantError } = await supabase
      .from('plants')
      .insert({
        company_id: sappi.id,
        code: 'alfeld',
        name: 'Sappi Alfeld Mill',
      })
      .select('id')
      .single()

    if (plantError || !newPlant) {
      console.error('Failed to create plant:', plantError)
      process.exit(1)
    }
    plantId = newPlant.id
    console.log(`Plant created: ${plantId}  (alfeld)`)
  }

  // 3. Assign roles (best-effort — skip users we can't find)
  console.log('\nAssigning roles...')
  let assigned = 0
  let skipped = 0

  for (const { role, nameHints } of ALFELD_ROLE_ASSIGNMENTS) {
    for (const hint of nameHints) {
      // Formblatt hints are "Initial. Surname" (e.g. "B. Neumann") or a full
      // name (e.g. "Richard Huster"). Matching the whole hint against
      // full_name never works for the full-name case ("Philipp Holzberger"
      // has no "P." token), so match on the surname only. Email match is
      // still built from the full hint with punctuation/spaces stripped.
      const surname = hint.split(/\s+/).pop()
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('company_id', sappi.id)
        .or(`full_name.ilike.%${surname}%,email.ilike.%${hint.replace(/\.\s*/g, '').replace(/\s+/g, '')}%`)

      if (!users || users.length === 0) {
        console.log(`  [skip] ${role} ${hint}: no matching user`)
        skipped++
        continue
      }

      if (users.length > 1) {
        console.log(
          `  [ambiguous] ${role} ${hint}: multiple matches (${users
            .map((u) => u.email)
            .join(', ')}) - skipping, resolve manually`,
        )
        skipped++
        continue
      }

      const user = users[0]
      const { error: assignError } = await supabase
        .from('plant_role_assignments')
        .upsert(
          {
            plant_id: plantId,
            user_id: user.id,
            role,
          },
          { onConflict: 'plant_id,user_id,role', ignoreDuplicates: true },
        )

      if (assignError) {
        console.log(`  [fail] ${role} ${hint}: ${assignError.message}`)
        skipped++
      } else {
        console.log(`  [ok]   ${role} -> ${user.full_name ?? user.email} (${user.id})`)
        assigned++
      }
    }
  }

  console.log(`\nDone. Assigned: ${assigned}   Skipped: ${skipped}`)
  if (skipped > 0) {
    console.log('\nSkipped rows mean the named person does not yet exist')
    console.log('as a user in Sappi\'s tenant. Create them, then re-run.')
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
