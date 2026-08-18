/**
 * One-off data fix (Aug 2026), reported by Kirsi Huuhilo (Banmark):
 *
 * 1. Question 5.1.14 (California Proposition 65) only had one choice.
 *    In Bubble, 4 of its 5 choices had `Parent Question` pointing at the
 *    CMR question, so the migration attached two of them to the CMR
 *    question and dropped the other two. Re-parent the two strays and
 *    insert the two missing ones, restoring the original Bubble order:
 *      1 Yes, details provided in table below.
 *      2 Yes, US-SDS or separate declaration is available on request.
 *      3 Not intentionally added and/or reasonably not expected to be present.
 *      4 Not evaluated
 *      5 No, not present above the limit
 *
 * 2. Question 5.1.18 ("Click here ... open PIDSL List") had no list table
 *    columns. Create the 4 columns the PIDSL List UI writes rows into.
 *
 * Idempotent. Run against dev and prod:
 *   npx tsx --env-file=.env.local scripts/fix-prop65-choices-and-pidsl-columns.ts
 *   npx tsx --env-file=.env.production scripts/fix-prop65-choices-and-pidsl-columns.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
const sb = createClient(url, key)

const PROP65_QUESTION_ID = '14cc42ef-cfd0-45f7-859b-b600d8d356fa'
const CMR_QUESTION_ID = 'de8c706a-04ec-45e9-8907-2f3ca0ac3a43'
const PIDSL_QUESTION_ID = '002d2564-f9fa-4c80-a734-ec0a5b9dba4b'

// Choices migrated under the CMR question that belong to Prop 65
const STRAY_CHOICES = [
  { id: '09c1d233-7fe6-4a37-b3b7-4c6abac9e3be', order_number: 1 }, // Yes, details provided in table below.
  { id: '6a16a200-b5a9-48b7-bf9b-976b729e2449', order_number: 3 }, // Not intentionally added and/or ...
]

// Choices that never made it out of Bubble. Fixed ids so dev and prod match.
const MISSING_CHOICES = [
  { id: '5f1c2a7e-6b3d-4c8e-9a1f-2d4b6e8c0a11', content: 'Not evaluated', order_number: 4, bubble_id: '1626383636667x990387144589574100' },
  { id: '5f1c2a7e-6b3d-4c8e-9a1f-2d4b6e8c0a12', content: 'No, not present above the limit', order_number: 5, bubble_id: '1626383636667x131391581079470080' },
]

// Columns for the PIDSL List question. Fixed ids so dev and prod match.
const PIDSL_COLUMNS = [
  { id: '7a2d9c40-1e5b-4f6a-8c3d-0b9e1f2a3c01', name: 'Chemical name', order_number: 1 },
  { id: '7a2d9c40-1e5b-4f6a-8c3d-0b9e1f2a3c02', name: 'CAS Number', order_number: 2 },
  { id: '7a2d9c40-1e5b-4f6a-8c3d-0b9e1f2a3c03', name: 'EC Number', order_number: 3 },
  { id: '7a2d9c40-1e5b-4f6a-8c3d-0b9e1f2a3c04', name: 'Comment', order_number: 4 },
]

async function main() {
  console.log('Target:', url)

  // Sanity: the three questions must exist with the expected response types
  const { data: qs, error: qErr } = await sb
    .from('questions')
    .select('id, response_type')
    .in('id', [PROP65_QUESTION_ID, CMR_QUESTION_ID, PIDSL_QUESTION_ID])
  if (qErr) throw qErr
  if ((qs?.length ?? 0) !== 3) throw new Error(`Expected 3 questions, found ${qs?.length}`)
  const pidslQ = qs!.find(q => q.id === PIDSL_QUESTION_ID)
  if (pidslQ?.response_type !== 'PIDSL List') throw new Error(`Unexpected response_type on PIDSL question: ${pidslQ?.response_type}`)

  // 1a. Re-parent stray choices
  for (const c of STRAY_CHOICES) {
    const { data: row } = await sb.from('choices').select('id, question_id, content').eq('id', c.id).single()
    if (!row) { console.log(`  stray choice ${c.id} not found, skipping`); continue }
    if (row.question_id === PROP65_QUESTION_ID) { console.log(`  already on Prop 65: ${row.content}`); continue }
    if (row.question_id !== CMR_QUESTION_ID) throw new Error(`Choice ${c.id} is on unexpected question ${row.question_id}`)
    const { error } = await sb.from('choices').update({ question_id: PROP65_QUESTION_ID, order_number: c.order_number }).eq('id', c.id)
    if (error) throw error
    console.log(`  re-parented to Prop 65: ${row.content}`)
  }

  // 1b. Insert missing choices
  for (const c of MISSING_CHOICES) {
    const { data: existing } = await sb.from('choices').select('id').eq('question_id', PROP65_QUESTION_ID).eq('content', c.content).maybeSingle()
    if (existing) { console.log(`  already present: ${c.content}`); continue }
    const { error } = await sb.from('choices').insert({ ...c, question_id: PROP65_QUESTION_ID })
    if (error) throw error
    console.log(`  inserted: ${c.content}`)
  }

  // 2. PIDSL list table columns
  for (const col of PIDSL_COLUMNS) {
    const { data: existing } = await sb.from('list_table_columns').select('id').eq('question_id', PIDSL_QUESTION_ID).eq('name', col.name).maybeSingle()
    if (existing) { console.log(`  column already present: ${col.name}`); continue }
    const { error } = await sb.from('list_table_columns').insert({ ...col, question_id: PIDSL_QUESTION_ID, response_type: 'text' })
    if (error) throw error
    console.log(`  inserted column: ${col.name}`)
  }

  // Verify
  const { data: prop } = await sb.from('choices').select('order_number, content').eq('question_id', PROP65_QUESTION_ID).order('order_number')
  console.log('Prop 65 choices now:', prop)
  const { data: cmr } = await sb.from('choices').select('order_number, content').eq('question_id', CMR_QUESTION_ID).order('order_number')
  console.log('CMR choices now:', cmr)
  const { data: cols } = await sb.from('list_table_columns').select('order_number, name').eq('question_id', PIDSL_QUESTION_ID).order('order_number')
  console.log('PIDSL columns now:', cols)
}

main().catch(e => { console.error(e); process.exit(1) })
