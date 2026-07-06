/**
 * Seed a fresh, unanswered HQ2.1 request for the Station E2E test.
 *
 * Builds:
 *   Dev Customer Co  --request-->  Dev Supplier Co
 *   Product: fictional "CalibTest WB-100 Barrier Coating"
 *   Questionnaire: HQ2.1, sheet status draft, ZERO answers.
 *
 * Idempotent: deletes any prior run's sheet (and its requests, tags,
 * extraction_documents/extraction_items) by product name first.
 * Run:  npx tsx --env-file=.env.local scripts/seed-station-e2e.ts
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- fixed dev IDs (same as seed-supplier-request-demo.ts) ---
const CUSTOMER = 'aada3dc9-5fb7-4443-9c53-322ceb990dfa' // Dev Customer Co
const SUPPLIER = 'f7e3432d-33d1-46ac-84dd-95647502cd32' // Dev Supplier Co
const HQ21 = 'a3fbb37e-cace-4aae-85c1-a2571e539e81' // HQ2.1 tag
const SUPPLIER_USER = '18e1ef59-c137-4482-9465-529358e19f7d' // supplier@devsupplier.test
const SCOTT = '1c19c889-1aef-4559-9fa0-57c2765e750d' // scott (customer side)
const PRODUCT = 'CalibTest WB-100 Barrier Coating'

async function main() {
  console.log('Seeding station E2E fixture (fresh HQ2.1 request, no answers)...\n')

  // 1. Clean up any prior run (by product name)
  const { data: priorSheets } = await db.from('sheets').select('id').eq('name', PRODUCT)
  for (const s of priorSheets || []) {
    const { data: pr } = await db.from('requests').select('id').eq('sheet_id', s.id)
    for (const r of pr || []) await db.from('request_tags').delete().eq('request_id', r.id)
    await db.from('requests').delete().eq('sheet_id', s.id)

    const { data: docs } = await db.from('extraction_documents').select('id').eq('sheet_id', s.id)
    for (const d of docs || []) await db.from('extraction_items').delete().eq('document_id', d.id)
    await db.from('extraction_documents').delete().eq('sheet_id', s.id)

    await db.from('answers').delete().eq('sheet_id', s.id)
    await db.from('sheet_tags').delete().eq('sheet_id', s.id)
    await db.from('sheets').delete().eq('id', s.id)
  }
  if (priorSheets?.length) console.log(`  cleaned ${priorSheets.length} prior fixture sheet(s)`)

  // 2. Create the sheet (owned by supplier, requested by customer, draft/unanswered)
  const { data: sheet, error: se } = await db
    .from('sheets')
    .insert({
      name: PRODUCT,
      company_id: SUPPLIER,
      requesting_company_id: CUSTOMER,
      status: 'draft',
      created_by: SUPPLIER_USER,
    })
    .select()
    .single()
  if (se) throw se
  console.log('  sheet:', sheet.id)

  // 3. sheet_tags + request + request_tags
  await db.from('sheet_tags').insert({ sheet_id: sheet.id, tag_id: HQ21 })
  const { data: request, error: re } = await db
    .from('requests')
    .insert({
      sheet_id: sheet.id,
      requestor_id: CUSTOMER,
      requesting_from_id: SUPPLIER,
      processed: false,
      created_by: SCOTT,
    })
    .select()
    .single()
  if (re) throw re
  await db.from('request_tags').insert({ request_id: request.id, tag_id: HQ21 })
  console.log('  request:', request.id)

  console.log(`\nDone.`)
  console.log(`  Product: ${PRODUCT}`)
  console.log(`  Sheet id: ${sheet.id}`)
  console.log(`  Request id: ${request.id}`)
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
