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
      .select('id, content, question_type, section_name_sort, subsection_name_sort, section_sort_number, subsection_sort_number, order_number, required, optional_question, clarification, subsection_id')
      .in('id', questionIds.slice(i, i + 100))
    questions.push(...(data ?? []))
  }
  console.log(`HQ2.1 questions: ${questions.length}`)

  // Resolve section/subsection names via subsections -> sections, matching
  // the route's backfill (src/app/api/station/request/[id]/mapping/route.ts
  // ~lines 93-136): questions.section_name_sort / subsection_name_sort are
  // not populated in this dataset, so SECTION_CONTEXT in the mapper relies
  // on this backfill to have anything to match against.
  const subsectionIds = [...new Set(questions.map((q) => q.subsection_id).filter((v): v is string => !!v))]
  if (subsectionIds.length > 0) {
    const { data: subsections } = await sb
      .from('subsections')
      .select('id, name, section_id')
      .in('id', subsectionIds)

    const sectionIds = [...new Set((subsections ?? []).map((s) => s.section_id).filter((v): v is string => !!v))]
    const { data: sections } = sectionIds.length > 0
      ? await sb.from('sections').select('id, name').in('id', sectionIds)
      : { data: [] as { id: string; name: string }[] }

    const sectionNameById = new Map((sections ?? []).map((s) => [s.id, s.name]))
    const subsectionInfoById = new Map(
      (subsections ?? []).map((s) => [
        s.id,
        { subsectionName: s.name, sectionName: s.section_id ? sectionNameById.get(s.section_id) || null : null },
      ]),
    )

    for (const question of questions) {
      const info = question.subsection_id ? subsectionInfoById.get(question.subsection_id) : undefined
      if (info) {
        question.section_name_sort = question.section_name_sort || info.sectionName
        question.subsection_name_sort = question.subsection_name_sort || info.subsectionName
      }
    }
  }

  const { data: docs } = await sb
    .from('extraction_documents')
    .select('id, file_name, document_type, product_name, supplier_name')
    .like('file_name', 'calib_%')
    .eq('status', 'extracted')

  const report: Array<Record<string, unknown>> = []
  const reasonCounts: Record<string, number> = {}

  for (const doc of docs ?? []) {
    const { data: items } = await sb
      .from('extraction_items')
      .select('id, document_id, item_type, data, confidence')
      .eq('document_id', doc.id)
    const extractionItems = [...(items ?? [])]

    // Synthesize the product-identity pseudo-item the route builds from
    // document-level fields (route ~lines 163-178), since product_name /
    // supplier_name live on extraction_documents, not extraction_items.
    const productName = doc.product_name as string | null
    const manufacturer = doc.supplier_name as string | null
    if (productName || manufacturer) {
      extractionItems.push({
        id: `docmeta-${doc.id}`,
        document_id: doc.id,
        item_type: 'product_identity',
        data: { product_name: productName, manufacturer },
        confidence: 0.9,
      })
    }

    const result = mapParameters(questions as any, extractionItems as any, [])
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
