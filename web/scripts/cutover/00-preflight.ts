/**
 * Cutover step 0: READ-ONLY preflight against prod. No CUTOVER_CONFIRM guard
 * needed (unlike every other script in scripts/cutover/) because this script
 * performs selects, head counts, and a bucket list only -- it never writes.
 *
 * Checks the pre-cutover expectations documented in the SP2/SP3 cutover
 * checklists: pipeline tables present, workflow tables absent, notifications
 * columns absent, canonical reference tables present with rows, pipeline
 * storage buckets absent, legacy notifications row count, Sappi company id
 * resolvable, and a schema-drift summary on the core tables that predate the
 * rebuild (requests, sheets, answers, users, companies, choices, questions).
 *
 * Run from stacks/web:
 *   npx tsx --env-file=../.env.production scripts/cutover/00-preflight.ts
 *
 * Reads both stacks/.env.production (prod, SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY) and stacks/web/.env.local (dev,
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) directly by parsing
 * the files, same convention as scripts/schema-drift-report.ts, so the
 * dev-vs-prod drift comparison works regardless of which --env-file was
 * passed on the command line.
 *
 * Writes results to scripts/cutover/PREFLIGHT.md (with a timestamp) so the
 * evidence is committed and reviewable before anyone approves a cutover.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

console.log('==================================================')
console.log(' READ-ONLY PREFLIGHT CHECK -- NO WRITES PERFORMED')
console.log('==================================================\n')

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
const CORE_DRIFT_TABLES = ['requests', 'sheets', 'answers', 'users', 'companies', 'choices', 'questions']

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
  const { count, error } = await sb.from(table).select('*', { head: true, count: 'exact' })
  if (!error) return { exists: true, detail: `${count ?? 0} rows` }
  if (error.code === '42P01') return { exists: false, detail: 'relation does not exist' }
  return { exists: false, detail: `unexpected error: ${error.message}` }
}

async function columnExists(sb: SupabaseClient, table: string, column: string): Promise<{ exists: boolean; detail: string }> {
  const { error } = await sb.from(table).select(column).limit(1)
  if (!error) return { exists: true, detail: 'ok' }
  if (error.code === '42703') return { exists: false, detail: 'column does not exist' }
  return { exists: false, detail: `unexpected error: ${error.message}` }
}

async function fetchSpec(url: string, key: string) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json() as Promise<{ definitions: Record<string, { properties?: Record<string, unknown> }> }>
}

function add(verdict: Row['verdict'], label: string, detail: string) {
  rows.push({ verdict, label, detail })
  console.log(`[${verdict}] ${label}: ${detail}`)
}

async function main() {
  const dev = parseEnv(resolve('.env.local'))
  const prod = parseEnv(resolve('../.env.production'))

  if (!prod.SUPABASE_URL || !prod.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ../.env.production')
    process.exit(1)
  }

  console.log(`Target (prod): ${prod.SUPABASE_URL}\n`)
  const sb = createClient(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)

  console.log('--- Pipeline tables (expected PRESENT, pre-cutover) ---')
  for (const table of PIPELINE_TABLES) {
    const r = await tableExists(sb, table)
    add(r.exists ? 'PASS' : 'FAIL', `pipeline table present: ${table}`, r.detail)
  }

  console.log('\n--- Workflow tables (expected ABSENT, pre-cutover) ---')
  for (const table of WORKFLOW_TABLES) {
    const r = await tableExists(sb, table)
    add(!r.exists ? 'PASS' : 'FAIL', `workflow table absent: ${table}`, r.detail)
  }

  console.log('\n--- Notifications columns (expected ABSENT, pre-cutover) ---')
  for (const column of NOTIFICATION_COLUMNS) {
    const r = await columnExists(sb, 'notifications', column)
    add(!r.exists ? 'PASS' : 'FAIL', `notifications.${column} absent`, r.detail)
  }

  console.log('\n--- Canonical reference tables (expected PRESENT with rows) ---')
  for (const table of CANONICAL_TABLES) {
    const r = await tableExists(sb, table)
    const hasRows = r.exists && !/^0 rows/.test(r.detail)
    add(hasRows ? 'PASS' : 'FAIL', `canonical table present with rows: ${table}`, r.detail)
  }

  console.log('\n--- Pipeline storage buckets (expected ABSENT, pre-cutover) ---')
  const { data: buckets, error: bucketErr } = await sb.storage.listBuckets()
  if (bucketErr) {
    add('FAIL', 'bucket list', `error: ${bucketErr.message}`)
  } else {
    for (const bucket of BUCKETS) {
      const present = buckets?.some((b) => b.name === bucket) ?? false
      add(!present ? 'PASS' : 'FAIL', `bucket absent: ${bucket}`, present ? 'bucket exists' : 'not found')
    }
  }

  console.log('\n--- Legacy notifications row count (informational) ---')
  const { count: notifCount, error: notifErr } = await sb.from('notifications').select('*', { head: true, count: 'exact' })
  if (notifErr) {
    add('INFO', 'notifications row count', `error: ${notifErr.message}`)
  } else {
    add('INFO', 'notifications row count', `${notifCount ?? 0} rows`)
  }

  console.log('\n--- Sappi company id resolvable by name ---')
  const { data: companies, error: companyErr } = await sb.from('companies').select('id, name').ilike('name', '%sappi%')
  if (companyErr) {
    add('FAIL', 'Sappi company lookup', `error: ${companyErr.message}`)
  } else if (!companies || companies.length !== 1) {
    add('FAIL', 'Sappi company lookup', `expected exactly 1 match, found ${companies?.length ?? 0}: ${JSON.stringify(companies)}`)
  } else {
    const match = companies[0].id === EXPECTED_SAPPI_ID
    add(match ? 'PASS' : 'FAIL', 'Sappi company id matches known value', `found ${companies[0].id} (${companies[0].name}), expected ${EXPECTED_SAPPI_ID}`)
  }

  console.log('\n--- Schema drift: core tables (dev vs prod column parity) ---')
  if (!dev.NEXT_PUBLIC_SUPABASE_URL || !dev.SUPABASE_SERVICE_ROLE_KEY) {
    add('INFO', 'schema drift check', 'skipped: could not load stacks/web/.env.local for dev comparison')
  } else {
    try {
      const devSpec = await fetchSpec(dev.NEXT_PUBLIC_SUPABASE_URL, dev.SUPABASE_SERVICE_ROLE_KEY)
      const prodSpec = await fetchSpec(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)
      let drift = 0
      for (const t of CORE_DRIFT_TABLES) {
        const devCols = new Set(Object.keys(devSpec.definitions[t]?.properties ?? {}))
        const prodCols = new Set(Object.keys(prodSpec.definitions[t]?.properties ?? {}))
        if (devCols.size === 0 && prodCols.size === 0) {
          add('FAIL', `core table drift: ${t}`, 'table missing from both dev and prod PostgREST spec')
          drift++
          continue
        }
        const devOnly = [...devCols].filter((c) => !prodCols.has(c))
        const prodOnly = [...prodCols].filter((c) => !devCols.has(c))
        if (devOnly.length || prodOnly.length) {
          add('FAIL', `core table drift: ${t}`, `dev-only [${devOnly.join(', ')}] prod-only [${prodOnly.join(', ')}]`)
          drift++
        } else {
          add('PASS', `core table column parity: ${t}`, `${devCols.size} columns match`)
        }
      }
      add(drift === 0 ? 'PASS' : 'INFO', 'core table drift summary', `${drift} of ${CORE_DRIFT_TABLES.length} core tables show drift`)
    } catch (err) {
      add('INFO', 'schema drift check', `failed: ${String(err)}`)
    }
  }

  const passCount = rows.filter((r) => r.verdict === 'PASS').length
  const failCount = rows.filter((r) => r.verdict === 'FAIL').length
  const infoCount = rows.filter((r) => r.verdict === 'INFO').length

  console.log(`\n=== Preflight summary: ${passCount} PASS, ${failCount} FAIL, ${infoCount} INFO ===`)

  const timestamp = new Date().toISOString()
  const lines: string[] = []
  lines.push('# PREFLIGHT.md')
  lines.push('')
  lines.push(`Generated ${timestamp} by \`scripts/cutover/00-preflight.ts\` against prod (read-only).`)
  lines.push('')
  lines.push(`**Summary: ${passCount} PASS, ${failCount} FAIL, ${infoCount} INFO**`)
  lines.push('')
  lines.push('All checks reflect the PRE-cutover expected state. FAIL here before')
  lines.push('cutover execution means the prod database does not match what the')
  lines.push('runbook assumes -- stop and investigate before applying 01-schema.sql.')
  lines.push('')
  lines.push('| Verdict | Check | Detail |')
  lines.push('|---|---|---|')
  for (const r of rows) {
    lines.push(`| ${r.verdict} | ${r.label} | ${r.detail.replace(/\|/g, '\\|')} |`)
  }
  lines.push('')
  writeFileSync(resolve('scripts/cutover/PREFLIGHT.md'), lines.join('\n'))
  console.log('\nWrote scripts/cutover/PREFLIGHT.md')

  if (failCount > 0) {
    console.error(`\n${failCount} unexpected result(s). Review before proceeding with cutover.`)
    process.exit(1)
  }
}

main()
