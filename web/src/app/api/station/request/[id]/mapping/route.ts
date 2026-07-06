import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  mapParameters,
  type ExtractionItem,
  type Question,
  type ExistingAnswer,
} from '@/lib/extraction/parameter-mapper'

/**
 * GET /api/station/request/[id]/mapping
 *
 * Runs the parameter mapper for a given request:
 * 1. Gets questions filtered by sheet tags
 * 2. Gets extraction items from documents linked to the sheet
 * 3. Gets existing answers
 * 4. Returns the mapping result
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: requestId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // 1. Fetch the request and its sheet
  const { data: request } = await supabase
    .from('requests')
    .select('id, sheet_id, sheet:sheets(id, company_id, requesting_company_id)')
    .eq('id', requestId)
    .single()

  if (!request || !request.sheet) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const sheet = request.sheet as unknown as Record<string, unknown>
  const sheetId = sheet.id as string

  const hasAccess =
    !!userData?.company_id &&
    (sheet.company_id === userData.company_id || sheet.requesting_company_id === userData.company_id)

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Get tag IDs for this sheet
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = (sheetTags || []).map((st) => st.tag_id as string)

  if (tagIds.length === 0) {
    return NextResponse.json({
      parameters: [],
      summary: { total: 0, mapped: 0, existing: 0, gaps: 0, requiredGaps: 0, overallConfidence: 0 },
    })
  }

  // 3. Get question IDs for these tags (deduplicated)
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const uniqueQuestionIds = [...new Set((questionTags || []).map((qt) => qt.question_id as string))]

  if (uniqueQuestionIds.length === 0) {
    return NextResponse.json({
      parameters: [],
      summary: { total: 0, mapped: 0, existing: 0, gaps: 0, requiredGaps: 0, overallConfidence: 0 },
    })
  }

  // 4. Fetch the actual questions (batched if over 100)
  // Note: section_name_sort / subsection_name_sort on `questions` are unpopulated
  // in this dataset, so the real names are resolved below via subsection_id ->
  // subsections.name -> sections.name.
  const questions: (Question & { subsection_id: string | null })[] = []
  const batchSize = 100
  for (let i = 0; i < uniqueQuestionIds.length; i += batchSize) {
    const batch = uniqueQuestionIds.slice(i, i + batchSize)
    const { data } = await supabase
      .from('questions')
      .select('id, content, question_type, section_name_sort, subsection_name_sort, section_sort_number, subsection_sort_number, order_number, required, optional_question, clarification, subsection_id')
      .in('id', batch)

    if (data) {
      questions.push(...(data as (Question & { subsection_id: string | null })[]))
    }
  }

  // 4b. Resolve section/subsection names via subsections -> sections,
  // since questions.section_name_sort / subsection_name_sort are not populated.
  const subsectionIds = [...new Set(questions.map((q) => q.subsection_id).filter((v): v is string => !!v))]
  if (subsectionIds.length > 0) {
    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, section_id')
      .in('id', subsectionIds)

    const sectionIds = [...new Set((subsections || []).map((s) => s.section_id).filter((v): v is string => !!v))]
    const { data: sections } = sectionIds.length > 0
      ? await supabase.from('sections').select('id, name').in('id', sectionIds)
      : { data: [] as { id: string; name: string }[] }

    const sectionNameById = new Map((sections || []).map((s) => [s.id, s.name]))
    const subsectionInfoById = new Map(
      (subsections || []).map((s) => [
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

  // 5. Get extraction documents for this sheet
  const { data: extractionDocs } = await supabase
    .from('extraction_documents')
    .select('id, product_name, supplier_name')
    .eq('sheet_id', sheetId)
    .in('status', ['extracted', 'confirmed'])

  const docIds = (extractionDocs || []).map((d) => d.id as string)

  // 6. Get extraction items
  const extractionItems: ExtractionItem[] = []
  if (docIds.length > 0) {
    for (let i = 0; i < docIds.length; i += batchSize) {
      const batch = docIds.slice(i, i + batchSize)
      const { data } = await supabase
        .from('extraction_items')
        .select('id, document_id, item_type, data, confidence')
        .in('document_id', batch)

      if (data) {
        extractionItems.push(...(data as ExtractionItem[]))
      }
    }
  }

  // 6b. Synthesize a product-identity item per document from document-level
  // extraction fields (product_name / supplier_name are written directly onto
  // extraction_documents, not into extraction_items -- see process.ts).
  for (const doc of extractionDocs || []) {
    const productName = doc.product_name as string | null
    const manufacturer = doc.supplier_name as string | null
    if (productName || manufacturer) {
      extractionItems.push({
        id: `docmeta-${doc.id}`,
        document_id: doc.id as string,
        item_type: 'product_identity',
        data: { product_name: productName, manufacturer },
        confidence: 0.9,
      })
    }
  }

  // 7. Get existing answers for this sheet
  const { data: existingAnswers } = await supabase
    .from('answers')
    .select('id, question_id, text_value, number_value, boolean_value, text_area_value, choice_id, date_value, file_url')
    .eq('sheet_id', sheetId)

  // 7b. Resolve choice_id answers to their display content so the mapper
  // never has to fall back to its `[choice:<uuid>]` placeholder.
  const choiceIds = [...new Set((existingAnswers ?? []).map((a) => a.choice_id).filter(Boolean))] as string[]
  const choiceMap = new Map<string, string>()
  if (choiceIds.length > 0) {
    const { data: choiceRows } = await supabase.from('choices').select('id, content').in('id', choiceIds)
    for (const c of choiceRows ?? []) choiceMap.set(c.id, c.content)
  }
  const displayAnswers = (existingAnswers ?? []).map((a) =>
    a.choice_id ? { ...a, text_value: choiceMap.get(a.choice_id) ?? a.text_value } : a,
  )

  // 8. Run the mapper
  const result = mapParameters(
    questions,
    extractionItems,
    displayAnswers as ExistingAnswer[],
  )

  return NextResponse.json(result)
}
