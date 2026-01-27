import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'

// Standard HQ section IDs - only these should be shown
const HQ_SECTION_IDS = [
  "e642dcaa-a3af-4535-9cba-b51e68f3813b", // Product Information
  "552794d4-17d5-4228-8713-0fc11ff266d6", // Ecolabels
  "37aed84e-c334-4f49-9538-6289b3645b50", // Biocides
  "2dcf4218-d7d9-48c2-b17e-23da10f994ac", // Food Contact Compliance
  "4dcc094b-d1d2-4ad5-84e5-eb59fb3d0a83", // PIDSL
  "1f24e929-8291-4b96-9655-4f16d0d42d72", // Additional Requirements
]

const VALID_SECTION_SORT_NUMBERS = [1, 2, 3, 4, 5, 6]

interface ViewAnswer {
  id: string
  question_id: string
  question_name: string
  question_content: string | null
  response_type: string
  section_sort_number: number | null
  subsection_sort_number: number | null
  question_order: number | null
  text_value: string | null
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

  // Fetch all answers from the view
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order')
    .order('list_table_column_order')

  // Fetch questions with their section/subsection names via joins
  const { data: questionsWithSections } = await supabase
    .from("questions")
    .select(`
      id,
      subsection_id,
      section_sort_number,
      subsection_sort_number,
      subsections!inner(
        id,
        name,
        section_id,
        sections!inner(
          id,
          name
        )
      )
    `)

  // Build lookup map for section/subsection names
  const questionSectionMap: Record<string, { sectionName: string; subsectionName: string; sectionId: string }> = {}
  const validQuestionIds = new Set<string>()
  
  questionsWithSections?.forEach((q: any) => {
    if (q.subsections?.sections) {
      const sectionId = q.subsections.sections.id
      if (HQ_SECTION_IDS.includes(sectionId)) {
        questionSectionMap[q.id] = {
          sectionName: q.subsections.sections.name || "",
          subsectionName: q.subsections.name || "",
          sectionId: sectionId
        }
        validQuestionIds.add(q.id)
      }
    }
  })

  // Filter answers to only HQ sections
  const filteredAnswers = answers?.filter(a => 
    validQuestionIds.has(a.question_id) &&
    a.section_sort_number !== null &&
    VALID_SECTION_SORT_NUMBERS.includes(a.section_sort_number)
  ) || []

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

  filteredAnswers.forEach((answer: ViewAnswer) => {
    if (!questionMap.has(answer.question_id)) {
      questionMap.set(answer.question_id, {
        question_name: answer.question_name,
        question_content: answer.question_content,
        response_type: answer.response_type,
        section_sort_number: answer.section_sort_number,
        subsection_sort_number: answer.subsection_sort_number,
        question_order: answer.question_order,
        answers: []
      })
    }
    questionMap.get(answer.question_id)!.answers.push(answer)
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
          <Link href="/sheets" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{sheet.name}</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline">{sheet.status || 'draft'}</Badge>
            <Link href={`/sheets/${sheetId}/edit`}>
              <Button size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Sheet
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{sortedQuestions.length} questions with answers</span>
          <span>{filteredAnswers.length} total answer values</span>
        </div>

        {/* Questions grouped by Section/Subsection */}
        <div className="space-y-6">
          {sortedSections.map(([sectionNum, subsections]) => (
            <div key={sectionNum} className="space-y-4">
              {/* Section Header */}
              <div className="sticky top-0 bg-background z-10 py-3 border-b border-primary/20">
                <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">{sectionNum}</span>
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
                        const questionNumber = q.section_sort_number && q.subsection_sort_number && q.question_order
                          ? `${q.section_sort_number}.${q.subsection_sort_number}.${q.question_order}`
                          : null
                        const isListTable = q.response_type === 'List table'
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
                              {q.question_content && q.question_name && (
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
            No answers found for this sheet
          </div>
        )}
      </div>
    </AppLayout>
  )
}
