'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Flag,
  ThumbsUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Section {
  id: string
  name: string
  order_number: number | null
  help: string | null
}

interface Subsection {
  id: string
  name: string
  section_id: string | null
  order_number: number | null
}

interface Question {
  id: string
  name: string | null
  content: string | null
  question_type: string | null
  response_type?: string | null  // New schema uses this
  required: boolean | null
  order_number: number | null
  parent_section_id: string | null
  parent_subsection_id: string | null
  subsection_id?: string | null  // New schema field
  clarification: string | null
}

interface Choice {
  id: string
  content: string | null
  question_id: string | null
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
  choice_content: string | null
  sheet_id: string | null
  list_table_row_id?: string | null
  list_table_column_id?: string | null
  list_table_column_name?: string | null
}

interface AnswerRejection {
  id: string
  answer_id: string
  reason: string
  response: string | null
  resolved_at: string | null
  rejected_by: string | null
  created_at: string
}

interface Sheet {
  id: string
  name: string
  status: string | null
  company_id: string | null
  requesting_company_id: string | null
  modified_at: string | null
}

interface ListTableColumn {
  id: string
  name: string | null
  order_number: number | null
  question_id: string | null
}

interface ReviewData {
  sheet: Sheet
  sections: Section[]
  subsections: Subsection[]
  questions: Question[]
  choices: Choice[]
  answers: Answer[]
  existingRejections: AnswerRejection[]
  listTableColumns: ListTableColumn[]
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const sheetId = params.id as string

  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [observations, setObservations] = useState('')
  const [flaggedAnswers, setFlaggedAnswers] = useState<Map<string, Array<{ reason: string; response: string | null; resolved_at: string | null; created_at: string }>>>(new Map())
  const [showFlagInput, setShowFlagInput] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')

  useEffect(() => {
    async function fetchReviewData() {
      const supabase = createClient()

      const { data: sheet, error: sheetError } = await supabase
        .from('sheets')
        .select('*')
        .eq('id', sheetId)
        .single()

      if (sheetError || !sheet) {
        console.error('Error fetching sheet:', sheetError)
        setLoading(false)
        return
      }

      const [
        { data: sections },
        { data: subsections },
        { data: questions },
        { data: choices },
        { data: answers },
        { data: listTableColumns }
      ] = await Promise.all([
        supabase.from('sections').select('*').order('order_number'),
        supabase.from('subsections').select('*').order('order_number'),
        supabase.from('questions').select('*').order('order_number'),
        supabase.from('choices').select('*').order('order_number'),
        supabase.from('sheet_answers_display').select('*').eq('sheet_id', sheetId),
        supabase.from('list_table_columns').select('id, name, order_number, question_id').order('order_number')
      ])

      // Filter questions by sheet tags
      const { data: sheetTags } = await supabase
        .from('sheet_tags')
        .select('tag_id')
        .eq('sheet_id', sheetId)

      let filteredQuestions = questions || []
      if (sheetTags && sheetTags.length > 0) {
        const tagIds = sheetTags.map(st => st.tag_id)
        const { data: questionTags } = await supabase
          .from('question_tags')
          .select('question_id')
          .in('tag_id', tagIds)

        if (questionTags && questionTags.length > 0) {
          const relevantQuestionIds = new Set(questionTags.map(qt => qt.question_id))
          filteredQuestions = (questions || []).filter(q => relevantQuestionIds.has(q.id))
        }
      }

      // Fetch existing rejections
      const answerIds = (answers || []).map(a => a.id)
      let existingRejections: AnswerRejection[] = []
      if (answerIds.length > 0) {
        const { data: rejectionsData } = await supabase
          .from('answer_rejections')
          .select('*')
          .in('answer_id', answerIds)
        existingRejections = (rejectionsData || []) as AnswerRejection[]
      }

      // Pre-populate flagged answers from existing rejections (all rounds)
      const flaggedMap = new Map<string, Array<{ reason: string; response: string | null; resolved_at: string | null; created_at: string }>>()
      // Sort by created_at to maintain conversation order
      const sortedRejections = [...existingRejections].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      sortedRejections.forEach(r => {
        const answer = answers?.find(a => a.id === r.answer_id)
        if (answer?.question_id) {
          const existing = flaggedMap.get(answer.question_id) || []
          existing.push({ reason: r.reason, response: r.response, resolved_at: r.resolved_at, created_at: r.created_at })
          flaggedMap.set(answer.question_id, existing)
        }
      })

      setData({
        sheet,
        sections: sections || [],
        subsections: subsections || [],
        questions: filteredQuestions,
        choices: choices || [],
        answers: answers || [],
        existingRejections,
        listTableColumns: listTableColumns || []
      })
      setFlaggedAnswers(flaggedMap)

      // If there are existing rejections, expand sections that contain flagged questions
      // Also filter questions to only show flagged ones
      if (flaggedMap.size > 0) {
        // Find sections that contain flagged questions
        const flaggedQuestionIds = new Set(flaggedMap.keys())
        const sectionsWithFlags = new Set<string>()
        
        // Build subsection -> section mapping
        const subToSection = new Map<string, string>()
        subsections?.forEach(sub => {
          if (sub.section_id) subToSection.set(sub.id, sub.section_id)
        })
        
        // Find sections for flagged questions
        filteredQuestions.forEach(q => {
          if (flaggedQuestionIds.has(q.id)) {
            const subId = (q as any).subsection_id || q.parent_subsection_id
            const sectionId = subToSection.get(subId)
            if (sectionId) sectionsWithFlags.add(sectionId)
          }
        })
        
        setExpandedSections(sectionsWithFlags)
        
        // Filter to only flagged questions
        filteredQuestions = filteredQuestions.filter(q => flaggedQuestionIds.has(q.id))
      } else if (sections && sections.length > 0) {
        // No existing rejections - expand first section
        setExpandedSections(new Set([sections[0].id]))
      }

      setLoading(false)
    }

    if (sheetId) {
      fetchReviewData()
    }
  }, [sheetId])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Check if question has an active flag (not resolved by manufacturer)
  const isQuestionFlagged = (questionId: string): boolean => {
    const rounds = flaggedAnswers.get(questionId)
    if (!rounds || rounds.length === 0) return false
    // A question is flagged if ANY round is not resolved
    return rounds.some(r => r.resolved_at === null)
  }

  // Count questions with unresolved flags
  const unresolvedFlagCount = Array.from(flaggedAnswers.keys()).filter(qId => isQuestionFlagged(qId)).length

  const handleFlagAnswer = (questionId: string) => {
    if (flagReason.trim()) {
      setFlaggedAnswers(prev => {
        const next = new Map(prev)
        const existing = next.get(questionId) || []
        existing.push({ reason: flagReason, response: null, resolved_at: null, created_at: new Date().toISOString() })
        next.set(questionId, existing)
        return next
      })
      setShowFlagInput(null)
      setFlagReason('')
    }
  }

  const handleUnflag = async (questionId: string) => {
    // Call API to resolve all flags for this question
    const response = await fetch('/api/sheets/resolve-flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, questionId })
    })
    
    if (response.ok) {
      // Update local state - mark all rounds as resolved
      setFlaggedAnswers(prev => {
        const next = new Map(prev)
        const existing = next.get(questionId)
        if (existing) {
          const updated = existing.map(r => ({ ...r, resolved_at: new Date().toISOString() }))
          next.set(questionId, updated)
        }
        return next
      })
    } else {
      console.error('Failed to resolve flag')
    }
  }

  const handleApprove = async () => {
    if (!data) return
    setSaving(true)

    const supabase = createClient()

    try {
      // Update sheet status to approved
      await supabase
        .from('sheets')
        .update({ status: 'approved', modified_at: new Date().toISOString() })
        .eq('id', sheetId)

      // Create sheet_status record
      await supabase
        .from('sheet_statuses')
        .insert({
          sheet_id: sheetId,
          status: 'approved',
          observations: observations || null,
          completed: true
        })

      router.push('/dashboard')
    } catch (error) {
      console.error('Error approving sheet:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!data || unresolvedFlagCount === 0) return
    setSaving(true)

    const supabase = createClient()

    try {
      // Create sheet_status record with observations
      await supabase
        .from('sheet_statuses')
        .insert({
          sheet_id: sheetId,
          status: 'flagged',
          observations: observations || null,
          completed: false
        })

      // Create answer rejections via API (bypasses RLS) - only send NEW flags (no response yet)
      const rejections = Array.from(flaggedAnswers.entries())
        .filter(([_, rounds]) => rounds.some(r => r.response === null))
        .map(([questionId, rounds]) => {
          // Get the latest flag without a response
          const latestUnresponded = rounds.filter(r => r.response === null).pop()
          return {
            questionId,
            reason: latestUnresponded?.reason || ''
          }
        })
        .filter(r => r.reason)
      
      const rejectResponse = await fetch('/api/sheets/reject-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, rejections })
      })
      
      if (!rejectResponse.ok) {
        const errorData = await rejectResponse.json()
        console.error('Failed to create rejections:', errorData)
      } else {
        const result = await rejectResponse.json()
        console.log('Rejections created:', result)
      }

      // Get supplier info for notification
      const { data: request } = await supabase
        .from('requests')
        .select('requesting_from_id')
        .eq('sheet_id', sheetId)
        .single()

      if (request) {
        const { data: supplierUsers } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('company_id', request.requesting_from_id)
          .limit(1)

        if (supplierUsers && supplierUsers.length > 0) {
          // Send revision notification
          fetch('/api/requests/notify-revision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetId,
              supplierEmail: supplierUsers[0].email,
              supplierName: supplierUsers[0].full_name,
              productName: data.sheet.name,
              flaggedCount: unresolvedFlagCount,
              observations: observations || null,
            })
          }).catch(console.error)
        }
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error requesting revision:', error)
    } finally {
      setSaving(false)
    }
  }

  const getAnswerDisplay = (question: Question, answer: Answer | undefined): string => {
    if (!answer) return 'Not answered'

    // Use response_type (new schema) or question_type (old schema)
    const qType = (question.response_type || question.question_type || '').toLowerCase()

    switch (qType) {
      case 'yes_no':
      case 'boolean':
        return answer.boolean_value === true ? 'Yes' : answer.boolean_value === false ? 'No' : 'Not answered'
      case 'number':
        return answer.number_value?.toString() || 'Not answered'
      case 'date':
        return answer.date_value || 'Not answered'
      case 'text_area':
      case 'textarea':
      case 'multiple text lines':
        return answer.text_area_value || 'Not answered'
      case 'dropdown':
      case 'single_choice':
      case 'multiple_choice':
      case 'select one':
      case 'select one radio':
      case 'select multiple':
      case 'choice':
        // Use choice_content directly from the view
        if (answer.choice_content) {
          return answer.choice_content
        }
        // Fallback to choice_id lookup
        if (answer.choice_id && data) {
          const choice = data.choices.find(c => c.id === answer.choice_id)
          return choice?.content || 'Selected'
        }
        return 'Not answered'
      case 'list table':
      case 'list_table':
        // List tables rendered separately - return placeholder
        return '__LIST_TABLE__'
      case 'single text line':
      case 'text':
      default:
        return answer.text_value || 'Not answered'
    }
  }

  // Render list table as actual table
  const renderListTable = (question: Question) => {
    const listAnswers = answers.filter(a => a.question_id === question.id && a.list_table_row_id)
    if (listAnswers.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No data entered</p>
    }

    // Group by row
    const rows = new Map<string, Map<string, Answer>>()
    const columnIds = new Set<string>()
    
    listAnswers.forEach(a => {
      if (!a.list_table_row_id || !a.list_table_column_id) return
      if (!rows.has(a.list_table_row_id)) {
        rows.set(a.list_table_row_id, new Map())
      }
      rows.get(a.list_table_row_id)!.set(a.list_table_column_id, a)
      columnIds.add(a.list_table_column_id)
    })

    // Get column definitions from listTableColumns - filter by question_id
    const questionColumns = listTableColumns
      .filter(c => c.question_id === question.id)
      .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))

    // Build column name map
    const columnNames = new Map<string, string>()
    questionColumns.forEach(c => {
      columnNames.set(c.id, c.name || 'Column')
    })

    // Use columns from the database if available, otherwise use IDs from answers
    const sortedColumns = questionColumns.length > 0 
      ? questionColumns.map(c => c.id)
      : Array.from(columnIds)

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-muted">
            <tr>
              {sortedColumns.map(colId => (
                <th key={colId} className="border px-3 py-2 text-left font-medium">
                  {columnNames.get(colId) || 'Column'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(rows.entries()).map(([rowId, rowData]) => (
              <tr key={rowId}>
                {sortedColumns.map(colId => {
                  const answer = rowData.get(colId)
                  return (
                    <td key={colId} className="border px-3 py-2">
                      {answer?.text_value || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Check if question is a list table
  const isListTable = (question: Question) => {
    const rt = (question.response_type || question.question_type || '').toLowerCase()
    return rt === 'list table' || rt === 'list_table'
  }

  if (loading) {
    return (
      <AppLayout title="Review Sheet">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="Sheet Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sheet not found or you don't have access.</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    )
  }

  const { sheet, sections, subsections, questions, choices, answers, listTableColumns } = data

  // Group questions by their subsection, then by the subsection's section
  const questionsBySection = (() => {
    // Build a map of subsection -> section
    const subsectionToSection = new Map<string, Section>()
    subsections.forEach(sub => {
      const section = sections.find(s => s.id === sub.section_id)
      if (section) subsectionToSection.set(sub.id, section)
    })
    
    // Group questions by section (via subsection)
    const sectionMap = new Map<string, { section: Section, questions: Question[] }>()
    
    questions.forEach(q => {
      // Try subsection_id first (new schema), then parent_subsection_id (old schema)
      const subId = (q as any).subsection_id || q.parent_subsection_id
      if (!subId) return
      
      const section = subsectionToSection.get(subId)
      if (!section) return
      
      if (!sectionMap.has(section.id)) {
        sectionMap.set(section.id, { section, questions: [] })
      }
      sectionMap.get(section.id)!.questions.push(q)
    })
    
    // Also check for direct section assignment (old schema)
    questions.forEach(q => {
      if (q.parent_section_id && !sectionMap.has(q.parent_section_id)) {
        const section = sections.find(s => s.id === q.parent_section_id)
        if (section) {
          if (!sectionMap.has(section.id)) {
            sectionMap.set(section.id, { section, questions: [] })
          }
          sectionMap.get(section.id)!.questions.push(q)
        }
      }
    })
    
    return Array.from(sectionMap.values())
      .filter(({ questions: qs }) => qs.length > 0)
      .sort((a, b) => (a.section.order_number || 0) - (b.section.order_number || 0))
      .map(({ section, questions: qs }) => ({
        section,
        subsections: [] as { subsection: Subsection, questions: Question[] }[],
        directQuestions: qs
      }))
  })()

  return (
    <AppLayout title={`Review: ${sheet.name}`}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Review: {sheet.name}</h1>
              <Badge className="bg-blue-100 text-blue-800">Submitted for Review</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Review the supplier's responses and approve or request revisions
            </p>
          </div>
        </div>

        {/* Review summary */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Review Progress</p>
                <p className="text-sm text-muted-foreground">
                  {unresolvedFlagCount} answers flagged for revision
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRequestRevision}
                  disabled={saving || unresolvedFlagCount === 0}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Revision ({unresolvedFlagCount})
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={saving || unresolvedFlagCount > 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall observations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" />
              Overall Comments (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add any overall comments about this submission..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Questions review */}
        <div className="space-y-4">
          {questionsBySection.map(({ section, subsections: subs, directQuestions }) => (
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
                    {section.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {directQuestions.length + subs.reduce((acc, s) => acc + s.questions.length, 0)} questions
                  </Badge>
                </div>
              </CardHeader>

              {expandedSections.has(section.id) && (
                <CardContent className="space-y-6">
                  {directQuestions.map((question, idx) => {
                    const answer = answers.find(a => a.question_id === question.id)
                    const isFlagged = isQuestionFlagged(question.id)

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border ${isFlagged ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-muted'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium">
                              {idx + 1}. {question.content || question.name}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            <div className="mt-2 p-3 bg-muted/50 rounded-md">
                              {isListTable(question) ? (
                                renderListTable(question)
                              ) : (
                                <p className="text-sm">{getAnswerDisplay(question, answer)}</p>
                              )}
                            </div>
                            {isFlagged && (
                              <div className="mt-3 space-y-2 border-l-2 border-amber-300 pl-3">
                                <p className="text-xs font-medium text-amber-700">Revision History:</p>
                                {(flaggedAnswers.get(question.id) || []).map((round, ridx) => (
                                  <div key={ridx} className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Flag className="h-3 w-3 text-amber-600" />
                                      <span className="font-medium text-amber-800">Flag {ridx + 1}:</span>
                                      <span className="text-gray-600">{round.reason}</span>
                                    </div>
                                    {round.response && (
                                      <div className="ml-5 p-2 bg-blue-50 rounded text-blue-800">
                                        <span className="font-medium">Supplier:</span> {round.response}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnflag(question.id)}
                                  className="text-xs h-6 text-amber-600"
                                >
                                  Approve answer
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {!isFlagged && showFlagInput !== question.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFlagInput(question.id)}
                                className="text-amber-600"
                              >
                                <Flag className="h-4 w-4 mr-1" />
                                Flag
                              </Button>
                            )}
                          </div>
                        </div>

                        {showFlagInput === question.id && (
                          <div className="mt-3 flex gap-2">
                            <Input
                              placeholder="Enter reason for flagging..."
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleFlagAnswer(question.id)}>
                              Add Flag
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowFlagInput(null)
                                setFlagReason('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Subsections */}
                  {subs.map(({ subsection, questions: subQuestions }) => (
                    <div key={subsection.id}>
                      <h4 className="font-medium text-muted-foreground mb-4">{subsection.name}</h4>
                      <div className="space-y-4 pl-4 border-l-2 border-muted">
                        {subQuestions.map((question, idx) => {
                          const answer = answers.find(a => a.question_id === question.id)
                          const isFlagged = isQuestionFlagged(question.id)

                          return (
                            <div
                              key={question.id}
                              className={`p-4 rounded-lg border ${isFlagged ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-muted'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {idx + 1}. {question.content || question.name}
                                  </p>
                                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                    {isListTable(question) ? (
                                      renderListTable(question)
                                    ) : (
                                      <p className="text-sm">{getAnswerDisplay(question, answer)}</p>
                                    )}
                                  </div>
                                  {isFlagged && (
                                    <div className="mt-3 space-y-2 border-l-2 border-amber-300 pl-3">
                                      <p className="text-xs font-medium text-amber-700">Revision History:</p>
                                      {(flaggedAnswers.get(question.id) || []).map((round, ridx) => (
                                        <div key={ridx} className="text-sm space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Flag className="h-3 w-3 text-amber-600" />
                                            <span className="font-medium text-amber-800">Flag {ridx + 1}:</span>
                                            <span className="text-gray-600">{round.reason}</span>
                                          </div>
                                          {round.response && (
                                            <div className="ml-5 p-2 bg-blue-50 rounded text-blue-800">
                                              <span className="font-medium">Supplier:</span> {round.response}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnflag(question.id)}
                                        className="text-xs h-6 text-amber-600"
                                      >
                                        Approve answer
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {!isFlagged && showFlagInput !== question.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowFlagInput(question.id)}
                                      className="text-amber-600"
                                    >
                                      <Flag className="h-4 w-4 mr-1" />
                                      Flag
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {showFlagInput === question.id && (
                                <div className="mt-3 flex gap-2">
                                  <Input
                                    placeholder="Enter reason for flagging..."
                                    value={flagReason}
                                    onChange={(e) => setFlagReason(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button size="sm" onClick={() => handleFlagAnswer(question.id)}>
                                    Add Flag
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setShowFlagInput(null)
                                      setFlagReason('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
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

        {/* Bottom action bar */}
        <Card className="sticky bottom-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {unresolvedFlagCount > 0
                  ? `${unresolvedFlagCount} answer(s) flagged - click "Request Revision" to send back to supplier`
                  : 'No issues found - click "Approve" to complete the review'}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRequestRevision}
                  disabled={saving || unresolvedFlagCount === 0}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                  Request Revision
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={saving || unresolvedFlagCount > 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
