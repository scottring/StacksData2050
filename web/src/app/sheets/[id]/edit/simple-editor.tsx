'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, Check, Plus, Trash2, SendHorizontal } from 'lucide-react'

interface ViewAnswer {
  id: string
  question_id: string
  question_name: string
  question_content: string | null
  response_type: string
  section_sort_number: number | null
  subsection_sort_number: number | null
  question_order: number | null
  list_table_id?: string | null
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

interface Choice {
  id: string
  content: string | null
  question_id: string | null
}

interface ListTableColumn {
  id: string
  name: string
  order_number: number | null
  question_id: string | null
  response_type: string | null
}

interface BranchingData {
  dependentNoShow: boolean
  
  parentQuestionId: string | null
}

interface SimpleSheetEditorProps {
  sheetId: string
  sheetName: string
  sheetStatus: string | null
  companyName: string
  answers: ViewAnswer[]
  choices: Choice[]
  questionSectionMap: Record<string, { sectionName: string; subsectionName: string }>
  listTableColumns: ListTableColumn[]
  branchingData?: Record<string, BranchingData>
}

// Helper to get the display value from an answer (human-readable)
function getDisplayValue(answer: ViewAnswer): string {
  // Always prefer choice_content (human-readable) over choice_id (UUID)
  if (answer.choice_content) return answer.choice_content
  if (answer.text_value) return answer.text_value
  if (answer.text_area_value) return answer.text_area_value
  if (answer.number_value !== null) return String(answer.number_value)
  if (answer.boolean_value !== null) return answer.boolean_value ? 'Yes' : 'No'
  if (answer.date_value) return answer.date_value
  return ''
}

export function SimpleSheetEditor({
  sheetId,
  sheetName,
  sheetStatus,
  companyName,
  answers,
  choices,
  questionSectionMap,
  listTableColumns,
  branchingData = {},
}: SimpleSheetEditorProps) {
  // Store values by question_id for single-value questions
  // Store by question_id -> row_id -> column_id for list tables
  const [localValues, setLocalValues] = useState<Map<string, any>>(() => {
    const map = new Map()
    answers.forEach(a => {
      if (a.list_table_row_id) {
        // List table answer - store nested
        const key = `${a.question_id}|${a.list_table_row_id}|${a.list_table_column_id}`
        map.set(key, {
          value: getDisplayValue(a),
          answerId: a.id,
          type: a.response_type
        })
      } else {
        // Single value answer
        map.set(a.question_id, {
          value: getDisplayValue(a),
          answerId: a.id,
          type: a.response_type
        })
      }
    })
    return map
  })

  // Track added rows for list tables (questionId -> array of temp row IDs)
  const [addedRows, setAddedRows] = useState<Map<string, string[]>>(new Map())

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Group choices by question
  const choicesByQuestion = useMemo(() => {
    const map = new Map<string, Choice[]>()
    choices.forEach(c => {
      if (c.question_id) {
        if (!map.has(c.question_id)) {
          map.set(c.question_id, [])
        }
        map.get(c.question_id)!.push(c)
      }
    })
    return map
  }, [choices])

  // Group columns by parent_table_id (list_table_id)
  const columnsByQuestionId = useMemo(() => {
    const map = new Map<string, ListTableColumn[]>()
    listTableColumns.forEach(col => {
      if (col.question_id) {
        if (!map.has(col.question_id)) {
          map.set(col.question_id, [])
        }
        map.get(col.question_id)!.push(col)
      }
    })
    // Sort each array by order_number
    map.forEach((cols, key) => {
      cols.sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
    })
    return map
  }, [listTableColumns])

  // Group answers by question
  const questionMap = useMemo(() => {
    const map = new Map<string, {
      question_name: string
      question_content: string | null
      response_type: string
      section_sort_number: number | null
      subsection_sort_number: number | null
      question_order: number | null
      list_table_id: string | null
      answers: ViewAnswer[]
    }>()

    answers.forEach(answer => {
      if (!map.has(answer.question_id)) {
        map.set(answer.question_id, {
          question_name: answer.question_name,
          question_content: answer.question_content,
          response_type: answer.response_type,
          section_sort_number: answer.section_sort_number,
          subsection_sort_number: answer.subsection_sort_number,
          question_order: answer.question_order,
          list_table_id: answer.list_table_id || null,
          answers: []
        })
      }
      map.get(answer.question_id)!.answers.push(answer)
    })

    return map
  }, [answers])

  // Sort questions
  const sortedQuestions = useMemo(() => {
    return Array.from(questionMap.entries()).sort((a, b) => {
      const qa = a[1], qb = b[1]
      if ((qa.section_sort_number || 0) !== (qb.section_sort_number || 0)) {
        return (qa.section_sort_number || 0) - (qb.section_sort_number || 0)
      }
      if ((qa.subsection_sort_number || 0) !== (qb.subsection_sort_number || 0)) {
        return (qa.subsection_sort_number || 0) - (qb.subsection_sort_number || 0)
      }
      return (qa.question_order || 0) - (qb.question_order || 0)
    })
  }, [questionMap])

  // Helper to check if a question should be hidden based on branching logic
  const isQuestionHidden = useMemo(() => {
    return (questionId: string): boolean => {
      const branching = branchingData[questionId]
      if (!branching?.dependentNoShow || !branching?.parentQuestionId) {
        return false
      }
      
      // Get the parent question's current answer
      const parentValue = localValues.get(branching.parentQuestionId)
      if (!parentValue) {
        // No answer yet - show the question (default behavior)
        return false
      }
      
      const answerValue = parentValue.value?.toString().toLowerCase()
      // Hide if parent answered No or no or false
      return answerValue === 'no' || answerValue === 'false' || answerValue === ''
    }
  }, [branchingData, localValues])

  // Filter sortedQuestions to exclude hidden dependent questions
  const visibleQuestions = useMemo(() => {
    return sortedQuestions.filter(([questionId]) => !isQuestionHidden(questionId))
  }, [sortedQuestions, isQuestionHidden])


  // Create lookup for section names based on questions in each section group
  const sectionNames = useMemo(() => {
    const names = new Map<number, string>();
    sortedQuestions.forEach(([questionId, q]) => {
      const sectionNum = q.section_sort_number ?? 0;
      if (!names.has(sectionNum)) {
        const info = questionSectionMap[questionId];
        if (info?.sectionName) {
          names.set(sectionNum, info.sectionName);
        }
      }
    });
    return names;
  }, [sortedQuestions, questionSectionMap]);

  // Create lookup for subsection names
  const subsectionNames = useMemo(() => {
    const names = new Map<string, string>(); // key: "sectionNum-subsectionNum"
    sortedQuestions.forEach(([questionId, q]) => {
      const key = `${q.section_sort_number ?? 0}-${q.subsection_sort_number ?? 0}`;
      if (!names.has(key)) {
        const info = questionSectionMap[questionId];
        if (info?.subsectionName) {
          names.set(key, info.subsectionName);
        }
      }
    });
    return names;
  }, [sortedQuestions, questionSectionMap]);

  const handleValueChange = (questionId: string, value: any, type: string, answerId?: string) => {
    setLocalValues(prev => {
      const next = new Map(prev)
      next.set(questionId, { value, answerId, type })
      return next
    })
    setSaveStatus('idle')
  }

  const handleListTableChange = (
    questionId: string,
    rowId: string,
    columnId: string,
    value: any,
    type: string,
    answerId?: string
  ) => {
    const key = `${questionId}|${rowId}|${columnId}`
    setLocalValues(prev => {
      const next = new Map(prev)
      next.set(key, { value, answerId, type })
      return next
    })
    setSaveStatus('idle')
  }

  const handleAddRow = (questionId: string) => {
    const tempRowId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setAddedRows(prev => {
      const next = new Map(prev)
      const existing = next.get(questionId) || []
      next.set(questionId, [...existing, tempRowId])
      return next
    })
    setSaveStatus('idle')
  }

  const handleDeleteRow = (questionId: string, rowId: string) => {
    // Remove from addedRows if it's a temp row
    if (rowId.startsWith('temp-')) {
      setAddedRows(prev => {
        const next = new Map(prev)
        const existing = next.get(questionId) || []
        next.set(questionId, existing.filter(r => r !== rowId))
        return next
      })
    }
    // Remove values for this row
    setLocalValues(prev => {
      const next = new Map(prev)
      Array.from(next.keys()).forEach(key => {
        if (key.startsWith(`${questionId}|${rowId}|`)) {
          next.delete(key)
        }
      })
      return next
    })
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')

    try {
      const answersToSave: any[] = []

      localValues.forEach((data, key) => {
        if (key.includes('|')) {
          // List table answer
          const [questionId, rowId, columnId] = key.split('|')
          answersToSave.push({
            question_id: questionId,
            answer_id: data.answerId?.startsWith('placeholder-') ? undefined : data.answerId,
            value: data.value,
            type: mapResponseType(data.type),
            list_table_row_id: rowId,  // Send temp- IDs too, server will handle them
            list_table_column_id: columnId,
            is_new_row: rowId.startsWith('temp-'),
          })
        } else {
          // Single value answer
          answersToSave.push({
            question_id: key,
            answer_id: data.answerId?.startsWith('placeholder-') ? undefined : data.answerId,
            value: data.value,
            type: mapResponseType(data.type),
          })
        }
      })

      const response = await fetch('/api/answers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          answers: answersToSave,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setSaveStatus('saved')
      // Clear temp rows after successful save (they now have real IDs)
      setAddedRows(new Map())
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!confirm('Submit this response to the customer? They will be notified to review your answers.')) {
      return
    }
    
    setSubmitting(true)
    try {
      // Save first
      await handleSave()
      
      // Update sheet status to 'submitted'
      const response = await fetch('/api/sheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_id: sheetId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit')
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard?submitted=true'
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function mapResponseType(responseType: string): string {
    const rt = responseType?.toLowerCase() || ''
    if (rt === 'yes/no' || rt === 'boolean') return 'boolean'
    if (rt === 'dropdown' || rt === 'choice') return 'choice'
    if (rt === 'number') return 'number'
    if (rt === 'date') return 'date'
    if (rt === 'text area' || rt === 'textarea') return 'text_area'
    return 'text'
  }

  function renderInput(
    questionId: string,
    responseType: string,
    questionChoices: Choice[],
    currentValue: any,
    answerId?: string,
    choiceContentFallback?: string | null
  ) {
    // Normalize response type to match our cases
    const rawType = responseType?.toLowerCase() || 'text'
    const typeMap = {
      'single text line': 'text',
      'multiple text lines': 'textarea',
      'dropdown': 'choice',
      'select one': 'choice',
      'select one radio': 'choice',
      'select multiple': 'multi-choice',
      'list table': 'list-table',
      'pidsl list': 'list-table',
      'file document': 'file',
      'static/ fixed': 'static',
    }
    const rt = (typeMap as Record<string, string>)[rawType] || rawType

    // Check if this is a Yes/No question based on:
    // 1. Response type explicitly says yes/no or boolean
    // 2. The choice content is "Yes" or "No"
    // 3. The current value is "Yes" or "No" (string)
    const isYesNo = rt === 'yes/no' || rt === 'boolean' ||
      (choiceContentFallback && ['yes', 'no'].includes(choiceContentFallback.toLowerCase().trim())) ||
      (typeof currentValue === 'string' && ['yes', 'no'].includes(currentValue.toLowerCase().trim()))

    // Yes/No questions - render as Yes/No dropdown
    if (isYesNo) {
      // Convert current value to 'yes'/'no' for the Select
      let selectValue = ''
      if (typeof currentValue === 'boolean') {
        selectValue = currentValue ? 'yes' : 'no'
      } else if (typeof currentValue === 'string') {
        const lower = currentValue.toLowerCase().trim()
        if (lower === 'yes') selectValue = 'yes'
        else if (lower === 'no') selectValue = 'no'
      }

      return (
        <Select
          value={selectValue}
          onValueChange={(v) => handleValueChange(questionId, v === 'yes', 'boolean', answerId)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    // Dropdown / Choice - for non-Yes/No choices
    if (rt === 'dropdown' || rt === 'choice' || questionChoices.length > 0) {
      // If no choices loaded, show the current value in a text input (read-only display)
      if (questionChoices.length === 0) {
        const displayVal = choiceContentFallback || currentValue || ''
        return (
          <Input
            value={displayVal}
            disabled
            className="bg-muted"
            placeholder="Choice value"
          />
        )
      }
      // Find the choice ID that matches the current display value
      const matchingChoice = questionChoices.find(c =>
        c.content?.toLowerCase() === String(currentValue).toLowerCase()
      )
      const selectValue = matchingChoice?.id || currentValue || ''

      return (
        <Select
          value={selectValue}
          onValueChange={(v) => handleValueChange(questionId, v, 'choice', answerId)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {questionChoices.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.content || 'Unnamed option'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Number
    if (rt === 'number') {
      return (
        <Input
          type="number"
          value={currentValue ?? ''}
          onChange={(e) => handleValueChange(questionId, e.target.value ? Number(e.target.value) : null, 'number', answerId)}
          placeholder="Enter a number..."
        />
      )
    }

    // Date
    if (rt === 'date') {
      return (
        <Input
          type="date"
          value={currentValue || ''}
          onChange={(e) => handleValueChange(questionId, e.target.value, 'date', answerId)}
        />
      )
    }

    // Text Area
    if (rt === 'text area' || rt === 'textarea') {
      return (
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={currentValue || ''}
          onChange={(e) => handleValueChange(questionId, e.target.value, 'text_area', answerId)}
          placeholder="Enter your answer..."
          rows={3}
        />
      )
    }

    // Default: Text
    return (
      <Input
        value={currentValue || ''}
        onChange={(e) => handleValueChange(questionId, e.target.value, 'text', answerId)}
        placeholder="Enter your answer..."
      />
    )
  }

  function renderListTable(questionId: string, questionAnswers: ViewAnswer[]) {
    // Get columns from the listTableColumns prop
    const tableColumns = columnsByQuestionId.get(questionId) || []
    
    // Group existing answers by row, then by column
    const rows = new Map<string, Map<string, ViewAnswer>>()
    const columnsFromAnswers = new Map<string, { name: string; order: number; id: string }>()

    questionAnswers.forEach(a => {
      if (!a.list_table_row_id || !a.list_table_column_id) return

      if (!rows.has(a.list_table_row_id)) {
        rows.set(a.list_table_row_id, new Map())
      }
      rows.get(a.list_table_row_id)!.set(a.list_table_column_id, a)

      if (!columnsFromAnswers.has(a.list_table_column_id)) {
        columnsFromAnswers.set(a.list_table_column_id, {
          name: a.list_table_column_name || 'Column',
          order: a.list_table_column_order || 0,
          id: a.list_table_column_id
        })
      }
    })

    // Use columns from the database if available, otherwise fall back to answers
    const sortedColumns = tableColumns.length > 0 
      ? tableColumns.map(c => ({ id: c.id, name: c.name, order: c.order_number || 0 }))
      : Array.from(columnsFromAnswers.entries())
          .sort((a, b) => a[1].order - b[1].order)
          .map(([id, col]) => ({ id, name: col.name, order: col.order }))

    // Get added rows for this question
    const tempRows = addedRows.get(questionId) || []

    // No columns at all - can't show a table
    if (sortedColumns.length === 0) {
      return (
        <div className="text-muted-foreground italic">
          <p>No columns defined for this table</p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-muted">
              <tr>
                {sortedColumns.map((col) => (
                  <th key={col.id} className="border px-3 py-2 text-left font-medium">
                    {col.name}
                  </th>
                ))}
                <th className="border px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {/* Existing rows */}
              {Array.from(rows.entries()).map(([rowId, rowData]) => (
                <tr key={rowId} className="hover:bg-muted/50">
                  {sortedColumns.map((col) => {
                    const answer = rowData.get(col.id)
                    const key = `${questionId}|${rowId}|${col.id}`
                    const localData = localValues.get(key)
                    const displayValue = localData?.value ?? (answer ? getDisplayValue(answer) : '')

                    return (
                      <td key={col.id} className="border px-2 py-1">
                        <Input
                          value={displayValue}
                          onChange={(e) => handleListTableChange(
                            questionId,
                            rowId,
                            col.id,
                            e.target.value,
                            'text',
                            answer?.id
                          )}
                          className="h-8 text-sm"
                        />
                      </td>
                    )
                  })}
                  <td className="border px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRow(questionId, rowId)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {/* New/temp rows */}
              {tempRows.map((rowId) => (
                <tr key={rowId} className="hover:bg-muted/50 bg-green-50">
                  {sortedColumns.map((col) => {
                    const key = `${questionId}|${rowId}|${col.id}`
                    const localData = localValues.get(key)
                    const displayValue = localData?.value ?? ''

                    return (
                      <td key={col.id} className="border px-2 py-1">
                        <Input
                          value={displayValue}
                          onChange={(e) => handleListTableChange(
                            questionId,
                            rowId,
                            col.id,
                            e.target.value,
                            'text',
                            undefined
                          )}
                          className="h-8 text-sm"
                          placeholder="Enter value..."
                        />
                      </td>
                    )
                  })}
                  <td className="border px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRow(questionId, rowId)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {/* Empty state row */}
              {rows.size === 0 && tempRows.length === 0 && (
                <tr>
                  <td colSpan={sortedColumns.length + 1} className="border px-3 py-4 text-center text-muted-foreground italic">
                    No data yet. Click "Add Row" to start entering data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddRow(questionId)}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
      </div>
    )
  }

  return (
    <AppLayout title={`Edit: ${sheetName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/sheets/${sheetId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{sheetName}</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
          <Badge variant="outline">{sheetStatus || 'Draft'}</Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || submitting} variant="default" className="bg-green-600 hover:bg-green-700">
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Submitting...' : 'Submit to Customer'}
          </Button>
        </div>

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          {visibleQuestions.length} questions
        </div>

        {/* Questions grouped by Section/Subsection */}
        <div className="space-y-6">
          {(() => {
            // Group questions by section, then subsection
            const sections = new Map<number, Map<number, Array<[string, typeof visibleQuestions[0][1]]>>>();
            
            visibleQuestions.forEach(([questionId, q]) => {
              const sectionNum = q.section_sort_number ?? 0;
              const subsectionNum = q.subsection_sort_number ?? 0;
              
              if (!sections.has(sectionNum)) {
                sections.set(sectionNum, new Map());
              }
              const sectionMap = sections.get(sectionNum)!;
              if (!sectionMap.has(subsectionNum)) {
                sectionMap.set(subsectionNum, []);
              }
              sectionMap.get(subsectionNum)!.push([questionId, q]);
            });
            
            // Sort sections by number
            const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);
            
            return sortedSections.map(([sectionNum, subsections]) => (
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
                      
                      {/* Questions in this subsection */}
                      <div className="space-y-4 pl-2">
                      {questions.map(([questionId, q]) => {
            const questionNumber = q.section_sort_number && q.subsection_sort_number && q.question_order
              ? `${q.section_sort_number}.${q.subsection_sort_number}.${q.question_order}`
              : null

            const isListTable = q.response_type?.toLowerCase() === 'list table'
            const questionChoices = choicesByQuestion.get(questionId) || []
            const localData = localValues.get(questionId)
            const singleAnswer = q.answers[0]
            // Use display value (human-readable) for showing in inputs
            const currentValue = localData?.value ?? (singleAnswer ? getDisplayValue(singleAnswer) : '')

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
                    renderListTable(questionId, q.answers)
                  ) : (
                    renderInput(
                      questionId,
                      q.response_type,
                      questionChoices,
                      currentValue,
                      localData?.answerId || singleAnswer?.id,
                      singleAnswer?.choice_content
                    )
                  )}
                </CardContent>
              </Card>
            )
                      })}
                      </div>
                    </div>
                  ))}
              </div>
            ));
          })()}
        </div>

        {visibleQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No answers found for this sheet. The sheet may not have any data yet.
          </div>
        )}
      </div>
    </AppLayout>
  )
}
