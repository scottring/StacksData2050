/**
 * Evaluates parameter mapping quality: for each extracted calibration document,
 * runs mapParameters() against the HQ2.1 question set and reports coverage.
 * Read-only against dev. Run from stacks/web:
 *   npx tsx --env-file=.env.local scripts/run-mapping-calibration.ts
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { mapParameters } from '../src/lib/extraction/parameter-mapper'

const HQ21_TAG = 'a3fbb37e-cace-4aae-85c1-a2571e539e81'

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: qts } = await sb.from('question_tags').select('question_id').eq('tag_id', HQ21_TAG)
  const questionIds = [...new Set((qts ?? []).map((q) => q.question_id))]
  const questions: any[] = []
  for (let i = 0; i < questionIds.length; i += 100) {
    const { data } = await sb
      .from('questions')
      .select('id, content, question_type, section_name_sort, subsection_name_sort, section_sort_number, subsection_sort_number, order_number, required, optional_question, clarification')
      .in('id', questionIds.slice(i, i + 100))
    questions.push(...(data ?? []))
  }
  console.log(`HQ2.1 questions: ${questions.length}`)

  const { data: docs } = await sb
    .from('extraction_documents')
    .select('id, file_name, document_type')
    .like('file_name', 'calib_%')
    .eq('status', 'extracted')

  const report: Array<Record<string, unknown>> = []
  const reasonCounts: Record<string, number> = {}

  for (const doc of docs ?? []) {
    const { data: items } = await sb
      .from('extraction_items')
      .select('id, document_id, item_type, data, confidence')
      .eq('document_id', doc.id)
    const result = mapParameters(questions as any, (items ?? []) as any, [])
    for (const p of result.parameters) {
      if (p.status === 'mapped' && p.matchReason) {
        reasonCounts[p.matchReason] = (reasonCounts[p.matchReason] ?? 0) + 1
      }
    }
    report.push({
      file: doc.file_name,
      documentType: doc.document_type,
      items: items?.length ?? 0,
      ...result.summary,
      mappedSamples: result.parameters
        .filter((p) => p.status === 'mapped')
        .slice(0, 10)
        .map((p) => ({ q: p.questionContent.slice(0, 60), v: String(p.extractedValue).slice(0, 40), conf: p.confidence, why: p.matchReason })),
    })
  }

  writeFileSync(resolve('calibration/mapping-report.json'), JSON.stringify({ report, reasonCounts }, null, 2))

  const avgMapped = report.reduce((s, r) => s + (r.mapped as number), 0) / Math.max(report.length, 1)
  console.log(`\n=== Mapping baseline ===`)
  console.log(`docs evaluated: ${report.length}`)
  console.log(`avg mapped per doc: ${avgMapped.toFixed(1)} of ${questions.length}`)
  console.log(`match reasons:`, reasonCounts)
}

main()
