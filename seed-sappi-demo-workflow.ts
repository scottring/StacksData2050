/**
 * Dev-only — seed a realistic Sappi Alfeld workflow demo.
 *
 * Creates:
 *   - 10 fake users at Sappi matching the Formblatt approvers
 *   - plant_role_assignments mapping each to their role at Alfeld
 *   - A realistic product Sheet (Kemira Fennobond 85E wet-strength resin)
 *   - A ProductIntroductionWorkflow with zone_a_data + zone_b_data filled,
 *     advanced to status=in_review with the first two steps already
 *     signed and a couple of realistic conditions added by reviewers.
 *
 * Idempotent by name/email — re-runs reuse whatever already exists.
 *
 * Usage:
 *   cd stacks
 *   npx tsx seed-sappi-demo-workflow.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SHEET_NAME = 'Kemira Fennobond 85E — Wet Strength Resin'
const SAPPI_COMPANY_NAME = 'Sappi'
const ALFELD_CODE = 'alfeld'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Fake Alfeld reviewers, modeled on the real Formblatt signers.
// The emails are placeholder-pattern so they're recognisable as fake.
type FakeReviewer = {
  email: string
  first_name: string
  last_name: string
  role:
    | 'procurement'
    | 'incident_officer'
    | 'water_protection'
    | 'pqm'
    | 'security_specialist'
    | 'head_procurement'
    | 'operator_brk'
    | 'fire_protection'
    | 'operator'
}

const REVIEWERS: FakeReviewer[] = [
  { email: 'b.neumann@dev-sappi-alfeld.fake', first_name: 'Birgit', last_name: 'Neumann', role: 'procurement' },
  { email: 'r.huster@dev-sappi-alfeld.fake', first_name: 'Richard', last_name: 'Huster', role: 'incident_officer' },
  { email: 'h.brix@dev-sappi-alfeld.fake', first_name: 'Hans', last_name: 'Brix', role: 'water_protection' },
  { email: 's.berdzinski@dev-sappi-alfeld.fake', first_name: 'Stefan', last_name: 'Berdzinski', role: 'pqm' },
  { email: 'c.brendes@dev-sappi-alfeld.fake', first_name: 'Claudia', last_name: 'Brendes', role: 'security_specialist' },
  { email: 'd.jeckstadt@dev-sappi-alfeld.fake', first_name: 'Dirk', last_name: 'Jeckstadt', role: 'head_procurement' },
  { email: 't.handke@dev-sappi-alfeld.fake', first_name: 'Thomas', last_name: 'Handke', role: 'operator_brk' },
  { email: 'r.ahrens@dev-sappi-alfeld.fake', first_name: 'Rolf', last_name: 'Ahrens', role: 'fire_protection' },
  { email: 'operator.alfeld@dev-sappi-alfeld.fake', first_name: 'Operator', last_name: 'Alfeld', role: 'operator' },
]

// Realistic Zone A fields — what the requesting department filled out.
const ZONE_A_DATA = {
  requesting_department: 'Wet End / Stock Preparation',
  asi_identification_number: 'ASI-2026-00412',
  date_of_introduction: '2026-05-15',
  chemical_characterization: 'Polyamidoamine-epichlorohydrin (PAE) resin, aqueous',
  mat_no_ek: null, // Procurement will fill this
  product_group: 'Wet Strength Resin',
  rating_class: 'Class B — Process Chemical',
  product_hierarchy: 'Paper chemicals > Retention & strength > Wet-strength',
  material_allocation: { SM: [], PM: ['PM1', 'PM3'], UT: [], ZF: [] },
  purpose_of_use: 'Wet-strength development for tissue grade on PM3',
  aim_of_introduction:
    'Replacement for incumbent PAE resin. Targeting 0.5 kg/t lower dosage at equivalent wet/dry strength ratio.',
  manufacturer_supplier: 'Kemira Chemicals GmbH',
  solids_content_pct: 20.0,
  active_ingredient_pct: 12.5,
  density_kg_m3: 1055,
  mission: 'Dose continuously to thick stock at 0.8–1.2% on fibre.',
  location: 'PM3, thick stock chest dosing line 3-B',
  volume_number: '2 x 1000 L IBC per week (expected)',
  storage_location: 'Chemical storage hall C, Bay 4',
  storage_type: 'IBC, bunded floor, indoor heated to >12 °C',
  packaging: '1000 L IBC with secondary containment',
}

// Realistic Zone B — compliance checks, some reviewer-owned.
const ZONE_B_DATA = {
  product_questionnaire_included: true,
  substitute_testing_for_hazardous: true,
  system_compatibility_checked: null, // PQM will fill
  process_change_required: false,
  notes_requirements:
    'Stock chemistry pilot trial on 4/28 produced on-spec tissue at reduced dosage. Full review by PQM pending.',
  incident_ordinance_relevant: null, // Incident officer will fill
  gefstoffv_hazardous: true,
  wgk_class: '1',
  vaws_cadastre_no: null, // Water protection will fill
  sdb_revision_date: '2025-11-18',
}

async function ensureUser(r: FakeReviewer, sappiCompanyId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', r.email)
    .maybeSingle()
  if (existing) return existing.id

  // Users table id references auth.users(id). For a dev demo, we create
  // an auth user via service-role admin API so the FK is satisfied.
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: r.email,
    email_confirm: true,
    user_metadata: { first_name: r.first_name, last_name: r.last_name },
  })
  if (authErr || !authUser.user) {
    throw new Error(`Failed to create auth user ${r.email}: ${authErr?.message}`)
  }

  const full_name = `${r.first_name} ${r.last_name}`
  const { error: insertErr } = await supabase.from('users').insert({
    id: authUser.user.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    full_name,
    company_id: sappiCompanyId,
    role: 'reviewer',
    has_logged_in: false,
  })
  if (insertErr) {
    throw new Error(`Failed to create public.users row for ${r.email}: ${insertErr.message}`)
  }
  return authUser.user.id
}

async function main() {
  console.log('Seeding realistic Sappi Alfeld workflow demo...\n')

  // 1. Sappi company
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', `%${SAPPI_COMPANY_NAME}%`)
  if (!companies?.length) {
    console.error('No Sappi company. Create it first.')
    process.exit(1)
  }
  if (companies.length > 1) {
    console.error('Multiple Sappi matches — ambiguous.')
    process.exit(1)
  }
  const sappi = companies[0]
  console.log(`Sappi company: ${sappi.id}`)

  // 2. Alfeld plant
  const { data: plant } = await supabase
    .from('plants')
    .select('id, name')
    .eq('company_id', sappi.id)
    .eq('code', ALFELD_CODE)
    .maybeSingle()
  if (!plant) {
    console.error('No Alfeld plant. Run seed-sappi-workflow.ts first.')
    process.exit(1)
  }
  console.log(`Plant: ${plant.id} (${plant.name})`)

  // 3. Reviewer users + role assignments
  console.log('\nEnsuring reviewers + role assignments...')
  const userIdByRole = new Map<string, string>()
  for (const r of REVIEWERS) {
    const userId = await ensureUser(r, sappi.id)
    userIdByRole.set(r.role, userId)
    await supabase
      .from('plant_role_assignments')
      .upsert(
        { plant_id: plant.id, user_id: userId, role: r.role },
        { onConflict: 'plant_id,user_id,role', ignoreDuplicates: true }
      )
    console.log(`  ${r.role.padEnd(20)} ${r.first_name} ${r.last_name}`)
  }

  // 4. Requestor — prefer a real Sappi user (e.g. Dev Admin), fall back
  //    to the super_admin flag, then to any user. Super-admins viewing
  //    the workflow still have full UI access regardless of who the
  //    requestor is (thanks to the super-admin bypass in the API + UI).
  const { data: allSappiUsers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('company_id', sappi.id)

  const nonFakeSappiUsers = (allSappiUsers ?? []).filter(
    (u) => !u.email?.includes('dev-sappi-alfeld.fake')
  )

  let requestor = nonFakeSappiUsers[0]
  if (!requestor) {
    const { data: admins } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_super_admin', true)
      .limit(1)
    requestor = admins?.[0]
  }
  if (!requestor) {
    console.error('No Sappi user and no super-admin found; cannot assign requestor.')
    process.exit(1)
  }
  console.log(`\nRequestor: ${requestor.full_name ?? requestor.email}`)

  // 5. Sheet — a realistic product
  const { data: existingSheet } = await supabase
    .from('sheets')
    .select('id')
    .eq('company_id', sappi.id)
    .eq('name', SHEET_NAME)
    .maybeSingle()
  let sheetId: string
  if (existingSheet) {
    sheetId = existingSheet.id
    console.log(`Sheet (reused): ${sheetId}`)
  } else {
    const { data: newSheet, error: sheetErr } = await supabase
      .from('sheets')
      .insert({
        name: SHEET_NAME,
        name_lower_case: SHEET_NAME.toLowerCase(),
        company_id: sappi.id,
        status: 'draft',
        new_status: 'draft',
        mark_as_test_sheet: true,
        created_by: requestor.id,
      })
      .select('id')
      .single()
    if (sheetErr || !newSheet) {
      console.error('Sheet create failed:', sheetErr)
      process.exit(1)
    }
    sheetId = newSheet.id
    console.log(`Sheet created: ${sheetId}`)
  }

  // 6. Workflow — create or reuse, then force into in_review with zones populated
  let { data: workflow } = await supabase
    .from('product_introduction_workflows')
    .select('id, status')
    .eq('sheet_id', sheetId)
    .eq('plant_id', plant.id)
    .in('status', ['draft', 'submitted', 'triage', 'in_review', 'returned'])
    .maybeSingle()

  if (!workflow) {
    const { data: newWorkflow, error: wfErr } = await supabase
      .from('product_introduction_workflows')
      .insert({
        company_id: sappi.id,
        plant_id: plant.id,
        sheet_id: sheetId,
        requestor_user_id: requestor.id,
        status: 'in_review',
        submitted_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        zone_a_data: ZONE_A_DATA,
        zone_b_data: ZONE_B_DATA,
      })
      .select('id, status')
      .single()
    if (wfErr || !newWorkflow) {
      console.error('Workflow create failed:', wfErr)
      process.exit(1)
    }
    workflow = newWorkflow
    console.log(`Workflow created: ${workflow.id}`)
  } else {
    await supabase
      .from('product_introduction_workflows')
      .update({
        status: 'in_review',
        zone_a_data: ZONE_A_DATA,
        zone_b_data: ZONE_B_DATA,
      })
      .eq('id', workflow.id)
    console.log(`Workflow (reused): ${workflow.id}`)
  }

  // 7. Steps — replace with a fresh pipeline matching DEFAULT_REVIEW_STEP_ORDER
  const DEFAULT_REVIEW_STEP_ORDER = [
    'procurement',
    'incident_officer',
    'water_protection',
    'pqm',
    'security_specialist',
    'head_procurement',
    'operator_brk',
    'fire_protection',
  ] as const

  const ROLE_OWNED_FIELDS: Record<string, string[]> = {
    procurement: ['mat_no_ek'],
    incident_officer: ['incident_ordinance_relevant'],
    water_protection: ['vaws_cadastre_no', 'wgk_class'],
    pqm: ['system_compatibility_checked', 'product_questionnaire_included'],
    security_specialist: ['hazardous_substance_substitute_tested', 'gefstoffv_hazardous'],
    head_procurement: [],
    operator_brk: [],
    fire_protection: [],
  }

  await supabase.from('workflow_steps').delete().eq('workflow_id', workflow.id)

  const now = new Date()
  const stepRows = DEFAULT_REVIEW_STEP_ORDER.map((role, index) => {
    // First two steps already signed (procurement, incident_officer).
    const signed = index < 2
    return {
      workflow_id: workflow!.id,
      step_order: index + 1,
      role,
      decision: signed ? 'approved' : 'pending',
      owned_fields: ROLE_OWNED_FIELDS[role] ?? [],
      signed_at: signed
        ? new Date(now.getTime() - (2 - index) * 86400000).toISOString()
        : null,
      signed_by_user_id: signed ? (userIdByRole.get(role) ?? null) : null,
    }
  })
  const { error: stepInsertErr } = await supabase.from('workflow_steps').insert(stepRows)
  if (stepInsertErr) {
    console.error('Step insert failed:', stepInsertErr)
    process.exit(1)
  }
  console.log(`Steps: 8 created (2 signed, 6 pending)`)

  // 8. A couple of realistic conditions
  await supabase.from('workflow_conditions').delete().eq('workflow_id', workflow.id)
  const procUserId = userIdByRole.get('procurement')
  const incidentUserId = userIdByRole.get('incident_officer')
  if (procUserId && incidentUserId) {
    await supabase.from('workflow_conditions').insert([
      {
        workflow_id: workflow.id,
        role: 'procurement',
        user_id: procUserId,
        category: 'other',
        body: 'Mat. no. assigned as EK-41287. Confirmed pricing with Kemira at €2.85/kg active. Minimum order 2 IBC.',
        created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      },
      {
        workflow_id: workflow.id,
        role: 'incident_officer',
        user_id: incidentUserId,
        category: 'fire',
        body: 'Not subject to Störfallverordnung (volumes below thresholds for any relevant substance in Annex I). No additional fire-protection conditions.',
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      },
    ])
    console.log('Conditions: 2 seeded (procurement + incident officer)')
  }

  console.log('\nDone.')
  console.log(`  List:   ${SITE_URL}/workflows`)
  console.log(`  Detail: ${SITE_URL}/workflows/${workflow.id}`)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
