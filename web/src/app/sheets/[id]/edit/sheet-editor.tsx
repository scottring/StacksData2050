'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Check,
  SendHorizontal
} from 'lucide-react'
import { useAnswers, SaveStatus } from '@/hooks/use-answers'
import { QuestionItem, ListTableColumn } from '@/components/sheets/question-item'
import { AnswerRejection } from '@/components/sheets/answer-rejection-comment'

interface Section {
  id: string
  name: string | null
  order_number: number | null
  help?: string | null
}

interface Subsection {
  id: string
  name: string | null
  content?: string | null
  section_id: string | null
  order_number: number | null
}

interface Question {
  id: string
  name: string | null
  content: string | null
  question_type: string | null
  response_type?: string | null
  required: boolean | null
  order_number: number | null
  // Support both old and new column names
  parent_section_id?: string | null
  parent_subsection_id?: string | null
  subsection_id?: string | null  // Local DB uses this
  clarification?: string | null
  dependent_no_show?: boolean | null
  section_sort_number: number | null
  subsection_sort_number: number | null
  list_table_id?: string | null
  originating_question_id?: string | null
}

interface Choice {
  id: string
  content: string | null
  question_id: string | null
  order_number: number | null
}

interface Answer {
  id: string
  question_id: string | null
  text_value: string | null
  text_area_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  date_value: string | null
  choice_id: string | null
  clarification: string | null
  list_table_row_id: string | null
  list_table_column_id: string | null
  modified_at: string | null
}

interface SheetEditorProps {
  sheetId: string
  sheetName: string
  sheetStatus: string | null
  companyName: string
  sections: Section[]
  subsections: Subsection[]
  questions: Question[]
  choices: Choice[]
  answers: Answer[]
  listTableColumns: ListTableColumn[]
  rejections: { id: string; answer_id: string; reason: string | null }[]
  sheetObservations: string | null
  currentUserId?: string
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
    case 'approved':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'flagged':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Needs Review
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {status || 'Draft'}
        </Badge>
      )
  }
}

function getSaveStatusIcon(status: SaveStatus) {
  switch (status) {
    case 'saving':
      return <Loader2 className="h-4 w-4 animate-spin" />
    case 'saved':
      return <Check className="h-4 w-4 text-green-600" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />
    default:
      return null
  }
}

export function SheetEditor({
  sheetId,
  sheetName,
  sheetStatus,
  companyName,
  sections,
  subsections,
  questions,
  choices,
  answers: initialAnswers,
  listTableColumns,
  rejections,
  sheetObservations,
}: SheetEditorProps) {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Start with first section expanded
    const firstSection = sections.sort((a, b) => (a.order_number || 0) - (b.order_number || 0))[0]
    return firstSection ? new Set([firstSection.id]) : new Set()
  })

  // Local state for answers (for immediate UI updates)
  const [localAnswers, setLocalAnswers] = useState<Map<string, Answer>>(() => {
    const map = new Map()
    initialAnswers.forEach(a => {
      if (a.question_id) {
        // For list tables, use composite key
        if (a.list_table_row_id) {
          const key = `${a.question_id}|${a.list_table_row_id}|${a.list_table_column_id || ''}`
          map.set(key, a)
        } else {
          map.set(a.question_id, a)
        }
      }
    })
    return map
  })

  const { saveStatus, queueAnswer, flush } = useAnswers({
    sheetId,
    debounceMs: 1500,
    onSaveError: (error) => {
      console.error('Save error:', error)
    }
  })

  // Build rejections map
  const rejectionsMap = useMemo(() => {
    const map = new Map<string, AnswerRejection>()
    rejections.forEach(r => {
      // Find the answer to get the question_id
      const answer = initialAnswers.find(a => a.id === r.answer_id)
      if (answer?.question_id) {
        map.set(answer.question_id, {
          id: r.id,
          answer_id: r.answer_id,
          reason: r.reason
        })
      }
    })
    return map
  }, [rejections, initialAnswers])

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Handle answer change
  const handleAnswerChange = useCallback((questionId: string, value: string | number | boolean | null, type: string) => {
    // Update local state immediately for responsive UI
    setLocalAnswers(prev => {
      const next = new Map(prev)
      const existing = prev.get(questionId) || {
        id: '',
        question_id: questionId,
        text_value: null,
        text_area_value: null,
        number_value: null,
        boolean_value: null,
        date_value: null,
        choice_id: null,
        clarification: null,
        list_table_row_id: null,
        list_table_column_id: null,
        modified_at: null
      }

      const updated = { ...existing }

      // Clear previous values and set new one based on type
      updated.text_value = null
      updated.text_area_value = null
      updated.number_value = null
      updated.boolean_value = null
      updated.date_value = null
      updated.choice_id = null

      switch (type) {
        case 'boolean':
          updated.boolean_value = value as boolean
          break
        case 'choice':
          updated.choice_id = value as string
          break
        case 'number':
          updated.number_value = value as number
          break
        case 'date':
          updated.date_value = value as string
          break
        case 'text_area':
          updated.text_area_value = value as string
          break
        case 'text':
        default:
          updated.text_value = value as string
          break
      }

      next.set(questionId, updated)
      return next
    })

    // Queue for server save
    queueAnswer(questionId, value, type, {
      answerId: localAnswers.get(questionId)?.id || undefined
    })
  }, [queueAnswer, localAnswers])

  // Handle clarification change
  const handleClarificationChange = useCallback((questionId: string, clarification: string) => {
    setLocalAnswers(prev => {
      const next = new Map(prev)
      const existing = prev.get(questionId)
      if (existing) {
        next.set(questionId, { ...existing, clarification })
      }
      return next
    })

    // Get the current answer to preserve its type
    const answer = localAnswers.get(questionId)
    if (answer) {
      const value = answer.choice_id || answer.text_value || answer.number_value || answer.boolean_value || answer.date_value
      const type = answer.choice_id ? 'choice' :
                   answer.number_value !== null ? 'number' :
                   answer.boolean_value !== null ? 'boolean' :
                   answer.date_value ? 'date' : 'text'

      queueAnswer(questionId, value, type, {
        answerId: answer.id || undefined,
        clarification
      })
    }
  }, [queueAnswer, localAnswers])

  // Get answer for a question
  const getAnswer = useCallback((questionId: string) => {
    return localAnswers.get(questionId)
  }, [localAnswers])

  // Get rejection for a question
  const getRejection = useCallback((questionId: string) => {
    return rejectionsMap.get(questionId)
  }, [rejectionsMap])

  // Build section hierarchy with questions
  const sectionHierarchy = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) =>
      (a.order_number || 999) - (b.order_number || 999)
    )

    return sortedSections.map((section, sectionIdx) => {
      const sectionNumber = sectionIdx + 1
      const sectionSubsections = subsections
        .filter(sub => sub.section_id === section.id)
        .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

      const subsectionsWithQuestions = sectionSubsections.map((sub, subIdx) => {
        const subQuestions = questions
          .filter(q => {
            // Support both column names: parent_subsection_id (remote) and subsection_id (local)
            const qSubsectionId = q.parent_subsection_id || q.subsection_id
            return qSubsectionId === sub.id && !q.dependent_no_show
          })
          .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

        return {
          subsection: sub,
          subsectionNumber: subIdx + 1,
          questions: subQuestions
        }
      }).filter(s => s.questions.length > 0)

      // Direct section questions (no subsection)
      // Support both column names for section and subsection
      const directQuestions = questions
        .filter(q => {
          const qSubsectionId = q.parent_subsection_id || q.subsection_id
          const qSectionId = q.parent_section_id
          // Only show as direct if has section_id but no subsection_id
          return qSectionId === section.id && !qSubsectionId && !q.dependent_no_show
        })
        .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

      const totalQuestions = directQuestions.length +
        subsectionsWithQuestions.reduce((sum, s) => sum + s.questions.length, 0)

      return {
        section,
        sectionNumber,
        subsections: subsectionsWithQuestions,
        directQuestions,
        totalQuestions
      }
    }).filter(s => s.totalQuestions > 0)
  }, [sections, subsections, questions])

  // Calculate progress
  const progress = useMemo(() => {
    const totalQuestions = questions.filter(q => !q.dependent_no_show).length
    const answeredQuestions = questions.filter(q => {
      if (q.dependent_no_show) return false
      const answer = localAnswers.get(q.id)
      if (!answer) return false
      return answer.text_value || answer.text_area_value ||
             answer.number_value !== null || answer.boolean_value !== null ||
             answer.date_value || answer.choice_id
    }).length

    return {
      total: totalQuestions,
      answered: answeredQuestions,
      percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    }
  }, [questions, localAnswers])

  // Check if editing is allowed based on status
  const canEdit = !['approved', 'completed'].includes(sheetStatus || '')

  return (
    <AppLayout title={`Edit: ${sheetName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sheets" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{sheetName}</h1>
              <p className="text-muted-foreground">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getSaveStatusIcon(saveStatus)}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Save failed'}
            </div>
            {getStatusBadge(sheetStatus)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {progress.answered} of {progress.total} questions ({progress.percentage}%)
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Observations/feedback from reviewer */}
        {sheetObservations && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                Reviewer Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                {sheetObservations}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Section cards */}
        <div className="space-y-4">
          {sectionHierarchy.map(({ section, sectionNumber, subsections: subs, directQuestions, totalQuestions }) => {
            const isExpanded = expandedSections.has(section.id)

            return (
              <Card key={section.id}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      {sectionNumber}. {section.name}
                    </CardTitle>
                    <Badge variant="outline">
                      {totalQuestions} questions
                    </Badge>
                  </div>
                  {section.help && (
                    <p className="text-sm text-muted-foreground ml-7">{section.help}</p>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6">
                    {/* Direct questions */}
                    {directQuestions.length > 0 && (
                      <div className="space-y-4">
                        {directQuestions.map((question, qIdx) => (
                          <QuestionItem
                            key={question.id}
                            question={question}
                            choices={choices}
                            answer={getAnswer(question.id)}
                            onAnswerChange={handleAnswerChange}
                            onClarificationChange={handleClarificationChange}
                            disabled={!canEdit}
                            sheetId={sheetId}
                            rejection={getRejection(question.id)}
                            questionNumber={`${sectionNumber}.${qIdx + 1}`}
                            listTableColumns={listTableColumns.filter(
                              c => c.parent_table_id === question.list_table_id
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Subsections */}
                    {subs.map(({ subsection, subsectionNumber, questions: subQuestions }) => (
                      <div key={subsection.id} className="border-l-2 border-muted pl-4">
                        <h3 className="font-semibold text-base mb-4">
                          {sectionNumber}.{subsectionNumber} {subsection.name}
                        </h3>
                        {subsection.content && (
                          <p className="text-sm text-muted-foreground mb-4">{subsection.content}</p>
                        )}
                        <div className="space-y-4">
                          {subQuestions.map((question, qIdx) => (
                            <QuestionItem
                              key={question.id}
                              question={question}
                              choices={choices}
                              answer={getAnswer(question.id)}
                              onAnswerChange={handleAnswerChange}
                              onClarificationChange={handleClarificationChange}
                              disabled={!canEdit}
                              sheetId={sheetId}
                              rejection={getRejection(question.id)}
                              questionNumber={`${sectionNumber}.${subsectionNumber}.${qIdx + 1}`}
                              listTableColumns={listTableColumns.filter(
                                c => c.parent_table_id === question.list_table_id
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Actions footer */}
        {canEdit && (
          <div className="sticky bottom-0 bg-background border-t py-4 -mx-4 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getSaveStatusIcon(saveStatus)}
              {saveStatus === 'idle' && 'All changes saved'}
              {saveStatus === 'saving' && 'Saving changes...'}
              {saveStatus === 'saved' && 'Changes saved'}
              {saveStatus === 'error' && 'Error saving changes'}
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => flush()}
                disabled={saveStatus === 'saving'}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement submit flow
                  alert('Submit functionality coming soon')
                }}
                disabled={saveStatus === 'saving'}
              >
                <SendHorizontal className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-medium">This sheet has been completed</p>
            <p className="text-sm">No further edits can be made.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
