/**
 * Cutover step 5: verification AFTER the runbook has been executed against
 * prod. Read-only (selects, head counts, bucket list only) but guarded like
 * every writing script in this directory, because running it prematurely
 * (before 01-schema.sql / 02-buckets.../ 03-seed-plants have actually been
 * applied) would report a wall of expected FAILs and could be mistaken for
 * a real problem. The guard forces a deliberate "yes, cutover has run" step.
 *
 * Same checks as 00-preflight.ts, with the expectations inverted: workflow
 * tables PRESENT, notifications columns PRESENT, buckets PRESENT. Pipeline
 * tables and canonical reference tables keep the same PRESENT expectation
 * (unchanged by cutover). Prints an app-level smoke-test checklist at the
 * end -- this script only verifies the database and storage layer, not the
 * running application.
 *
 * Runs TWICE in the runbook: at Step 5 (expect only the core-table
 * reconciliation column section to FAIL, since 05 is deliberately held
 * until Step 5b) and again at Step 5b right after applying
 * 05-core-schema-reconciliation.sql (expect all PASS, then deploy
 * immediately; see README.md Step 5b for why).
 *
 * Run from stacks/web:
 *   CUTOVER_CONFIRM=yes npx tsx --env-file=../.env.production scripts/cutover/04-post-verify.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

if (process.env.CUTOVER_CONFIRM !== 'yes') {
  console.error('Refusing to run: set CUTOVER_CONFIRM=yes explicitly. This script writes to PRODUCTION.')
  process.exit(1)
}

console.log('====================================================')
console.log(' POST-CUTOVER VERIFICATION -- read-only, but gated')
console.log(' At Step 5 (after 01-schema.sql, 02-buckets,')
console.log(' 03-seed-plants): expect ONLY the core-table')
console.log(' reconciliation column section to FAIL.')
console.log(' At the Step 5b re-run (after')
console.log(' 05-core-schema-reconciliation.sql): expect ALL PASS.')
console.log('====================================================\n')

const EXPECTED_SAPPI_ID = '9567b9ac-1c12-457f-8e49-321519c267b3'

const PIPELINE_TABLES = [
  'extraction_documents',
  'extraction_items',
  'regulatory_frameworks',
  'regulatory_rules',
  'compliance_assessments',
  'compliance_results',
  'generated_documents',
]
const WORKFLOW_TABLES = [
  'plants',
  'plant_role_assignments',
  'product_introduction_workflows',
  'workflow_steps',
  'workflow_conditions',
]
const NOTIFICATION_COLUMNS = ['type', 'title', 'message', 'link', 'read']
const CANONICAL_TABLES = ['canonical_answer_types', 'canonical_reference_substances']
const BUCKETS = ['extraction-documents', 'generated-documents']
// Columns added by 05-core-schema-reconciliation.sql (expected PRESENT after
// it has been applied; see that file's header for the evidence trail).
const CORE_RECONCILIATION_COLUMNS: Record<string, string[]> = {
  answers: ['clarification', 'text_area_value', 'file_url', 'parent_question_id', 'originating_question_id'],
  questions: ['question_type', 'section_name_sort', 'subsection_name_sort', 'optional_question', 'clarification', 'list_table_id', 'parent_section_id', 'parent_subsection_id'],
  companies: ['location_text'],
  requests: ['product_name', 'comment_requestor'],
  users: ['first_name', 'last_name', 'phone_text'],
}

interface Row {
  verdict: 'PASS' | 'FAIL' | 'INFO'
  label: string
  detail: string
}

const rows: Row[] = []

function parseEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function tableExists(sb: SupabaseClient, table: string): Promise<{ exists: boolean; detail: string }> {
  // Must be a GET probe: a HEAD + count request against a MISSING table
  // comes back 204 with no error on this stack. PostgREST only surfaces the
  // missing-relation error (PGRST205 from the schema cache, or 42P01 from
  // Postgres) on a GET.
  const { count, error } = await sb.from(table).select('*', { count: 'exact' }).limit(1)
  if (!error) return { exists: true, detail: `${count ?? 0} rows` }
  if (error.code === 'PGRST205' || error.code === '42P01') return { exists: false, detail: 'relation does not exist' }
  return { exists: false, detail: `unexpected error (${error.code}): ${error.message}` }
}

async function columnExists(sb: SupabaseClient, table: string, column: string): Promise<{ exists: boolean; detail: string }> {
  const { error } = await sb.from(table).select(column).limit(1)
  if (!error) return { exists: true, detail: 'ok' }
  if (error.code === '42703') return { exists: false, detail: 'column does not exist' }
  return { exists: false, detail: `unexpected error: ${error.message}` }
}

function add(verdict: Row['verdict'], label: string, detail: string) {
  rows.push({ verdict, label, detail })
  console.log(`[${verdict}] ${label}: ${detail}`)
}

async function main() {
  const prod = parseEnv(resolve('../.env.production'))
  if (!prod.SUPABASE_URL || !prod.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ../.env.production')
    process.exit(1)
  }

  console.log(`Target (prod): ${prod.SUPABASE_URL}\n`)
  const sb = createClient(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)

  console.log('--- Pipeline tables (still expected PRESENT) ---')
  for (const table of PIPELINE_TABLES) {
    const r = await tableExists(sb, table)
    add(r.exists ? 'PASS' : 'FAIL', `pipeline table present: ${table}`, r.detail)
  }

  console.log('\n--- Workflow tables (expected PRESENT, post-cutover) ---')
  for (const table of WORKFLOW_TABLES) {
    const r = await tableExists(sb, table)
    add(r.exists ? 'PASS' : 'FAIL', `workflow table present: ${table}`, r.detail)
  }

  console.log('\n--- Notifications columns (expected PRESENT, post-cutover) ---')
  for (const column of NOTIFICATION_COLUMNS) {
    const r = await columnExists(sb, 'notifications', column)
    add(r.exists ? 'PASS' : 'FAIL', `notifications.${column} present`, r.detail)
  }

  console.log('\n--- Core-table reconciliation columns (expected PRESENT after 05-core-schema-reconciliation.sql) ---')
  for (const [table, cols] of Object.entries(CORE_RECONCILIATION_COLUMNS)) {
    for (const column of cols) {
      const r = await columnExists(sb, table, column)
      add(r.exists ? 'PASS' : 'FAIL', `${table}.${column} present`, r.detail)
    }
  }

  console.log('\n--- Canonical reference tables (still expected PRESENT with rows) ---')
  for (const table of CANONICAL_TABLES) {
    const r = await tableExists(sb, table)
    const hasRows = r.exists && !/^0 rows/.test(r.detail)
    add(hasRows ? 'PASS' : 'FAIL', `canonical table present with rows: ${table}`, r.detail)
  }

  console.log('\n--- Pipeline storage buckets (expected PRESENT, post-cutover) ---')
  const { data: buckets, error: bucketErr } = await sb.storage.listBuckets()
  if (bucketErr) {
    add('FAIL', 'bucket list', `error: ${bucketErr.message}`)
  } else {
    for (const bucket of BUCKETS) {
      const present = buckets?.some((b) => b.name === bucket) ?? false
      add(present ? 'PASS' : 'FAIL', `bucket present: ${bucket}`, present ? 'found' : 'not found')
    }
  }

  console.log('\n--- Legacy notifications rows are all read=true (backfill check) ---')
  const { count: unreadLegacy, error: unreadErr } = await sb
    .from('notifications')
    .select('*', { head: true, count: 'exact' })
    .is('title', null)
    .neq('read', true)
  if (unreadErr) {
    add('INFO', 'legacy notifications backfill', `error: ${unreadErr.message}`)
  } else {
    add((unreadLegacy ?? 0) === 0 ? 'PASS' : 'FAIL', 'legacy notifications backfilled to read=true', `${unreadLegacy ?? 0} rows still title=NULL and unread`)
  }

  console.log('\n--- Sappi plant seeded ---')
  const { data: companies } = await sb.from('companies').select('id, name').eq('id', EXPECTED_SAPPI_ID)
  if (!companies || companies.length !== 1) {
    add('FAIL', 'Sappi company lookup', `expected id ${EXPECTED_SAPPI_ID} not found`)
  } else {
    const { data: plant, error: plantErr } = await sb
      .from('plants')
      .select('id, code, name')
      .eq('company_id', EXPECTED_SAPPI_ID)
      .eq('code', 'alfeld')
      .maybeSingle()
    if (plantErr) {
      add('FAIL', 'Sappi Alfeld plant seeded', `error: ${plantErr.message}`)
    } else {
      add(plant ? 'PASS' : 'FAIL', 'Sappi Alfeld plant seeded', plant ? `${plant.id} (${plant.name})` : 'not found')
    }
  }

  const passCount = rows.filter((r) => r.verdict === 'PASS').length
  const failCount = rows.filter((r) => r.verdict === 'FAIL').length
  const infoCount = rows.filter((r) => r.verdict === 'INFO').length
  console.log(`\n=== Post-verify summary: ${passCount} PASS, ${failCount} FAIL, ${infoCount} INFO ===`)

  console.log('\n=== App-level smoke checklist (manual, not scripted here) ===')
  console.log('[ ] Login at https://beta.stacksdata.com with a real account succeeds')
  console.log('[ ] / redirects to the correct surface (customer -> /command, supplier -> /station)')
  console.log('[ ] /command renders: request table, totals, globe panel, notification bell')
  console.log('[ ] /station renders: pending request list, user menu, logout')
  console.log('[ ] Upload one small PDF end to end: SSE stepper completes, extraction_documents reaches extracted')
  console.log('[ ] A status change (approve/flag/reject) produces a real in-app notification')
  console.log('[ ] Excel export from a sheet still works and contains expected answers')
  console.log('[ ] Classic view (/dashboard) is still reachable from both surfaces')

  if (failCount > 0) {
    console.error(`\n${failCount} check(s) FAILED. Cutover is not complete or something regressed.`)
    process.exit(1)
  }
  console.log('\nAll automated post-cutover checks passed. Complete the manual smoke checklist above.')
}

main()
