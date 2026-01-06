'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileUploadInput, UploadedFile } from './file-upload-input'
import { ListTableInput, ListTableRow } from './list-table-input'

export interface Question {
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

export interface Choice {
  id: string
  content: string | null
  parent_question_id: string | null
  order_number: number | null
}

export interface Answer {
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

export interface ListTableColumn {
  id: string
  name: string | null
  order_number: number | null
  parent_table_id: string | null
}

export interface QuestionInputProps {
  question: Question
  choices: Choice[]
  answer: Answer | undefined
  onAnswerChange: (questionId: string, value: any, type: string) => void
  disabled?: boolean
  sheetId: string
  listTableColumns?: ListTableColumn[]
}

export function QuestionInput({
  question,
  choices,
  answer,
  onAnswerChange,
  disabled = false,
  sheetId,
  listTableColumns = [],
}: QuestionInputProps) {
  const questionChoices = choices
    .filter(c => c.parent_question_id === question.id)
    .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))

  switch (question.question_type) {
    case 'yes_no':
    case 'boolean':
      return (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={answer?.boolean_value === true ? 'default' : 'outline'}
            onClick={() => onAnswerChange(question.id, true, 'boolean')}
            disabled={disabled}
          >
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={answer?.boolean_value === false ? 'default' : 'outline'}
            onClick={() => onAnswerChange(question.id, false, 'boolean')}
            disabled={disabled}
          >
            No
          </Button>
        </div>
      )

    case 'dropdown':
    case 'Dropdown':
    case 'single_choice':
    case 'Select one':
    case 'Select one Radio':
      return (
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          value={answer?.choice_id || ''}
          onChange={(e) => onAnswerChange(question.id, e.target.value, 'choice')}
          disabled={disabled}
        >
          <option value="">Select an option...</option>
          {questionChoices.map(choice => (
            <option key={choice.id} value={choice.id}>
              {choice.content}
            </option>
          ))}
        </select>
      )

    case 'multiple_choice':
    case 'Select multiple':
      return (
        <div className="space-y-2">
          {questionChoices.map(choice => (
            <label key={choice.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-input disabled:opacity-50"
                checked={answer?.choice_id === choice.id}
                onChange={() => onAnswerChange(question.id, choice.id, 'choice')}
                disabled={disabled}
              />
              <span className="text-sm">{choice.content}</span>
            </label>
          ))}
        </div>
      )

    case 'number':
      return (
        <Input
          type="number"
          value={answer?.number_value ?? ''}
          onChange={(e) => onAnswerChange(question.id, parseFloat(e.target.value), 'number')}
          placeholder="Enter a number..."
          disabled={disabled}
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={answer?.date_value ?? ''}
          onChange={(e) => onAnswerChange(question.id, e.target.value, 'date')}
          disabled={disabled}
        />
      )

    case 'text_area':
    case 'textarea':
    case 'Multiple text lines':
      return (
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          value={answer?.text_area_value ?? answer?.text_value ?? ''}
          onChange={(e) => onAnswerChange(question.id, e.target.value, 'text_area')}
          placeholder="Enter your response..."
          disabled={disabled}
        />
      )

    case 'file':
    case 'file_upload':
    case 'File document':
      const existingFiles: UploadedFile[] = answer?.text_value
        ? (() => {
            try {
              return JSON.parse(answer.text_value)
            } catch {
              return []
            }
          })()
        : []

      return (
        <FileUploadInput
          sheetId={sheetId}
          questionId={question.id}
          existingFiles={existingFiles}
          onFilesChange={(files) => onAnswerChange(question.id, JSON.stringify(files), 'text')}
          disabled={disabled}
        />
      )

    case 'list_table':
    case 'List table':
      const existingRows: ListTableRow[] = answer?.text_value
        ? (() => {
            try {
              return JSON.parse(answer.text_value)
            } catch {
              // Handle legacy plain text data by converting to a single row
              return answer.text_value ? [{ id: 'legacy-1', values: { substance: answer.text_value, details: '' } }] : []
            }
          })()
        : []

      // Get column definitions from the answer object (populated during data loading)
      const tableColumns = (answer as any)?.list_table_columns || undefined

      return (
        <ListTableInput
          questionId={question.id}
          existingRows={existingRows}
          onRowsChange={(rows) => onAnswerChange(question.id, JSON.stringify(rows), 'text')}
          disabled={disabled}
          columns={tableColumns}
        />
      )

    case 'text':
    case 'Single text line':
    default:
      return (
        <Input
          value={answer?.text_value ?? ''}
          onChange={(e) => onAnswerChange(question.id, e.target.value, 'text')}
          placeholder="Enter your response..."
          disabled={disabled}
        />
      )
  }
}
