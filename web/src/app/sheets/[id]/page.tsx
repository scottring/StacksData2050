'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  FileText,
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
import { createClient } from '@/lib/supabase/client'
import { AnswerRejection, SheetObservations } from '@/components/sheets/answer-rejection-comment'
import { QuestionItem } from '@/components/sheets/question-item'

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
  dependent_no_show: boolean | null
  section_sort_number: number | null
  section_name_sort: string | null
  list_table_id: string | null
}

interface Choice {
  id: string
  content: string | null
  parent_question_id: string | null
  order_number: number | null
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
  clarification: string | null
}

interface SheetStatusRecord {
  id: string
  sheet_id: string | null
  status: string | null
  observations: string | null
  created_at: string | null
}

interface Sheet {
  id: string
  name: string
  new_status: string | null
  company_id: string | null
  assigned_to_company_id: string | null
  modified_at: string | null
}

interface Company {
  id: string
  name: string | null
  location_text: string | null
}

interface User {
  id: string
  full_name: string | null
  email: string | null
  phone_text: string | null
}

// Maps dependent question ID to parent question ID
type ParentQuestionMap = Map<string, string>

interface ListTableColumn {
  id: string
  name: string | null
  order_number: number | null
  parent_table_id: string | null
  response_type: string | null
  choice_options: string[] | null
}

interface SheetData {
  sheet: Sheet
  company: Company | null
  contactUser: User | null
  sections: Section[]
  subsections: Subsection[]
  questions: Question[]
  choices: Choice[]
  answers: Answer[]
  rejections: AnswerRejection[]
  sheetStatus: SheetStatusRecord | null
  parentQuestionMap: ParentQuestionMap
  listTableColumns: ListTableColumn[]
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
    default:
      return (
        <Badge variant="outline">
          {status || 'Draft'}
        </Badge>
      )
  }
}

export default function SheetPage() {
  const params = useParams()
  const router = useRouter()
  const sheetId = params.id as string

  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [localAnswers, setLocalAnswers] = useState<Map<string, any>>(new Map())
  const pendingChangesRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    async function fetchSheetData() {
      const supabase = createClient()

      // Fetch sheet
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

      // Fetch company and contact information
      let company = null
      let contactUser = null
      if (sheet.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, location_text')
          .eq('id', sheet.company_id)
          .single()
        company = companyData
      }

      // Fetch contact user (creator of the sheet)
      if (sheet.created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email, phone_text')
          .eq('id', sheet.created_by)
          .single()
        contactUser = userData
      }

      // Fetch sections
      const { data: sections } = await supabase
        .from('sections')
        .select('*')
        .order('order_number')

      // Fetch subsections
      const { data: subsections } = await supabase
        .from('subsections')
        .select('*')
        .order('order_number')

      // Fetch questions
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .order('order_number')

      // Fetch choices
      const { data: choices } = await supabase
        .from('choices')
        .select('*')
        .order('order_number')

      // Fetch list table columns for list table questions
      const { data: listTableColumns } = await supabase
        .from('list_table_columns')
        .select('*')
        .order('order_number')

      // Fetch existing answers for this sheet
      const { data: allAnswers } = await supabase
        .from('answers')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('modified_at', { ascending: false })

      // Build a map of question types for deduplication
      const questionTypeMap = new Map()
      questions?.forEach(q => {
        questionTypeMap.set(q.id, q.question_type)
      })

      // Deduplicate answers by keeping only most recent version
      // For list tables: find the most recent created_at across ALL rows for the question,
      // then only keep rows that match that timestamp
      const questionLatestCreated = new Map() // questionId -> latest created_at (for list tables)
      const questionLatestModified = new Map() // questionId -> latest modified_at (for single answers)
      const deduplicatedAnswersMap = new Map()

      // First pass: find the latest timestamps for each question
      allAnswers?.forEach(answer => {
        const questionId = answer.parent_question_id
        if (!questionId) return

        const questionType = questionTypeMap.get(questionId)
        const isListTable = questionType === 'List table'

        if (isListTable && answer.list_table_row_id) {
          // For list tables, find the most recent created_at across all rows
          const currentLatest = questionLatestCreated.get(questionId)
          if (!currentLatest || new Date(answer.created_at) > new Date(currentLatest)) {
            questionLatestCreated.set(questionId, answer.created_at)
          }
        } else {
          // For single-answer questions, track latest modified_at
          const currentLatest = questionLatestModified.get(questionId)
          if (!currentLatest || new Date(answer.modified_at) > new Date(currentLatest)) {
            questionLatestModified.set(questionId, answer.modified_at)
          }
        }
      })

      // Second pass: keep only the most recent answers
      allAnswers?.forEach(answer => {
        const questionId = answer.parent_question_id
        if (!questionId) return

        const questionType = questionTypeMap.get(questionId)
        const isListTable = questionType === 'List table'

        if (isListTable && answer.list_table_row_id) {
          // For list tables, keep only answers matching the latest created_at
          const latestCreated = questionLatestCreated.get(questionId)

          // Debug logging for the specific question
          if (questionId === '55eeea30-92d0-492e-aa44-37819705fbb0') {
            console.log(`Comparing: answer.created_at="${answer.created_at}" vs latestCreated="${latestCreated}" - Match: ${answer.created_at === latestCreated}`)
          }

          if (answer.created_at === latestCreated) {
            const key = `${questionId}_${answer.id}`
            deduplicatedAnswersMap.set(key, answer)
          }
        } else {
          // For single-answer questions, keep only the most recent
          const latestModified = questionLatestModified.get(questionId)
          const key = questionId
          if (!deduplicatedAnswersMap.has(key) && answer.modified_at === latestModified) {
            deduplicatedAnswersMap.set(key, answer)
          }
        }
      })

      const answers = Array.from(deduplicatedAnswersMap.values())

      // Debug: log deduplication results for the specific question
      const biocidesAnswers = answers.filter(a => a.parent_question_id === '55eeea30-92d0-492e-aa44-37819705fbb0')
      if (biocidesAnswers.length > 0) {
        console.log(`=== DEDUPLICATION RESULTS ===`)
        console.log(`Total answers after deduplication for biocides question: ${biocidesAnswers.length}`)
        console.log(`Unique row IDs: ${[...new Set(biocidesAnswers.map(a => a.list_table_row_id))].length}`)
      }

      // Fetch tags associated with this sheet
      const { data: sheetTags } = await supabase
        .from('sheet_tags')
        .select('tag_id')
        .eq('sheet_id', sheetId)

      // If sheet has tags, filter questions to only those with matching tags OR those with existing answers
      let filteredQuestions = questions || []
      if (sheetTags && sheetTags.length > 0) {
        const tagIds = sheetTags.map(st => st.tag_id)

        // Fetch question IDs that have any of these tags
        const { data: questionTags } = await supabase
          .from('question_tags')
          .select('question_id')
          .in('tag_id', tagIds)

        // Get question IDs that have existing answers for this sheet
        const answeredQuestionIds = new Set(
          (answers || [])
            .filter(a => a.parent_question_id)
            .map(a => a.parent_question_id)
        )

        console.log('Debug - Total questions:', questions?.length)
        console.log('Debug - Sheet tags:', sheetTags?.length)
        console.log('Debug - Question tags found:', questionTags?.length)
        console.log('Debug - Answered question IDs:', answeredQuestionIds.size)

        if (questionTags && questionTags.length > 0) {
          const relevantQuestionIds = new Set(questionTags.map(qt => qt.question_id))
          // Include questions that either have the tag OR have existing answers
          filteredQuestions = (questions || []).filter(q =>
            relevantQuestionIds.has(q.id) || answeredQuestionIds.has(q.id)
          )
          console.log('Debug - Filtered questions (with tag OR answer):', filteredQuestions.length)
        } else if (answeredQuestionIds.size > 0) {
          // If no questions have tags, at least show questions with answers
          filteredQuestions = (questions || []).filter(q => answeredQuestionIds.has(q.id))
          console.log('Debug - Filtered questions (answers only):', filteredQuestions.length)
        }
      }

      // Fetch answer rejections for this sheet's answers
      const answerIds = (answers || []).map(a => a.id)
      let rejections: AnswerRejection[] = []
      if (answerIds.length > 0) {
        const { data: rejectionsData } = await supabase
          .from('answer_rejections')
          .select('*')
          .in('answer_id', answerIds)
          .order('created_at', { ascending: false })

        rejections = (rejectionsData || []) as AnswerRejection[]
      }

      // Fetch sheet status with observations
      const { data: sheetStatusData } = await supabase
        .from('sheet_statuses')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Build parent-child question mapping for branching logic
      // Dependent questions (dependent_no_show=true) link to their parent via:
      // same section_sort_number, same section_name_sort, parent.order_number = child.order_number - 1
      const parentQuestionMap: ParentQuestionMap = new Map()

      for (const question of filteredQuestions) {
        if (question.dependent_no_show) {
          // Find parent question
          const parent = filteredQuestions.find(q =>
            !q.dependent_no_show &&
            q.section_sort_number === question.section_sort_number &&
            q.section_name_sort === question.section_name_sort &&
            q.order_number === (question.order_number || 0) - 1
          )
          if (parent) {
            parentQuestionMap.set(question.id, parent.id)
          }
        }
      }

      setData({
        sheet,
        company,
        contactUser,
        sections: sections || [],
        subsections: subsections || [],
        questions: filteredQuestions,
        choices: choices || [],
        answers: answers || [],
        rejections,
        sheetStatus: sheetStatusData as SheetStatusRecord | null,
        parentQuestionMap,
        listTableColumns: listTableColumns || []
      })

      // Initialize expanded sections (expand all by default)
      const sectionIds = (sections || []).map(s => s.id)
      setExpandedSections(new Set([...sectionIds, 'contact-profile']))

      // Initialize local answers from existing answers
      // For list table questions, we need to group all answers by row
      const answerMap = new Map<string, any>()
      const listTableAnswersMap = new Map<string, any[]>()

      ;(answers || []).forEach(a => {
        if (a.parent_question_id) {
          const questionType = questionTypeMap.get(a.parent_question_id)
          const isListTable = questionType === 'List table'

          if (isListTable) {
            // Group list table answers by question
            if (!listTableAnswersMap.has(a.parent_question_id)) {
              listTableAnswersMap.set(a.parent_question_id, [])
            }
            listTableAnswersMap.get(a.parent_question_id)!.push(a)
          } else {
            // Single answer for non-list-table questions
            answerMap.set(a.parent_question_id, a)
          }
        }
      })

      // Build a map of list table columns by their ID
      const listTableColumnsMap = new Map()
      listTableColumns?.forEach(col => {
        listTableColumnsMap.set(col.id, col)
      })

      // Convert list table answers to the format expected by ListTableInput
      // Group by row, then by column to build row data
      listTableAnswersMap.forEach((answers, questionId) => {
        // Debug logging for biocides question
        if (questionId === '55eeea30-92d0-492e-aa44-37819705fbb0') {
          console.log('=== BUILDING LIST TABLE ===')
          console.log('Total answers for question:', answers.length)
          const unitsAnswers = answers.filter(a => {
            const col = a.list_table_column_id ? listTableColumnsMap.get(a.list_table_column_id) : null
            return col?.name === 'Units'
          })
          console.log('Units column answers:', unitsAnswers.map(a => ({
            id: a.id,
            row_id: a.list_table_row_id,
            text_value: a.text_value,
            created_at: a.created_at
          })))
        }

        const rowsMap = new Map<string, any>()
        const columnsMap = new Map() // Collect columns used in this list table

        answers.forEach(answer => {
          const rowId = answer.list_table_row_id
          if (!rowId) return

          if (!rowsMap.has(rowId)) {
            rowsMap.set(rowId, { id: rowId, values: {}, _created_at: answer.created_at })
          }

          const row = rowsMap.get(rowId)
          // Get column info to use column name as key (sanitized)
          const columnId = answer.list_table_column_id
          const column = columnId ? listTableColumnsMap.get(columnId) : null

          // Collect column metadata
          if (column && !columnsMap.has(columnId)) {
            columnsMap.set(columnId, column)
          }

          const columnKey = column?.name
            ? column.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
            : 'col_' + columnId

          // For dropdown/choice answers, we need to get the choice text from the choice_id
          let cellValue = answer.text_value || answer.number_value || answer.text_area_value

          // If we have a choice_id but no text_value, look up the choice text
          if (answer.choice_id && !cellValue) {
            const choice = choices?.find(c => c.id === answer.choice_id)
            cellValue = choice?.content || ''
          }

          row.values[columnKey] = cellValue
        })

        // Sort rows by creation time and create a synthetic answer with JSON data
        const sortedRows = Array.from(rowsMap.values()).sort((a, b) =>
          new Date(a._created_at).getTime() - new Date(b._created_at).getTime()
        )

        // Clean up the _created_at helper field
        sortedRows.forEach(row => delete row._created_at)

        // Debug logging for this specific question
        if (questionId === '55eeea30-92d0-492e-aa44-37819705fbb0') {
          console.log('=== LIST TABLE DEBUG ===')
          console.log('Question ID:', questionId)
          console.log('Sorted rows:', JSON.stringify(sortedRows, null, 2))
          console.log('Number of rows:', sortedRows.length)
        }

        // Build column definitions from collected columns
        const tableColumns = Array.from(columnsMap.values())
          .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
          .map(col => ({
            key: col.name ? col.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '') : `col_${col.id}`,
            label: col.name || 'Column',
            choices: col.choice_options || undefined
          }))

        answerMap.set(questionId, {
          id: `list-table-${questionId}`,
          parent_question_id: questionId,
          text_value: JSON.stringify(sortedRows),
          list_table_columns: tableColumns, // Include column definitions
          list_table_answers: answers // Keep original answers for reference
        })
      })

      setLocalAnswers(answerMap)

      // Expand first section by default
      if (sections && sections.length > 0) {
        setExpandedSections(new Set([sections[0].id]))
      }

      setLoading(false)
    }

    if (sheetId) {
      fetchSheetData()
    }
  }, [sheetId])

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!data || pendingChangesRef.current.size === 0) return

    setSaveStatus('saving')
    const supabase = createClient()

    try {
      const changesToSave = new Map(pendingChangesRef.current)
      pendingChangesRef.current.clear()

      for (const [questionId, answerData] of changesToSave) {
        const existingAnswer = data.answers.find(a => a.parent_question_id === questionId)

        if (existingAnswer) {
          await supabase
            .from('answers')
            .update({
              ...answerData,
              modified_at: new Date().toISOString()
            })
            .eq('id', existingAnswer.id)
        } else {
          const { data: newAnswer } = await supabase
            .from('answers')
            .insert({
              ...answerData,
              parent_question_id: questionId,
              sheet_id: sheetId
            })
            .select()
            .single()

          // Update local data with new answer
          if (newAnswer) {
            setData(prev => prev ? {
              ...prev,
              answers: [...prev.answers, newAnswer]
            } : null)
          }
        }
      }

      // Update sheet status to in_progress if it was pending
      if (data.sheet.new_status === 'pending') {
        await supabase
          .from('sheets')
          .update({ new_status: 'in_progress', modified_at: new Date().toISOString() })
          .eq('id', sheetId)
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Auto-save error:', error)
      setSaveStatus('error')
    }
  }, [data, sheetId])

  // Debounced auto-save (1.5s delay)
  const debouncedAutoSave = useDebouncedCallback(performAutoSave, 1500)

  const handleAnswerChange = (questionId: string, value: any, type: string) => {
    setLocalAnswers(prev => {
      const next = new Map(prev)
      const existing = next.get(questionId) || {}

      const updated = { ...existing }

      switch (type) {
        case 'boolean':
          updated.boolean_value = value
          break
        case 'choice':
          updated.choice_id = value
          break
        case 'number':
          updated.number_value = value
          break
        case 'date':
          updated.date_value = value
          break
        case 'text_area':
          updated.text_area_value = value
          break
        case 'text':
        default:
          updated.text_value = value
          break
      }

      next.set(questionId, updated)

      // Track pending changes for auto-save
      pendingChangesRef.current.set(questionId, updated)

      return next
    })

    // Trigger debounced auto-save
    debouncedAutoSave()
  }

  const handleClarificationChange = (questionId: string, clarification: string) => {
    setLocalAnswers(prev => {
      const next = new Map(prev)
      const existing = next.get(questionId) || {}

      const updated = { ...existing, clarification }

      next.set(questionId, updated)

      // Track pending changes for auto-save
      pendingChangesRef.current.set(questionId, updated)

      return next
    })

    // Trigger debounced auto-save
    debouncedAutoSave()
  }

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

  const handleSave = async () => {
    if (!data) return

    setSaving(true)
    const supabase = createClient()

    try {
      // For each local answer, upsert to database
      for (const [questionId, answerData] of localAnswers) {
        const existingAnswer = data.answers.find(a => a.parent_question_id === questionId)

        if (existingAnswer) {
          // Update existing
          await supabase
            .from('answers')
            .update({
              ...answerData,
              modified_at: new Date().toISOString()
            })
            .eq('id', existingAnswer.id)
        } else {
          // Insert new
          await supabase
            .from('answers')
            .insert({
              ...answerData,
              parent_question_id: questionId,
              sheet_id: sheetId
            })
        }
      }

      // Update sheet status to in_progress if it was pending
      if (data.sheet.new_status === 'pending') {
        await supabase
          .from('sheets')
          .update({ new_status: 'in_progress', modified_at: new Date().toISOString() })
          .eq('id', sheetId)
      }

    } catch (error) {
      console.error('Error saving answers:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!data) return

    // Check if all required questions are answered
    const requiredQuestions = data.questions.filter(q => q.required)
    const unansweredRequired = requiredQuestions.filter(q => !localAnswers.has(q.id))

    if (unansweredRequired.length > 0) {
      alert(`Please answer all required questions before submitting. ${unansweredRequired.length} questions remaining.`)
      return
    }

    if (!confirm('Are you sure you want to submit this questionnaire for review? You will not be able to make changes until the reviewer responds.')) {
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Save any pending changes first
      await handleSave()

      // Update sheet status to submitted
      await supabase
        .from('sheets')
        .update({
          new_status: 'submitted',
          modified_at: new Date().toISOString()
        })
        .eq('id', sheetId)

      // Update local state
      setData(prev => prev ? {
        ...prev,
        sheet: { ...prev.sheet, new_status: 'submitted' }
      } : null)

      alert('Questionnaire submitted successfully!')
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Check if sheet can be submitted (all required answered)
  const canSubmit = data ? data.questions
    .filter(q => q.required)
    .every(q => localAnswers.has(q.id)) : false

  // Check if sheet is read-only (already submitted/approved)
  const isReadOnly = data?.sheet.new_status === 'submitted' || data?.sheet.new_status === 'approved'

  if (loading) {
    return (
      <AppLayout title="Product Sheet">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading questionnaire...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout title="Sheet Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Product sheet not found</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </AppLayout>
    )
  }

  const { sheet, company, contactUser, sections, subsections, questions, choices, answers, rejections, sheetStatus, parentQuestionMap, listTableColumns } = data

  // Helper to get rejection for a specific question (via its answer)
  const getRejectionForQuestion = (questionId: string): AnswerRejection | undefined => {
    const answer = answers.find(a => a.parent_question_id === questionId)
    if (!answer) return undefined
    return rejections.find(r => r.answer_id === answer.id)
  }

  // Branching logic: Check if a dependent question should be visible
  // A dependent question shows only when its parent question is answered "Yes"
  const isQuestionVisible = (question: Question): boolean => {
    // Non-dependent questions are always visible
    if (!question.dependent_no_show) return true

    // Find parent question
    const parentId = parentQuestionMap.get(question.id)
    if (!parentId) return true // No parent found, show by default

    // Check if parent has been answered with "Yes"
    const parentAnswer = localAnswers.get(parentId)
    if (!parentAnswer) return false // Parent not answered, hide dependent

    // For boolean/yes_no questions, check boolean_value
    const parentQuestion = questions.find(q => q.id === parentId)
    if (parentQuestion?.question_type === 'yes_no' || parentQuestion?.question_type === 'boolean') {
      return parentAnswer.boolean_value === true
    }

    // For choice-based questions, check if selected choice content starts with "Yes"
    if (parentAnswer.choice_id) {
      const selectedChoice = choices.find(c => c.id === parentAnswer.choice_id)
      return selectedChoice?.content?.toLowerCase().startsWith('yes') ?? false
    }

    return false
  }

  // Check if sheet is in a flagged/revision state
  const needsRevision = sheet.new_status === 'flagged' || sheet.new_status === 'revision' || sheet.new_status === 'rejected'

  // Group questions by section (only visible questions)
  // Sort sections, subsections, and questions by order_number for proper hierarchy
  // Put items with null order_number at the END, not the beginning
  const sortByOrderNumber = (a: { order_number: number | null }, b: { order_number: number | null }) => {
    if (a.order_number === null && b.order_number === null) return 0
    if (a.order_number === null) return 1  // null goes to end
    if (b.order_number === null) return -1 // null goes to end
    return a.order_number - b.order_number
  }

  const sortedSections = [...sections].sort(sortByOrderNumber)
  const sortedSubsections = [...subsections].sort(sortByOrderNumber)
  const sortedQuestions = [...questions].sort(sortByOrderNumber)

  const questionsBySection = sortedSections.map((section, sectionIdx) => {
    const sectionNumber = sectionIdx + 1
    const sectionSubsections = sortedSubsections.filter(s => s.section_id === section.id)
    const sectionQuestions = sortedQuestions.filter(q => q.parent_section_id === section.id && isQuestionVisible(q))

    // Map all subsections with their correct numbering, don't filter by question count yet
    const allSubsectionsWithNumbers = sectionSubsections.map((sub, subIdx) => ({
      subsection: sub,
      subsectionNumber: subIdx + 1,
      questions: sortedQuestions.filter(q => q.parent_subsection_id === sub.id && isQuestionVisible(q))
    }))

    const result = {
      section,
      sectionNumber,
      subsections: allSubsectionsWithNumbers.filter(sub => sub.questions.length > 0), // Only show subsections with questions
      directQuestions: sectionQuestions.filter(q => !q.parent_subsection_id)
    }

    return result
  })

  // Questions without a section (only visible ones)
  const unsectionedQuestions = questions.filter(q => !q.parent_section_id && !q.parent_subsection_id && isQuestionVisible(q))

  return (
    <AppLayout title={sheet.name}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{sheet.name}</h1>
              {getStatusBadge(sheet.new_status)}
            </div>
            {sheet.modified_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {new Date(sheet.modified_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save status indicator */}
            {!isReadOnly && saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
            {!isReadOnly && saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
            {!isReadOnly && saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Save failed
              </span>
            )}
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={saving || saveStatus === 'saving'} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Sheet-level observations (when flagged/revision) */}
        {needsRevision && sheetStatus?.observations && (
          <SheetObservations
            observations={sheetStatus.observations}
            createdAt={sheetStatus.created_at || undefined}
          />
        )}

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

        {/* Sections and questions */}
        <div className="space-y-4">
          {questionsBySection
            .filter(({ subsections, directQuestions }) =>
              subsections.length > 0 || directQuestions.length > 0
            )
            .map(({ section, sectionNumber, subsections: subs, directQuestions }) => (
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
                    {directQuestions.length + subs.reduce((acc, s) => acc + s.questions.length, 0)} questions
                  </Badge>
                </div>
                {section.help && (
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    {section.help}
                  </p>
                )}
              </CardHeader>

              {expandedSections.has(section.id) && (
                <CardContent className="space-y-6">
                  {/* Direct questions (no subsection) */}
                  {directQuestions.map((question, idx) => (
                    <div key={question.id} className="group">
                      <QuestionItem
                        question={question}
                        choices={choices}
                        answer={localAnswers.get(question.id)}
                        onAnswerChange={handleAnswerChange}
                        onClarificationChange={handleClarificationChange}
                        disabled={isReadOnly}
                        sheetId={sheetId}
                        rejection={getRejectionForQuestion(question.id)}
                        questionNumber={`${sectionNumber}.${idx + 1}`}
                        listTableColumns={listTableColumns}
                      />
                    </div>
                  ))}

                  {/* Subsections */}
                  {subs.map(({ subsection, subsectionNumber, questions: subQuestions }) => (
                    <div key={subsection.id}>
                      <h4 className="font-medium text-muted-foreground mb-2">
                        {sectionNumber}.{subsectionNumber} {subQuestions[0]?.subsection_name_sort || subsection.name}
                      </h4>
                      {subsection.content && (
                        <p className="text-sm text-muted-foreground mb-4 pl-4">
                          {subsection.content}
                        </p>
                      )}
                      <div className="space-y-4 pl-4 border-l-2 border-muted">
                        {subQuestions.map((question, idx) => {
                          // Check if this is a dependent question (immediately follows parent and has dependent_no_show)
                          const isDependent = idx > 0 && question.dependent_no_show
                          const parentIdx = idx - 1

                          // For dependent questions, use parent numbering + .1
                          // For independent questions, increment the main counter
                          let questionNumber
                          if (isDependent) {
                            // Count how many dependent questions precede this one for the same parent
                            let dependentCount = 1
                            for (let i = idx - 1; i >= 0 && subQuestions[i].dependent_no_show; i--) {
                              if (i > 0) dependentCount++
                            }
                            questionNumber = `${sectionNumber}.${subsectionNumber}.${parentIdx + 1}.${dependentCount}`
                          } else {
                            // Count only non-dependent questions up to this point
                            const independentCount = subQuestions.slice(0, idx + 1).filter(q => !q.dependent_no_show).length
                            questionNumber = `${sectionNumber}.${subsectionNumber}.${independentCount}`
                          }

                          return (
                            <div key={question.id} className="group">
                              <QuestionItem
                                question={question}
                                choices={choices}
                                answer={localAnswers.get(question.id)}
                                onAnswerChange={handleAnswerChange}
                                onClarificationChange={handleClarificationChange}
                                disabled={isReadOnly}
                                sheetId={sheetId}
                                rejection={getRejectionForQuestion(question.id)}
                                questionNumber={questionNumber}
                                listTableColumns={listTableColumns}
                              />
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

          {/* Unsectioned questions */}
          {unsectionedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {unsectionedQuestions.map((question, idx) => (
                  <div key={question.id} className="group">
                    <QuestionItem
                      question={question}
                      choices={choices}
                      answer={localAnswers.get(question.id)}
                      onAnswerChange={handleAnswerChange}
                      onClarificationChange={handleClarificationChange}
                      disabled={isReadOnly}
                      sheetId={sheetId}
                      rejection={getRejectionForQuestion(question.id)}
                      questionNumber={idx + 1}
                      listTableColumns={listTableColumns}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pb-8">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <div className="flex gap-3">
            {!isReadOnly && (
              <>
                <Button variant="outline" onClick={handleSave} disabled={saving || saveStatus === 'saving'}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <SendHorizontal className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </>
            )}
            {isReadOnly && (
              <Badge className="bg-blue-100 text-blue-800 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submitted - Awaiting Review
              </Badge>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
