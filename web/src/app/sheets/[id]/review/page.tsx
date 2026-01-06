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
  required: boolean | null
  order_number: number | null
  parent_section_id: string | null
  parent_subsection_id: string | null
  clarification: string | null
}

interface Choice {
  id: string
  content: string | null
  parent_question_id: string | null
}

interface Answer {
  id: string
  parent_question_id: string | null
  text_value: string | null
  text_area_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  date_value: string | null
  choice_id: string | null
  sheet_id: string | null
}

interface AnswerRejection {
  id: string
  answer_id: string
  reason: string
  rejected_by: string | null
  created_at: string
}

interface Sheet {
  id: string
  name: string
  new_status: string | null
  company_id: string | null
  assigned_to_company_id: string | null
  modified_at: string | null
}

interface ReviewData {
  sheet: Sheet
  sections: Section[]
  subsections: Subsection[]
  questions: Question[]
  choices: Choice[]
  answers: Answer[]
  existingRejections: AnswerRejection[]
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
  const [flaggedAnswers, setFlaggedAnswers] = useState<Map<string, string>>(new Map())
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
        { data: answers }
      ] = await Promise.all([
        supabase.from('sections').select('*').order('order_number'),
        supabase.from('subsections').select('*').order('order_number'),
        supabase.from('questions').select('*').order('order_number'),
        supabase.from('choices').select('*').order('order_number'),
        supabase.from('answers').select('*').eq('sheet_id', sheetId)
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

      // Pre-populate flagged answers from existing rejections
      const flaggedMap = new Map<string, string>()
      existingRejections.forEach(r => {
        const answer = answers?.find(a => a.id === r.answer_id)
        if (answer?.parent_question_id) {
          flaggedMap.set(answer.parent_question_id, r.reason)
        }
      })

      setData({
        sheet,
        sections: sections || [],
        subsections: subsections || [],
        questions: filteredQuestions,
        choices: choices || [],
        answers: answers || [],
        existingRejections
      })
      setFlaggedAnswers(flaggedMap)

      // Expand first section
      if (sections && sections.length > 0) {
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

  const handleFlagAnswer = (questionId: string) => {
    if (flagReason.trim()) {
      setFlaggedAnswers(prev => new Map(prev).set(questionId, flagReason))
      setShowFlagInput(null)
      setFlagReason('')
    }
  }

  const handleUnflag = (questionId: string) => {
    setFlaggedAnswers(prev => {
      const next = new Map(prev)
      next.delete(questionId)
      return next
    })
  }

  const handleApprove = async () => {
    if (!data) return
    setSaving(true)

    const supabase = createClient()

    try {
      // Update sheet status to approved
      await supabase
        .from('sheets')
        .update({ new_status: 'approved', modified_at: new Date().toISOString() })
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
    if (!data || flaggedAnswers.size === 0) return
    setSaving(true)

    const supabase = createClient()

    try {
      // Update sheet status to flagged
      await supabase
        .from('sheets')
        .update({ new_status: 'flagged', modified_at: new Date().toISOString() })
        .eq('id', sheetId)

      // Create sheet_status record with observations
      await supabase
        .from('sheet_statuses')
        .insert({
          sheet_id: sheetId,
          status: 'flagged',
          observations: observations || null,
          completed: false
        })

      // Create answer rejections for flagged answers
      for (const [questionId, reason] of flaggedAnswers) {
        const answer = data.answers.find(a => a.parent_question_id === questionId)
        if (answer) {
          await supabase
            .from('answer_rejections')
            .insert({
              answer_id: answer.id,
              reason
            })
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

    switch (question.question_type) {
      case 'yes_no':
      case 'boolean':
        return answer.boolean_value === true ? 'Yes' : answer.boolean_value === false ? 'No' : 'Not answered'
      case 'number':
        return answer.number_value?.toString() || 'Not answered'
      case 'date':
        return answer.date_value || 'Not answered'
      case 'text_area':
      case 'textarea':
        return answer.text_area_value || 'Not answered'
      case 'dropdown':
      case 'single_choice':
      case 'multiple_choice':
        if (answer.choice_id && data) {
          const choice = data.choices.find(c => c.id === answer.choice_id)
          return choice?.content || 'Selected'
        }
        return 'Not answered'
      default:
        return answer.text_value || 'Not answered'
    }
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

  const { sheet, sections, subsections, questions, choices, answers } = data

  const questionsBySection = sections.map(section => {
    const sectionSubsections = subsections.filter(s => s.section_id === section.id)
    const sectionQuestions = questions.filter(q => q.parent_section_id === section.id)

    return {
      section,
      subsections: sectionSubsections.map(sub => ({
        subsection: sub,
        questions: questions.filter(q => q.parent_subsection_id === sub.id)
      })),
      directQuestions: sectionQuestions.filter(q => !q.parent_subsection_id)
    }
  })

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
                  {flaggedAnswers.size} answers flagged for revision
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRequestRevision}
                  disabled={saving || flaggedAnswers.size === 0}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Revision ({flaggedAnswers.size})
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={saving || flaggedAnswers.size > 0}
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
                    const answer = answers.find(a => a.parent_question_id === question.id)
                    const isFlagged = flaggedAnswers.has(question.id)

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
                              <p className="text-sm">{getAnswerDisplay(question, answer)}</p>
                            </div>
                            {isFlagged && (
                              <div className="mt-2 flex items-center gap-2 text-amber-700">
                                <Flag className="h-4 w-4" />
                                <span className="text-sm">{flaggedAnswers.get(question.id)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnflag(question.id)}
                                  className="text-xs h-6"
                                >
                                  Remove flag
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
                          const answer = answers.find(a => a.parent_question_id === question.id)
                          const isFlagged = flaggedAnswers.has(question.id)

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
                                    <p className="text-sm">{getAnswerDisplay(question, answer)}</p>
                                  </div>
                                  {isFlagged && (
                                    <div className="mt-2 flex items-center gap-2 text-amber-700">
                                      <Flag className="h-4 w-4" />
                                      <span className="text-sm">{flaggedAnswers.get(question.id)}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnflag(question.id)}
                                        className="text-xs h-6"
                                      >
                                        Remove flag
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
                {flaggedAnswers.size > 0
                  ? `${flaggedAnswers.size} answer(s) flagged - click "Request Revision" to send back to supplier`
                  : 'No issues found - click "Approve" to complete the review'}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRequestRevision}
                  disabled={saving || flaggedAnswers.size === 0}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                  Request Revision
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={saving || flaggedAnswers.size > 0}
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
