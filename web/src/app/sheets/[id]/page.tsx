import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Shield, FileUp, ArrowLeftRight, FileText, AlertTriangle } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { TrackSheetView } from '@/components/trial/track-page-view'

interface ViewAnswer {
  id: string
  question_id: string
  question_name: string
  question_content: string | null
  response_type: string
  section_sort_number: number | null
  subsection_sort_number: number | null
  question_order: number | null
  order_number: number | null
  text_value: string | null
  text_area_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  date_value: string | null
  choice_id: string | null
  choice_content: string | null
  list_table_row_id: string | null
  list_table_column_id: string | null
  list_table_column_name: string | null
  list_table_column_order: number | null
}

interface CanonicalParam {
  id: string
  code: string
  name: string
  section: string | null
  subsection: string | null
  sort_order: number | null
  answer_type_code: string | null
  detail_table_schema: any | null
}

// Companies with canonical parameter links (UPM, Sappi)
const CANONICAL_COMPANY_IDS = [
  '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1', // UPM
  '9567b9ac-1c12-457f-8e49-321519c267b3', // Sappi
]

export default async function SheetViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id: sheetId } = await params
  const sp = await searchParams
  const viewMode = sp?.view as string | undefined
  const supabase = await createClient()

  // Fetch sheet info (include requesting_company_id for canonical detection)
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, requesting_company_id, companies!sheets_company_id_fkey(name)')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    return (
      <AppLayout title="Sheet Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sheet not found</p>
          <Link href="/sheets" className="text-blue-600 hover:underline mt-4 block">
            Back to sheets
          </Link>
        </div>
      </AppLayout>
    )
  }

  // Detect canonical eligibility
  const isCanonicalCompany = CANONICAL_COMPANY_IDS.includes(sheet.requesting_company_id || '')
  const wantCanonical = isCanonicalCompany && viewMode !== 'legacy'

  // Fetch all answers from the view (both paths need this)
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)

  // ============================
  // CANONICAL DATA PATH
  // ============================
  type CanonicalSection = Map<string, Array<{ param: CanonicalParam; answers: ViewAnswer[] }>>
  let canonicalSections: Map<string, CanonicalSection> | null = null
  let orphanedAnswers: ViewAnswer[] = []
  let answerDocs = new Map<string, Array<{ id: string; filename: string; file_url: string }>>()
  let canonicalStats = { params: 0, linked: 0, orphaned: 0, withDocs: 0 }

  if (wantCanonical && answers && answers.length > 0) {
    const answerIds = answers.map((a: any) => a.id).filter(Boolean) as string[]

    // Fetch canonical_answer_links for this sheet's answers (batched)
    const allLinks: Array<{ answer_id: string; canonical_parameter_id: string }> = []
    for (let i = 0; i < answerIds.length; i += 50) {
      const batch = answerIds.slice(i, i + 50)
      const { data } = await supabase
        .from('canonical_answer_links')
        .select('answer_id, canonical_parameter_id')
        .in('answer_id', batch)
      if (data) allLinks.push(...data)
    }

    if (allLinks.length > 0) {
      // Fetch all canonical parameters (80 rows)
      const { data: params } = await supabase
        .from('canonical_parameters')
        .select('id, code, name, section, subsection, sort_order, answer_type_code, detail_table_schema')
        .order('sort_order')

      // Build mappings
      const answerToParam = new Map(allLinks.map(l => [l.answer_id, l.canonical_parameter_id]))
      const paramAnswers = new Map<string, ViewAnswer[]>()
      const linkedIds = new Set<string>()

      answers.forEach((a: any) => {
        const paramId = answerToParam.get(a.id)
        if (paramId) {
          linkedIds.add(a.id)
          if (!paramAnswers.has(paramId)) paramAnswers.set(paramId, [])
          paramAnswers.get(paramId)!.push(a as ViewAnswer)
        }
      })

      orphanedAnswers = answers.filter((a: any) => !linkedIds.has(a.id)) as ViewAnswer[]

      // Fetch answer_documents for linked answers
      const linkedArr = Array.from(linkedIds)
      for (let i = 0; i < linkedArr.length; i += 50) {
        const batch = linkedArr.slice(i, i + 50)
        const { data: docs } = await supabase
          .from('answer_documents')
          .select('id, answer_id, filename, file_url')
          .in('answer_id', batch)
        docs?.forEach((d: any) => {
          if (!answerDocs.has(d.answer_id)) answerDocs.set(d.answer_id, [])
          answerDocs.get(d.answer_id)!.push(d)
        })
      }

      // Group by section → subsection (insertion order = sort order from query)
      canonicalSections = new Map()
      params?.forEach(p => {
        const sec = p.section || 'Other'
        const sub = p.subsection || 'General'
        if (!canonicalSections!.has(sec)) canonicalSections!.set(sec, new Map())
        if (!canonicalSections!.get(sec)!.has(sub)) canonicalSections!.get(sec)!.set(sub, [])
        canonicalSections!.get(sec)!.get(sub)!.push({
          param: p as CanonicalParam,
          answers: paramAnswers.get(p.id) || []
        })
      })

      canonicalStats = {
        params: params?.length || 0,
        linked: linkedIds.size,
        orphaned: orphanedAnswers.length,
        withDocs: answerDocs.size
      }
    }
  }

  const renderCanonical = wantCanonical && canonicalSections !== null

  // ============================
  // LEGACY DATA PATH
  // ============================
  let sortedSections: Array<[number, Map<number, Array<[string, any]>>]> = []
  let sortedQuestions: Array<[string, any]> = []
  let sectionNames = new Map<number, string>()
  let subsectionNames = new Map<string, string>()
  let tagIds: string[] = []

  if (!renderCanonical) {
    // Fetch the sheet's tags
    const { data: sheetTags } = await supabase
      .from('sheet_tags')
      .select('tag_id')
      .eq('sheet_id', sheetId)

    tagIds = sheetTags?.map(st => st.tag_id) || []

    let taggedQuestionIds: string[] = []
    if (tagIds.length > 0) {
      const { data: questionTags } = await supabase
        .from('question_tags')
        .select('question_id')
        .in('tag_id', tagIds)
      taggedQuestionIds = [...new Set(questionTags?.map(qt => qt.question_id) || [])]
    }

    // Fetch questions with their section/subsection info
    const questionsWithSections: any[] = []
    if (taggedQuestionIds.length > 0) {
      const batchSize = 50
      for (let i = 0; i < taggedQuestionIds.length; i += batchSize) {
        const batch = taggedQuestionIds.slice(i, i + batchSize)
        const { data } = await supabase
          .from('questions')
          .select(`
            id,
            name,
            content,
            response_type,
            order_number,
            subsections(
              id,
              name,
              order_number,
              sections(
                id,
                name,
                order_number
              )
            )
          `)
          .in('id', batch)
        if (data) questionsWithSections.push(...data)
      }
    }

    // Build lookup maps
    const questionSectionMap: Record<string, { sectionName: string; subsectionName: string; sectionOrder: number; subsectionOrder: number }> = {}
    questionsWithSections.forEach((q: any) => {
      const subsection = q.subsections
      const section = subsection?.sections
      if (subsection && section) {
        questionSectionMap[q.id] = {
          sectionName: section.name || '',
          subsectionName: subsection.name || '',
          sectionOrder: section.order_number ?? 999,
          subsectionOrder: subsection.order_number ?? 999
        }
      }
    })

    // Create placeholder answers for questions without answers
    const existingQuestionIds = new Set(answers?.map(a => a.question_id) || [])
    const placeholderAnswers = questionsWithSections
      .filter((q: any) => !existingQuestionIds.has(q.id))
      .map((q: any) => {
        const info = questionSectionMap[q.id]
        return {
          id: `placeholder-${q.id}`,
          question_id: q.id,
          question_name: q.name || '',
          question_content: q.content,
          response_type: q.response_type || 'text',
          section_sort_number: info?.sectionOrder ?? 999,
          subsection_sort_number: info?.subsectionOrder ?? 999,
          question_order: q.order_number ?? 999,
          order_number: q.order_number ?? 999,
          text_value: null,
          text_area_value: null,
          number_value: null,
          boolean_value: null,
          date_value: null,
          choice_id: null,
          choice_content: null,
          list_table_row_id: null,
          list_table_column_id: null,
          list_table_column_name: null,
          list_table_column_order: null,
        }
      })

    // Combine and filter to only tagged questions
    const taggedQuestionSet = new Set(taggedQuestionIds)
    const allAnswers = [...(answers || []), ...placeholderAnswers]
      .filter(a => taggedQuestionSet.has(a.question_id))
      .sort((a, b) => {
        const aSection = a.section_sort_number ?? 999
        const bSection = b.section_sort_number ?? 999
        if (aSection !== bSection) return aSection - bSection
        const aSubsection = a.subsection_sort_number ?? 999
        const bSubsection = b.subsection_sort_number ?? 999
        if (aSubsection !== bSubsection) return aSubsection - bSubsection
        return 0
      })

    // Group answers by question
    const questionMap = new Map<string, {
      question_name: string
      question_content: string | null
      response_type: string
      section_sort_number: number | null
      subsection_sort_number: number | null
      question_order: number | null
      answers: ViewAnswer[]
    }>()

    allAnswers.forEach((answer: any) => {
      if (!questionMap.has(answer.question_id)) {
        questionMap.set(answer.question_id, {
          question_name: answer.question_name,
          question_content: answer.question_content,
          response_type: answer.response_type,
          section_sort_number: answer.section_sort_number,
          subsection_sort_number: answer.subsection_sort_number,
          question_order: answer.question_order ?? answer.order_number,
          answers: []
        })
      }
      questionMap.get(answer.question_id)!.answers.push(answer as ViewAnswer)
    })

    sortedQuestions = Array.from(questionMap.entries()).sort((a, b) => {
      const qa = a[1], qb = b[1]
      if ((qa.section_sort_number || 0) !== (qb.section_sort_number || 0)) {
        return (qa.section_sort_number || 0) - (qb.section_sort_number || 0)
      }
      if ((qa.subsection_sort_number || 0) !== (qb.subsection_sort_number || 0)) {
        return (qa.subsection_sort_number || 0) - (qb.subsection_sort_number || 0)
      }
      return (qa.question_order || 0) - (qb.question_order || 0)
    })

    // Build section name lookups
    sectionNames = new Map<number, string>()
    subsectionNames = new Map<string, string>()
    sortedQuestions.forEach(([questionId, q]) => {
      const sectionNum = q.section_sort_number ?? 0
      const subsectionNum = q.subsection_sort_number ?? 0
      const info = questionSectionMap[questionId]
      if (info?.sectionName && !sectionNames.has(sectionNum)) {
        sectionNames.set(sectionNum, info.sectionName)
      }
      const key = `${sectionNum}-${subsectionNum}`
      if (info?.subsectionName && !subsectionNames.has(key)) {
        subsectionNames.set(key, info.subsectionName)
      }
    })

    // Group questions by section then subsection
    const sectionsMap = new Map<number, Map<number, Array<[string, typeof sortedQuestions[0][1]]>>>()
    sortedQuestions.forEach(([questionId, q]) => {
      const sectionNum = q.section_sort_number ?? 0
      const subsectionNum = q.subsection_sort_number ?? 0
      if (!sectionsMap.has(sectionNum)) sectionsMap.set(sectionNum, new Map())
      const sectionMap = sectionsMap.get(sectionNum)!
      if (!sectionMap.has(subsectionNum)) sectionMap.set(subsectionNum, [])
      sectionMap.get(subsectionNum)!.push([questionId, q])
    })

    sortedSections = Array.from(sectionsMap.entries()).sort((a, b) => a[0] - b[0])
  }

  // ============================
  // SHARED HELPERS
  // ============================
  function formatAnswer(answer: ViewAnswer): string {
    if (answer.choice_content) return answer.choice_content
    if (answer.text_value) return answer.text_value
    if (answer.text_area_value) return answer.text_area_value
    if (answer.number_value !== null) return String(answer.number_value)
    if (answer.boolean_value !== null) return answer.boolean_value ? 'Yes' : 'No'
    if (answer.date_value) return answer.date_value
    return ''
  }

  function renderListTable(tableAnswers: ViewAnswer[]) {
    const rows = new Map<string, Map<string, string>>()
    const columns = new Map<string, { name: string; order: number }>()

    tableAnswers.forEach(a => {
      if (!a.list_table_row_id || !a.list_table_column_id) return
      if (!rows.has(a.list_table_row_id)) {
        rows.set(a.list_table_row_id, new Map())
      }
      rows.get(a.list_table_row_id)!.set(a.list_table_column_id, formatAnswer(a))
      if (!columns.has(a.list_table_column_id)) {
        columns.set(a.list_table_column_id, {
          name: a.list_table_column_name || 'Column',
          order: a.list_table_column_order || 0
        })
      }
    })

    const sortedColumns = Array.from(columns.entries()).sort((a, b) => a[1].order - b[1].order)
    if (rows.size === 0) return <p className="text-muted-foreground italic">No data</p>

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
              {sortedColumns.map(([colId, col]) => (
                <th key={colId} className="border px-3 py-2 text-left font-medium">{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(rows.entries()).map(([rowId, rowData]) => (
              <tr key={rowId} className="hover:bg-muted/50">
                {sortedColumns.map(([colId]) => (
                  <td key={colId} className="border px-3 py-2">{rowData.get(colId) || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ============================
  // CUSTOM QUESTIONS (shared)
  // ============================
  const companyName = (sheet as any).companies?.name || 'Unknown'

  const { data: request } = await supabase
    .from('requests')
    .select('id, requestor_id')
    .eq('sheet_id', sheetId)
    .single()

  let customQuestions: Array<{
    id: string
    question_text: string
    response_type: string
    choices: string[] | null
    hint: string | null
    required: boolean
    sort_order: number
  }> = []
  let customAnswers: Array<{
    id: string
    company_question_id: string
    value: string | null
  }> = []
  let requestingCompanyName = ''

  if (request) {
    const { data: requestCustomQuestions } = await supabase
      .from('request_custom_questions')
      .select(`
        id,
        sort_order,
        company_question_id,
        company_questions (
          id,
          company_id,
          question_text,
          response_type,
          choices,
          hint,
          required
        )
      `)
      .eq('request_id', request.id)
      .order('sort_order')

    if (requestCustomQuestions) {
      customQuestions = requestCustomQuestions
        .filter(rcq => rcq.company_questions)
        .map(rcq => ({
          id: (rcq.company_questions as any).id,
          question_text: (rcq.company_questions as any).question_text,
          response_type: (rcq.company_questions as any).response_type,
          choices: (rcq.company_questions as any).choices,
          hint: (rcq.company_questions as any).hint,
          required: (rcq.company_questions as any).required,
          sort_order: rcq.sort_order
        }))
    }

    const { data: existingCustomAnswers } = await supabase
      .from('custom_question_answers')
      .select('id, company_question_id, value')
      .eq('sheet_id', sheetId)

    customAnswers = existingCustomAnswers || []

    if (request.requestor_id) {
      const { data: requestingCompany } = await supabase
        .from('companies')
        .select('name')
        .eq('id', request.requestor_id)
        .single()
      requestingCompanyName = requestingCompany?.name || ''
    }
  }

  const customAnswerMap = new Map(customAnswers.map(ca => [ca.company_question_id, ca.value]))

  // ============================
  // RENDER
  // ============================
  return (
    <AppLayout title={sheet.name}>
      <TrackSheetView sheetId={sheetId} sheetName={sheet.name} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/sheets" />
          <div>
            <h1 className="text-2xl font-bold">{sheet.name}</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isCanonicalCompany && (
              <Link href={`/sheets/${sheetId}${renderCanonical ? '?view=legacy' : ''}`}>
                <Button size="sm" variant="outline">
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  {renderCanonical ? 'Legacy View' : 'Canonical View'}
                </Button>
              </Link>
            )}
            {renderCanonical && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                Canonical
              </Badge>
            )}
            <Badge variant="outline">{sheet.status || 'draft'}</Badge>
            <Link href="/pipeline/extract">
              <Button size="sm" variant="outline">
                <FileUp className="h-4 w-4 mr-2" />
                Upload SDS
              </Button>
            </Link>
            <Link href="/pipeline/compliance">
              <Button size="sm" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Run Assessment
              </Button>
            </Link>
            <Link href={`/sheets/${sheetId}/edit`}>
              <Button size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Sheet
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {renderCanonical ? (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{canonicalStats.params} canonical parameters</span>
            <span>• {canonicalStats.linked} answers linked</span>
            {canonicalStats.orphaned > 0 && <span>• {canonicalStats.orphaned} unmapped</span>}
            {canonicalStats.withDocs > 0 && <span>• {canonicalStats.withDocs} with documents</span>}
          </div>
        ) : (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{sortedQuestions.length} questions</span>
            {tagIds.length > 0 && <span>• {tagIds.length} tag(s) selected</span>}
          </div>
        )}

        {/* ================================ */}
        {/* CANONICAL VIEW                   */}
        {/* ================================ */}
        {renderCanonical && canonicalSections && (
          <div className="space-y-6">
            {/* Canonical banner */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <Shield className="h-4 w-4" />
                <span className="font-semibold text-sm">HQ 2.1 Canonical Parameters</span>
                <span className="text-emerald-600 text-sm ml-2">
                  {canonicalStats.params} parameters • {canonicalStats.linked} answers mapped
                  {canonicalStats.orphaned > 0 && ` • ${canonicalStats.orphaned} unmapped`}
                </span>
              </div>
            </div>

            {Array.from(canonicalSections.entries()).map(([sectionName, subsectionsMap]) => {
              // Extract section number from first parameter code (e.g., "2.1.3" → "2")
              const firstItem = Array.from(subsectionsMap.values())[0]?.[0]
              const sectionNum = firstItem?.param.code?.split('.')[0] || ''

              return (
              <div key={sectionName} className="space-y-4">
                {/* Section Header */}
                <div className="sticky top-0 bg-background z-10 py-3 border-b-2 border-emerald-500">
                  <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                    {sectionNum && (
                      <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded text-sm font-bold">{sectionNum}</span>
                    )}
                    {sectionName}
                  </h2>
                </div>

                {/* Subsections */}
                {Array.from(subsectionsMap.entries()).map(([subsectionName, items]) => {
                  // Extract subsection number from first param code (e.g., "2.1.3" → "2.1")
                  const subCode = items[0]?.param.code?.split('.').slice(0, 2).join('.') || ''

                  return (
                  <div key={subsectionName} className="space-y-3">
                    <h3 className="text-md font-medium border-l-4 border-emerald-500 pl-3 py-1.5 bg-emerald-50 rounded-r text-emerald-900">
                      <span className="font-bold">{subCode}</span>{" "}
                      {subsectionName}
                    </h3>

                    <div className="space-y-4 pl-2">
                      {items.map(({ param, answers: paramAnswers }) => {
                        const hasListTable = paramAnswers.some(a => a.list_table_row_id)
                        const singleAnswer = paramAnswers[0]
                        const docs = paramAnswers.flatMap(a => answerDocs.get(a.id) || [])

                        return (
                          <Card key={param.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-medium flex items-start gap-2">
                                <Badge variant="secondary" className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {param.code}
                                </Badge>
                                <span>{param.name}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {paramAnswers.length === 0 ? (
                                <div className="bg-muted/50 rounded px-3 py-2">
                                  <span className="text-muted-foreground italic">No answer</span>
                                </div>
                              ) : hasListTable ? (
                                renderListTable(paramAnswers)
                              ) : (
                                <div className="bg-muted/50 rounded px-3 py-2">
                                  {formatAnswer(singleAnswer) || <span className="text-muted-foreground italic">No answer</span>}
                                </div>
                              )}
                              {docs.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {docs.map(doc => (
                                    <a
                                      key={doc.id}
                                      href={doc.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 rounded px-2 py-1"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {doc.filename}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                  )
                })}
              </div>
              )
            })}

            {/* Orphaned answers */}
            {orphanedAnswers.length > 0 && (
              <div className="space-y-4 mt-8">
                <div className="sticky top-0 bg-background z-10 py-3 border-b border-amber-300/50">
                  <h2 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Unmapped Answers ({orphanedAnswers.length})
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Answers without a canonical parameter mapping
                  </p>
                </div>
                <div className="space-y-2 pl-2">
                  {orphanedAnswers.slice(0, 20).map(a => (
                    <div key={a.id} className="text-sm bg-amber-50 rounded px-3 py-2 flex items-center gap-2">
                      <span className="font-medium text-amber-800">{a.question_name}</span>
                      <span className="text-muted-foreground ml-auto truncate max-w-xs">
                        {formatAnswer(a) || <em>empty</em>}
                      </span>
                    </div>
                  ))}
                  {orphanedAnswers.length > 20 && (
                    <p className="text-sm text-muted-foreground italic pl-3">
                      ...and {orphanedAnswers.length - 20} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================ */}
        {/* LEGACY VIEW                      */}
        {/* ================================ */}
        {!renderCanonical && (
          <div className="space-y-6">
            {sortedSections.map(([sectionNum, subsections]) => (
              <div key={sectionNum} className="space-y-4">
                {/* Section Header */}
                <div className="sticky top-0 bg-background z-10 py-3 border-b border-primary/20">
                  <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                    {sectionNum > 0 && <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">{sectionNum}</span>}
                    {sectionNames.get(sectionNum) || `Section ${sectionNum}`}
                  </h2>
                </div>

                {/* Subsections */}
                {Array.from(subsections.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([subsectionNum, questions]) => (
                    <div key={subsectionNum} className="space-y-3">
                      {/* Subsection Header */}
                      {subsectionNum > 0 && (
                        <h3 className="text-md font-medium text-muted-foreground border-l-4 border-primary/30 pl-3 py-1 bg-muted/30 rounded-r">
                          <span className="font-semibold">{sectionNum}.{subsectionNum}</span>{" "}
                          {subsectionNames.get(`${sectionNum}-${subsectionNum}`) || ""}
                        </h3>
                      )}

                      {/* Questions */}
                      <div className="space-y-4 pl-2">
                        {questions.map(([questionId, q]) => {
                          const questionNumber = (() => {
                            const s = q.section_sort_number
                            const ss = q.subsection_sort_number
                            const o = q.question_order
                            if (s && ss && o) return `${s}.${ss}.${o}`
                            if (s && o) return `${s}.${o}`
                            if (o) return String(o)
                            return null
                          })()
                          const isListTable = q.response_type?.toLowerCase() === 'list table'
                          const singleAnswer = q.answers[0]

                          return (
                            <Card key={questionId}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base font-medium flex items-start gap-2">
                                  {questionNumber && (
                                    <Badge variant="secondary" className="shrink-0">{questionNumber}</Badge>
                                  )}
                                  <span>{q.question_name || q.question_content || 'Unnamed question'}</span>
                                </CardTitle>
                                {q.question_content && q.question_name && q.question_content !== q.question_name && (
                                  <p className="text-sm text-muted-foreground">{q.question_content}</p>
                                )}
                              </CardHeader>
                              <CardContent>
                                {isListTable ? (
                                  renderListTable(q.answers)
                                ) : (
                                  <div className="bg-muted/50 rounded px-3 py-2">
                                    {formatAnswer(singleAnswer) || <span className="text-muted-foreground italic">No answer</span>}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!renderCanonical && sortedQuestions.length === 0 && customQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {tagIds.length === 0
              ? 'No tags selected for this sheet. Add tags to see questions.'
              : 'No questions found for the selected tags.'}
          </div>
        )}

        {/* Custom Questions Section */}
        {customQuestions.length > 0 && (
          <div className="space-y-4 mt-8">
            <div className="sticky top-0 bg-background z-10 py-3 border-b border-purple-300/50">
              <h2 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-sm">+</span>
                Additional Questions from {requestingCompanyName || 'Customer'}
              </h2>
            </div>

            <div className="space-y-4 pl-2">
              {customQuestions.map((cq, index) => {
                const answer = customAnswerMap.get(cq.id)
                let displayValue = answer || ''

                if (cq.response_type === 'yes_no' && answer) {
                  displayValue = answer === 'true' ? 'Yes' : answer === 'false' ? 'No' : answer
                }

                return (
                  <Card key={cq.id} className="border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0 bg-purple-100 text-purple-800">
                          {index + 1}
                        </Badge>
                        <span>
                          {cq.question_text}
                          {cq.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </CardTitle>
                      {cq.hint && (
                        <p className="text-sm text-muted-foreground">{cq.hint}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded px-3 py-2">
                        {displayValue || <span className="text-muted-foreground italic">No answer</span>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
