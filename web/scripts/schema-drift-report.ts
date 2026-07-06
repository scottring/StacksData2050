/**
 * Compares table and column definitions between dev and prod Supabase
 * via their PostgREST OpenAPI specs. READ-ONLY on both.
 * Run from stacks/web:
 *   npx tsx scripts/schema-drift-report.ts
 * Env resolution: dev from .env.local (NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY), prod from ../.env.production
 * (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). Loaded explicitly below
 * so one process can read both files.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

function parseEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function fetchSpec(url: string, key: string) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json() as Promise<{ definitions: Record<string, { properties?: Record<string, unknown> }> }>
}

async function main() {
  const dev = parseEnv(resolve('.env.local'))
  const prod = parseEnv(resolve('../.env.production'))
  const devSpec = await fetchSpec(dev.NEXT_PUBLIC_SUPABASE_URL, dev.SUPABASE_SERVICE_ROLE_KEY)
  const prodSpec = await fetchSpec(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)

  const devTables = new Set(Object.keys(devSpec.definitions))
  const prodTables = new Set(Object.keys(prodSpec.definitions))
  let drift = 0

  for (const t of [...devTables].filter((t) => !prodTables.has(t)).sort()) {
    console.log(`dev-only table:  ${t}`)
    drift++
  }
  for (const t of [...prodTables].filter((t) => !devTables.has(t)).sort()) {
    console.log(`prod-only table: ${t}`)
    drift++
  }
  for (const t of [...devTables].filter((t) => prodTables.has(t)).sort()) {
    const devCols = new Set(Object.keys(devSpec.definitions[t].properties ?? {}))
    const prodCols = new Set(Object.keys(prodSpec.definitions[t].properties ?? {}))
    const devOnly = [...devCols].filter((c) => !prodCols.has(c))
    const prodOnly = [...prodCols].filter((c) => !devCols.has(c))
    if (devOnly.length || prodOnly.length) {
      console.log(`column drift in ${t}: dev-only [${devOnly.join(', ')}] prod-only [${prodOnly.join(', ')}]`)
      drift++
    }
  }

  console.log(drift === 0 ? '\nNo schema drift.' : `\n${drift} drift item(s). Expected during rebuild: v2 tables exist in dev only until cutover.`)
}

main()
