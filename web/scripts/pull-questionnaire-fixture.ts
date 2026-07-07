/**
 * Pulls the real customer questionnaire fixture from PROD storage (READ-ONLY).
 * Downloads the FakeAFAK HQ v2.1 questionnaire xlsx into calibration/questionnaire-fixture.xlsx.
 * Run from stacks/web:
 *   npx tsx scripts/pull-questionnaire-fixture.ts
 * Prod credentials are read from ../.env.production explicitly; nothing is written to prod.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const BUCKET_NAME = 'extraction-documents'
const FILE_NAME = '20230113 FakeAFAK BZ26 - P&P ViS HQ v2.1.xlsx'

function parseEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function main() {
  const prod = parseEnv(resolve('../.env.production'))
  const sb = createClient(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)

  const { data: rows, error } = await sb
    .from('extraction_documents')
    .select('id, file_path, file_name, status, created_at')
    .eq('file_name', FILE_NAME)
    .eq('status', 'extracted')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`query failed: ${error.message}`)
  if (!rows || rows.length === 0) {
    throw new Error(`No extraction_documents row found with file_name="${FILE_NAME}" and status="extracted"`)
  }

  const row = rows[0]
  console.log(`Found doc ${row.id}, file_path=${row.file_path}, created_at=${row.created_at}`)

  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET_NAME).download(row.file_path)
  if (dlErr || !blob) {
    throw new Error(`download failed: ${dlErr?.message}`)
  }

  const outDir = resolve('calibration')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'questionnaire-fixture.xlsx')
  writeFileSync(outPath, Buffer.from(await blob.arrayBuffer()))

  console.log(`Saved ${outPath} (${Math.round((await blob.arrayBuffer()).byteLength / 1024)}KB)`)
}

main()
