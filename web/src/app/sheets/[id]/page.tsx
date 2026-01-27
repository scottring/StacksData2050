import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil } from 'lucide-react'
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

  // Fetch all answers from the view - already deduplicated and joined!
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order')
    .order('list_table_column_order')

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

  ;(answers || []).forEach((answer: ViewAnswer) => {
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

  // Sort questions by section/subsection/order
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
    // Group by row
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

    const sortedColumns = Array.from(columns.entries())
      .sort((a, b) => a[1].order - b[1].order)

    if (rows.size === 0) return <p className="text-muted-foreground italic">No data</p>

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-muted">
            <tr>
              {sortedColumns.map(([colId, col]) => (
                <th key={colId} className="border px-3 py-2 text-left font-medium">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(rows.entries()).map(([rowId, rowData]) => (
              <tr key={rowId} className="hover:bg-muted/50">
                {sortedColumns.map(([colId]) => (
                  <td key={colId} className="border px-3 py-2">
                    {rowData.get(colId) || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const companyName = (sheet as any).companies?.name || 'Unknown'

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
            <Badge variant="outline">
              {sheet.status || 'draft'}
            </Badge>
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
          <span>{answers?.length || 0} total answer values</span>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {sortedQuestions.map(([questionId, q]) => {
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
                      <Badge variant="secondary" className="shrink-0">
                        {questionNumber}
                      </Badge>
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

        {sortedQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No answers found for this sheet
          </div>
        )}
      </div>
    </AppLayout>
  )
}
