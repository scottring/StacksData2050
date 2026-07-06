import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  reverseMatch,
  type ExtractedQuestion,
  type InternalAnswer,
  type ExtractionDataItem,
} from '@/lib/extraction/reverse-matcher'

/**
 * GET /api/station/ingest/[docId]/match
 *
 * Runs the reverse matcher for a questionnaire document:
 * 1. Gets extracted question_requirements from the document
 * 2. Gets the supplier's prior answers from all sheets
 * 3. Gets the supplier's extraction items from all uploaded docs
 * 4. Runs the reverse matcher to auto-fill
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company' }, { status: 400 })
  }

  const companyId = profile.company_id

  // 1. Get the extraction document
  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('id, document_type, status, company_id')
    .eq('id', docId)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.document_type !== 'questionnaire' && doc.document_type !== 'questionnaire_filled') {
    return NextResponse.json({ error: 'Document is not a questionnaire' }, { status: 400 })
  }

  if (doc.status !== 'extracted' && doc.status !== 'confirmed') {
    return NextResponse.json({ error: 'Document has not been extracted yet' }, { status: 400 })
  }

  // 2. Get extracted question_requirement items from this document
  const { data: questionItems } = await supabase
    .from('extraction_items')
    .select('id, item_type, data, confidence')
    .eq('document_id', docId)
    .eq('item_type', 'question_requirement')

  // Get metadata item
  const { data: metadataItems } = await supabase
    .from('extraction_items')
    .select('data')
    .eq('document_id', docId)
    .eq('item_type', 'questionnaire_metadata')
    .limit(1)

  const metadata = metadataItems?.[0]?.data as Record<string, unknown> | undefined

  const extractedQuestions: ExtractedQuestion[] = (questionItems || []).map((item) => {
    const d = item.data as Record<string, unknown>
    return {
      id: item.id,
      question_number: (d.question_number as string) || null,
      section_name: (d.section_name as string) || null,
      question_text: (d.question_text as string) || '(no text)',
      expected_type: (d.expected_type as string) || 'text',
      domain: (d.domain as string) || 'general',
      required: (d.required as boolean) || false,
      choices: (d.choices as string[]) || null,
      regulation_reference: (d.regulation_reference as string) || null,
      confidence: item.confidence || 0.8,
    }
  })

  if (extractedQuestions.length === 0) {
    return NextResponse.json({
      questions: [],
      summary: { total: 0, answered: 0, partial: 0, unmatched: 0, requiredUnmatched: 0, overallConfidence: 0 },
      metadata: { documentTitle: null, requestingOrganization: null, referencedRegulations: [] },
    })
  }

  // For filled questionnaires, answers are already in the extracted data — no reverse matching needed
  if (doc.document_type === 'questionnaire_filled') {
    const results: import('@/lib/extraction/reverse-matcher').MatchedExternalQuestion[] = []
    let answeredCount = 0
    let unmatchedCount = 0
    let requiredUnmatchedCount = 0

    for (const item of (questionItems || [])) {
      const d = item.data as Record<string, unknown>
      const answerValue = ((d.answer_value as string) || '').trim()
      const hasAnswer = answerValue.length > 0

      if (hasAnswer) answeredCount++
      else {
        unmatchedCount++
        if (d.required) requiredUnmatchedCount++
      }

      results.push({
        extractedQuestionId: item.id,
        questionNumber: (d.question_number as string) || null,
        sectionName: (d.section_name as string) || null,
        questionText: (d.question_text as string) || '(no text)',
        expectedType: (d.expected_type as string) || 'text',
        domain: (d.domain as string) || 'general',
        required: (d.required as boolean) || false,
        status: hasAnswer ? 'answered' : 'unmatched',
        matchedValue: hasAnswer ? answerValue : null,
        matchSource: hasAnswer ? 'document' : null,
        matchSourceDetail: hasAnswer ? 'Extracted from uploaded document' : null,
        confidence: hasAnswer ? (item.confidence || 0.9) : 0,
        matchReason: hasAnswer ? 'Answer found in completed questionnaire' : null,
        internalQuestionId: null,
        internalAnswerId: null,
        extractionItemId: item.id,
      })
    }

    const total = results.length
    return NextResponse.json({
      questions: results,
      summary: {
        total,
        answered: answeredCount,
        partial: 0,
        unmatched: unmatchedCount,
        requiredUnmatched: requiredUnmatchedCount,
        overallConfidence: total > 0 ? Math.round((answeredCount / total) * 100) / 100 : 0,
      },
      metadata: {
        documentTitle: metadata?.document_title as string | null || null,
        requestingOrganization: metadata?.requesting_organization as string | null || null,
        referencedRegulations: (metadata?.referenced_regulations as string[]) || [],
      },
    })
  }

  // 3. Get supplier's prior answers from all sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('company_id', companyId)

  const sheetIds = (sheets || []).map((s) => s.id)
  const sheetNameMap = new Map((sheets || []).map((s) => [s.id, s.name || 'Unnamed']))

  const priorAnswers: InternalAnswer[] = []
  if (sheetIds.length > 0) {
    const batchSize = 100
    for (let i = 0; i < sheetIds.length; i += batchSize) {
      const batch = sheetIds.slice(i, i + batchSize)
      const { data: answers } = await supabase
        .from('answers')
        .select('id, question_id, text_value, number_value, boolean_value, text_area_value, sheet_id, question:questions!answers_question_id_fkey(content, section_name_sort, subsection_name_sort)')
        .in('sheet_id', batch)
        .not('text_value', 'is', null) // Only answers with values

      if (answers) {
        for (const a of answers) {
          const q = a.question as unknown as Record<string, unknown> | null
          const value = a.text_value || (a.number_value !== null ? String(a.number_value) : null) ||
            (a.boolean_value !== null ? (a.boolean_value ? 'Yes' : 'No') : null) || a.text_area_value
          if (!value || !q) continue

          priorAnswers.push({
            answerId: a.id,
            questionId: a.question_id || '',
            questionContent: (q.content as string) || '',
            sectionName: (q.section_name_sort as string) || '',
            subsectionName: (q.subsection_name_sort as string) || '',
            value,
            sheetId: a.sheet_id || '',
            sheetName: sheetNameMap.get(a.sheet_id || '') || 'Unknown',
          })
        }
      }
    }
  }

  // 4. Get supplier's extraction items from all docs (non-questionnaire)
  const { data: supplierDocs } = await supabase
    .from('extraction_documents')
    .select('id, file_name, document_type')
    .eq('company_id', companyId)
    .neq('document_type', 'questionnaire')
    .in('status', ['extracted', 'confirmed'])

  const supplierDocIds = (supplierDocs || []).map((d) => d.id)
  const docFileNameMap = new Map((supplierDocs || []).map((d) => [d.id, d.file_name]))

  const extractionItems: ExtractionDataItem[] = []
  if (supplierDocIds.length > 0) {
    const batchSize = 100
    for (let i = 0; i < supplierDocIds.length; i += batchSize) {
      const batch = supplierDocIds.slice(i, i + batchSize)
      const { data: items } = await supabase
        .from('extraction_items')
        .select('id, document_id, item_type, data, confidence')
        .in('document_id', batch)
        .not('item_type', 'in', '("question_requirement","questionnaire_metadata")')

      if (items) {
        for (const item of items) {
          extractionItems.push({
            id: item.id,
            item_type: item.item_type,
            data: item.data as Record<string, unknown>,
            confidence: item.confidence || 0.8,
            documentFileName: docFileNameMap.get(item.document_id) || 'Unknown',
          })
        }
      }
    }
  }

  // 5. Run the reverse matcher
  const result = reverseMatch(
    extractedQuestions,
    priorAnswers,
    extractionItems,
    {
      documentTitle: metadata?.document_title as string | undefined,
      requestingOrganization: metadata?.requesting_organization as string | undefined,
      referencedRegulations: (metadata?.referenced_regulations as string[]) || [],
    },
  )

  return NextResponse.json(result)
}
