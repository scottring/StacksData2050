import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Upload } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'

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

export default async function SheetViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sheetId } = await params
  const supabase = await createClient()

  // Fetch sheet info
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, companies!sheets_company_id_fkey(name)')
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

  // === Fetch the sheet's tags (same as edit page) ===
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []

  // === Get questions with those tags ===
  let taggedQuestionIds: string[] = []
  if (tagIds.length > 0) {
    const { data: questionTags } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds)
    
    taggedQuestionIds = [...new Set(questionTags?.map(qt => qt.question_id) || [])]
  }

  // Fetch all answers from the view
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)

  // Fetch questions with their section/subsection info (only tagged ones)
  let questionsWithSections: any[] = []
  
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
      
      if (data) {
        questionsWithSections.push(...data)
      }
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

  // Sort questions
  const sortedQuestions = Array.from(questionMap.entries()).sort((a, b) => {
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
  const sectionNames = new Map<number, string>()
  const subsectionNames = new Map<string, string>()
  
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
  const sections = new Map<number, Map<number, Array<[string, typeof sortedQuestions[0][1]]>>>()
  
  sortedQuestions.forEach(([questionId, q]) => {
    const sectionNum = q.section_sort_number ?? 0
    const subsectionNum = q.subsection_sort_number ?? 0
    
    if (!sections.has(sectionNum)) {
      sections.set(sectionNum, new Map())
    }
    const sectionMap = sections.get(sectionNum)!
    if (!sectionMap.has(subsectionNum)) {
      sectionMap.set(subsectionNum, [])
    }
    sectionMap.get(subsectionNum)!.push([questionId, q])
  })

  // Helper to format answer value
  function formatAnswer(answer: ViewAnswer): string {
    if (answer.choice_content) return answer.choice_content
    if (answer.text_value) return answer.text_value
    if (answer.text_area_value) return answer.text_area_value
    if (answer.number_value !== null) return String(answer.number_value)
    if (answer.boolean_value !== null) return answer.boolean_value ? 'Yes' : 'No'
    if (answer.date_value) return answer.date_value
    return ''
  }

  // Render list table
  function renderListTable(answers: ViewAnswer[]) {
    const rows = new Map<string, Map<string, string>>()
    const columns = new Map<string, { name: string; order: number }>()

    answers.forEach(a => {
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

  const companyName = (sheet as any).companies?.name || 'Unknown'
  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0])

  return (
    <AppLayout title={sheet.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl="/sheets" />
          <div>
            <h1 className="text-2xl font-bold">{sheet.name}</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline">{sheet.status || 'draft'}</Badge>
            <Link href={`/sheets/${sheetId}/import`}><Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" />Import Excel</Button></Link><Link href={`/sheets/${sheetId}/edit`}>
              <Button size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Sheet
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{sortedQuestions.length} questions</span>
          {tagIds.length > 0 && <span>• {tagIds.length} tag(s) selected</span>}
        </div>

        {/* Questions grouped by Section/Subsection */}
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

        {sortedQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {tagIds.length === 0 
              ? 'No tags selected for this sheet. Add tags to see questions.'
              : 'No questions found for the selected tags.'}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
