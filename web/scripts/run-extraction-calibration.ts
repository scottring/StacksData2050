/**
 * Runs the real extraction pipeline over the local calibration corpus against DEV.
 * For each corpus PDF: upload to the dev extraction-documents bucket, insert an
 * extraction_documents row, call processDocument() with an injected service client,
 * and record the outcome. Rerunnable: docs are keyed by calibration file name and
 * skipped if already extracted.
 * Run from stacks/web:
 *   npx tsx --env-file=.env.local scripts/run-extraction-calibration.ts [--limit N]
 *
 * Note on stopReason: process.ts persists `raw_extraction` as the parsed tool_use
 * input (the extracted data itself), not the Anthropic API response envelope, so
 * `stop_reason` is not available on that column. process.ts does not persist the
 * Claude response's stop_reason anywhere else either. This script therefore always
 * records stopReason: null. See report for the concern this raises for Task 3
 * (no way to detect truncated/max_tokens responses from stored data alone; the
 * only signal today is a console.warn in process.ts when stop_reason === 'max_tokens').
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { processDocument } from '../src/lib/extraction/process'

const SUPPLIER_COMPANY = 'f7e3432d-33d1-46ac-84dd-95647502cd32'
const SUPPLIER_USER = '18e1ef59-c137-4482-9465-529358e19f7d'
const BUCKET = 'extraction-documents'

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const manifest: Array<{ localFile: string; sizeBytes: number; guessedType: string }> = JSON.parse(
    readFileSync(resolve('calibration/corpus-manifest.json'), 'utf8')
  )

  const results: Array<Record<string, unknown>> = []

  for (const entry of manifest.slice(0, limit)) {
    const storagePath = `calibration/${entry.localFile}`
    const fileName = `calib_${entry.localFile}`

    const { data: existing } = await sb
      .from('extraction_documents')
      .select('id, status')
      .eq('file_name', fileName)
      .maybeSingle()

    let docId = existing?.id as string | undefined
    if (existing?.status === 'extracted') {
      console.log(`skip (already extracted) ${entry.localFile}`)
      const { count } = await sb.from('extraction_items').select('*', { head: true, count: 'exact' }).eq('document_id', existing.id)
      results.push({ file: entry.localFile, docId: existing.id, status: 'extracted', itemsCount: count ?? 0, cached: true })
      continue
    }

    if (!docId) {
      const bytes = readFileSync(join(resolve('calibration/corpus'), entry.localFile))
      const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      })
      if (upErr) {
        results.push({ file: entry.localFile, status: 'upload_failed', error: upErr.message })
        continue
      }
      const { data: doc, error: insErr } = await sb
        .from('extraction_documents')
        .insert({
          company_id: SUPPLIER_COMPANY,
          uploaded_by: SUPPLIER_USER,
          file_name: fileName,
          file_path: storagePath,
          file_size: entry.sizeBytes,
          mime_type: 'application/pdf',
          document_type: entry.guessedType,
          status: 'uploaded',
        })
        .select()
        .single()
      if (insErr || !doc) {
        results.push({ file: entry.localFile, status: 'insert_failed', error: insErr?.message })
        continue
      }
      docId = doc.id
    }

    console.log(`extracting ${entry.localFile} (${entry.guessedType})...`)
    const t0 = Date.now()
    try {
      const result = await processDocument(docId!, undefined, sb)
      const { data: docRow } = await sb
        .from('extraction_documents')
        .select('raw_extraction, extraction_error')
        .eq('id', docId!)
        .single()
      // raw_extraction stores the parsed tool_use input, not the API response envelope,
      // so stop_reason is never present here (see file header note).
      const stopReason = null
      results.push({
        file: entry.localFile,
        docId,
        status: result.status,
        itemsCount: result.itemsCount,
        stopReason,
        durationMs: result.durationMs,
        tokenCount: result.tokenCount,
        error: result.error ?? docRow?.extraction_error ?? null,
      })
      console.log(`  -> ${result.status}: ${result.itemsCount} items, ${result.tokenCount} tokens, ${result.durationMs}ms`)
    } catch (err) {
      results.push({ file: entry.localFile, docId, status: 'threw', durationMs: Date.now() - t0, error: String(err) })
      console.error(`  -> threw: ${err}`)
    }
  }

  writeFileSync(resolve('calibration/extraction-report.json'), JSON.stringify(results, null, 2))

  const total = results.length
  const ok = results.filter((r) => r.status === 'extracted').length
  const withItems = results.filter((r) => r.status === 'extracted' && (r.itemsCount as number) > 0).length
  console.log(`\n=== Extraction calibration summary ===`)
  console.log(`total: ${total}  extracted: ${ok} (${Math.round((100 * ok) / total)}%)  with items: ${withItems}`)
  const failures = results.filter((r) => r.status !== 'extracted')
  for (const f of failures) console.log(`FAIL ${f.file}: ${String(f.error).slice(0, 140)}`)
}

main()
