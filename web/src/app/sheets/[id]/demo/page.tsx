'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface Question {
  id: string
  name: string | null
  question_type: string | null
  section_sort_number: number | null
  subsection_sort_number: number | null
  order_number: number | null
  list_table_id: string | null
  parent_section_id: string | null
  parent_subsection_id: string | null
  sections?: { name: string; section_sort_number: number }
  subsections?: { name: string; order_number: number }
}

interface Answer {
  id: string
  parent_question_id: string
  choice_id: string | null
  text_value: string | null
  text_area_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  list_table_row_id: string | null
  list_table_column_id: string | null
  choices?: { name: string } | null
}

interface ListTableColumn {
  id: string
  name: string
  order_number: number | null
  list_table_id: string
}

interface Section {
  id: string
  name: string
  order_number: number | null
}

interface Subsection {
  id: string
  name: string
  order_number: number | null
  section_id: string | null
}

export default function SheetDemoPage() {
  const params = useParams()
  const sheetId = params.id as string

  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [contactUser, setContactUser] = useState<any>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [subsections, setSubsections] = useState<Subsection[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [columns, setColumns] = useState<ListTableColumn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contact-profile']))

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()

        // Fetch sheet
        const { data: sheetData, error: sheetError } = await supabase
          .from('sheets')
          .select('*')
          .eq('id', sheetId)
          .single()

        if (sheetError) throw sheetError
        setSheet(sheetData)

        // Fetch company
        if (sheetData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', sheetData.company_id)
            .single()
          setCompany(companyData)
        }

        // Fetch contact user
        if (sheetData.contact_user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', sheetData.contact_user_id)
            .single()
          setContactUser(userData)
        }

        // Fetch sections
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('*')
          .order('order_number')

        setSections(sectionsData || [])

        // Fetch subsections
        const { data: subsectionsData } = await supabase
          .from('subsections')
          .select('*')
          .order('order_number')

        setSubsections(subsectionsData || [])

        // Fetch questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .order('section_sort_number, subsection_sort_number, order_number')

        setQuestions(questionsData || [])

        // Fetch answers
        const { data: answersData } = await supabase
          .from('answers')
          .select('*')
          .eq('sheet_id', sheetId)

        // Fetch choices
        const { data: choicesData } = await supabase
          .from('choices')
          .select('id, content')

        const choicesMap = new Map(choicesData?.map(c => [c.id, { name: c.content }]) || [])

        // Enrich answers with choice names
        const enrichedAnswers = answersData?.map(a => ({
          ...a,
          choices: a.choice_id ? choicesMap.get(a.choice_id) : undefined
        })) || []

        setAnswers(enrichedAnswers)

        // Fetch list table columns
        const { data: columnsData } = await supabase
          .from('list_table_columns')
          .select('*')
          .order('parent_table_id, order_number')

        const enrichedColumns = columnsData?.map(c => ({
          ...c,
          list_table_id: c.parent_table_id
        })) || []
        setColumns(enrichedColumns)

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [sheetId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Sheet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group answers by question
  const answersByQuestion = new Map<string, Answer[]>()
  answers.forEach(answer => {
    const qid = answer.parent_question_id
    if (!answersByQuestion.has(qid)) {
      answersByQuestion.set(qid, [])
    }
    answersByQuestion.get(qid)!.push(answer)
  })

  // Build section hierarchy
  // IMPORTANT: Include ALL questions with answers, even if answer values are NULL
  // This allows us to display "No answer" or empty states
  const questionsWithAnswers = questions.filter(q => answersByQuestion.has(q.id))

  // Build parent question map to find which questions have children
  const parentQuestionMap = new Map<string, string>()
  questionsWithAnswers.forEach((q: any) => {
    if (q.dependent_no_show && q.originating_question_id) {
      parentQuestionMap.set(q.id, q.originating_question_id)
    }
  })

  // Find children for each question
  const childrenByParent = new Map<string, Question[]>()
  questionsWithAnswers.forEach((q: any) => {
    if (q.dependent_no_show) {
      // Find the parent by looking at questions in same subsection with order_number = current - 1
      const potentialParent = questionsWithAnswers.find(pq =>
        pq.parent_subsection_id === q.parent_subsection_id &&
        pq.order_number === (q.order_number || 0) - 1
      )
      if (potentialParent) {
        if (!childrenByParent.has(potentialParent.id)) {
          childrenByParent.set(potentialParent.id, [])
        }
        childrenByParent.get(potentialParent.id)!.push(q)
      }
    }
  })

  const sortedSections = [...sections].sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

  const questionsBySection = sortedSections.map((section, sectionIdx) => {
    const sectionNumber = sectionIdx + 1
    const sectionSubsections = subsections.filter(s => s.section_id === section.id)
      .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

    const subsectionsWithQuestions = sectionSubsections.map((sub, subIdx) => ({
      subsection: sub,
      subsectionNumber: subIdx + 1,
      questions: questionsWithAnswers
        .filter((q: any) => q.parent_subsection_id === sub.id && !q.dependent_no_show) // Only show non-dependent questions at top level
        .sort((a: any, b: any) => (a.order_number || 999) - (b.order_number || 999)),
      allQuestions: questionsWithAnswers // Pass all questions for child lookup
        .filter((q: any) => q.parent_subsection_id === sub.id)
        .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))
    })).filter(sub => sub.allQuestions.length > 0)

    const directQuestions = questionsWithAnswers
      .filter((q: any) => q.parent_section_id === section.id && !q.parent_subsection_id && !q.dependent_no_show)
      .sort((a: any, b: any) => (a.order_number || 999) - (b.order_number || 999))

    return {
      section,
      sectionNumber,
      subsections: subsectionsWithQuestions,
      directQuestions,
      childrenByParent
    }
  }).filter(s => s.subsections.length > 0 || s.directQuestions.length > 0)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Badge className="mb-2">Demo View</Badge>
        <h1 className="text-2xl font-semibold">{sheet?.name}</h1>
        {sheet?.modified_at && (
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {new Date(sheet.modified_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Contact Profile */}
      {(company || contactUser) && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('contact-profile')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {expandedSections.has('contact-profile') ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                Contact Profile
              </CardTitle>
            </div>
          </CardHeader>
          {expandedSections.has('contact-profile') && (
            <CardContent className="space-y-2">
              {company?.name && <p><strong>Company:</strong> {company.name}</p>}
              {company?.location_text && <p><strong>Location:</strong> {company.location_text}</p>}
              {contactUser?.full_name && <p><strong>Contact:</strong> {contactUser.full_name}</p>}
              {contactUser?.email && <p><strong>Email:</strong> {contactUser.email}</p>}
              {contactUser?.phone_text && <p><strong>Phone:</strong> {contactUser.phone_text}</p>}
            </CardContent>
          )}
        </Card>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {questionsBySection.map(({ section, sectionNumber, subsections: subs, directQuestions, childrenByParent }) => (
          <Card key={section.id}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  {sectionNumber}. {section.name}
                </CardTitle>
                <Badge variant="outline">
                  {directQuestions.length + subs.reduce((acc, s) => acc + s.allQuestions.length, 0)} questions
                </Badge>
              </div>
            </CardHeader>
            {expandedSections.has(section.id) && (
              <CardContent className="space-y-6">
                {/* Direct questions (no subsection) */}
                {directQuestions.length > 0 && (
                  <div className="space-y-4">
                    {directQuestions.map((question, qIdx) => {
                      const questionNumber = `${sectionNumber}.${qIdx + 1}`
                      const questionAnswers = answersByQuestion.get(question.id) || []
                      const children = childrenByParent.get(question.id) || []

                      return (
                        <QuestionDisplay
                          key={question.id}
                          question={question}
                          questionNumber={questionNumber}
                          answers={questionAnswers}
                          columns={columns}
                          childQuestions={children}
                          answersByQuestion={answersByQuestion}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Subsections */}
                {subs.map(({ subsection, subsectionNumber, questions: subQuestions }) => (
                  <div key={subsection.id} className="border-l-2 border-muted pl-4">
                    <h3 className="font-semibold text-lg mb-4">
                      {sectionNumber}.{subsectionNumber} {subsection.name}
                    </h3>
                    <div className="space-y-4">
                      {subQuestions.map((question, qIdx) => {
                        const questionNumber = `${sectionNumber}.${subsectionNumber}.${qIdx + 1}`
                        const questionAnswers = answersByQuestion.get(question.id) || []
                        const children = childrenByParent.get(question.id) || []

                        return (
                          <QuestionDisplay
                            key={question.id}
                            question={question}
                            questionNumber={questionNumber}
                            answers={questionAnswers}
                            columns={columns}
                            childQuestions={children}
                            answersByQuestion={answersByQuestion}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function QuestionDisplay({
  question,
  questionNumber,
  answers,
  columns,
  childQuestions = [],
  answersByQuestion
}: {
  question: Question
  questionNumber: string
  answers: Answer[]
  columns: ListTableColumn[]
  childQuestions?: Question[]
  answersByQuestion?: Map<string, Answer[]>
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium">
        <span className="text-muted-foreground mr-2">{questionNumber}</span>
        {question.name}
      </div>

      {question.question_type === 'List table' ? (
        <ListTableDisplay
          answers={answers}
          allColumns={columns}
          questionListTableId={question.list_table_id}
        />
      ) : (
        <SimpleAnswerDisplay answer={answers[0]} />
      )}

      {/* Child questions (e.g., 3.1.1.1) */}
      {childQuestions.length > 0 && answersByQuestion && (
        <div className="pl-6 space-y-2 mt-4">
          {childQuestions.map((childQ, childIdx) => {
            const childNumber = `${questionNumber}.${childIdx + 1}`
            const childAnswers = answersByQuestion.get(childQ.id) || []

            return (
              <div key={childQ.id} className="space-y-2">
                <div className="font-medium text-sm">
                  <span className="text-muted-foreground mr-2">{childNumber}</span>
                  {childQ.name}
                </div>
                {childQ.question_type === 'List table' ? (
                  <ListTableDisplay
                    answers={childAnswers}
                    allColumns={columns}
                    questionListTableId={childQ.list_table_id}
                  />
                ) : (
                  <SimpleAnswerDisplay answer={childAnswers[0]} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SimpleAnswerDisplay({ answer }: { answer?: Answer }) {
  if (!answer) {
    return <div className="text-sm text-muted-foreground pl-4">No answer</div>
  }

  // Choice answer
  if (answer.choice_id && answer.choices) {
    return (
      <div className="bg-blue-50 p-3 rounded text-sm pl-4">
        {answer.choices.name}
      </div>
    )
  }

  // Text answer
  if (answer.text_value) {
    return (
      <div className="bg-gray-50 p-3 rounded text-sm pl-4">
        {answer.text_value}
      </div>
    )
  }

  // Text area
  if (answer.text_area_value) {
    return (
      <div className="bg-gray-50 p-3 rounded text-sm pl-4 whitespace-pre-wrap">
        {answer.text_area_value}
      </div>
    )
  }

  // Number
  if (answer.number_value !== null) {
    return (
      <div className="bg-gray-50 p-3 rounded text-sm pl-4">
        {answer.number_value}
      </div>
    )
  }

  // Boolean
  if (answer.boolean_value !== null) {
    return (
      <div className="bg-gray-50 p-3 rounded text-sm pl-4">
        {answer.boolean_value ? 'Yes' : 'No'}
      </div>
    )
  }

  // Empty/NULL answer - show as "Not answered"
  return (
    <div className="text-sm text-muted-foreground italic pl-4 py-2">
      (Not answered)
    </div>
  )
}

function ListTableDisplay({
  answers,
  allColumns,
  questionListTableId
}: {
  answers: Answer[]
  allColumns: ListTableColumn[]
  questionListTableId: string | null
}) {
  if (answers.length === 0) {
    return <div className="text-sm text-muted-foreground pl-4">No list table data</div>
  }

  // Strategy: First try to match by questionListTableId, if that fails, find columns from answer column IDs
  let relevantColumns: ListTableColumn[] = []

  if (questionListTableId) {
    // Try to find columns by question's list_table_id
    relevantColumns = allColumns.filter(c => c.list_table_id === questionListTableId)
  }

  // If we didn't find columns via list_table_id, look them up from the answers
  if (relevantColumns.length === 0) {
    // Get unique column IDs from answers
    const uniqueColumnIds = Array.from(new Set(answers.map(a => a.list_table_column_id).filter(Boolean)))

    // Find these columns in the global columns array
    relevantColumns = uniqueColumnIds
      .map(colId => allColumns.find(c => c.id === colId))
      .filter(Boolean) as ListTableColumn[]
  }

  // Group answers by row
  const rowMap = new Map<string, Record<string, string>>()
  answers.forEach(answer => {
    const rowId = answer.list_table_row_id
    if (!rowId) return

    if (!rowMap.has(rowId)) {
      rowMap.set(rowId, {})
    }

    // Find column name
    const column = relevantColumns.find(c => c.id === answer.list_table_column_id)
    const colName = column?.name || 'Unknown Column'
    rowMap.get(rowId)![colName] = answer.text_value || ''
  })

  const rows = Array.from(rowMap.entries())
  const sortedColumns = [...relevantColumns].sort((a, b) =>
    (a.order_number || 999) - (b.order_number || 999)
  )

  return (
    <div className="overflow-x-auto pl-4">
      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            {sortedColumns.map(col => (
              <th key={col.id} className="px-3 py-2 text-left border-b font-medium">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([rowId, values], idx) => (
            <tr key={rowId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {sortedColumns.map(col => (
                <td key={col.id} className="px-3 py-2 border-b">
                  {values[col.name] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
