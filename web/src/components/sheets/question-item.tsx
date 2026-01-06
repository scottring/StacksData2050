'use client'

import { QuestionInput, Question, Choice, Answer } from './question-input'
import { AnswerRejectionComment, AnswerRejection } from './answer-rejection-comment'
import {
  User,
  Paperclip,
  Undo2,
  MessageSquare,
  Info,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ListTableColumn {
  id: string
  name: string | null
  order_number: number | null
  parent_table_id: string | null
  response_type?: string | null
  choice_options?: string[] | null
}

export interface QuestionItemProps {
  question: Question
  choices: Choice[]
  answer: Answer | undefined
  onAnswerChange: (questionId: string, value: any, type: string) => void
  disabled?: boolean
  sheetId: string
  rejection?: AnswerRejection
  questionNumber: string | number
  showActionIcons?: boolean
  isConditional?: boolean
  hasAttachment?: boolean
  hasComment?: boolean
  listTableColumns?: ListTableColumn[]
}

export function QuestionItem({
  question,
  choices,
  answer,
  onAnswerChange,
  disabled = false,
  sheetId,
  rejection,
  questionNumber,
  showActionIcons = true,
  isConditional = false,
  hasAttachment = false,
  hasComment = false,
  listTableColumns = [],
}: QuestionItemProps) {
  const hasValue = answer && (
    answer.text_value ||
    answer.text_area_value ||
    answer.number_value !== null ||
    answer.boolean_value !== null ||
    answer.date_value ||
    answer.choice_id
  )

  return (
    <div className="space-y-2">
      {/* Question header row */}
      <div className="flex items-start gap-2">
        {/* Question number */}
        <span className="text-sm text-muted-foreground font-mono min-w-[2rem]">
          {questionNumber}.
        </span>

        {/* Question content */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Question title with conditional indicator */}
              <p className="font-medium">
                {isConditional && (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" title="Conditional question" />
                )}
                {question.content || question.name}
                {question.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </p>

              {/* Clarification / helper text */}
              {question.clarification && (
                <p className="text-sm text-muted-foreground mt-1">
                  {question.clarification}
                </p>
              )}
            </div>

            {/* Action icons (right side) */}
            {showActionIcons && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    "text-muted-foreground hover:text-foreground"
                  )}
                  title="Assign to user"
                >
                  <User className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    hasAttachment ? "text-blue-500" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Attachments"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    "text-muted-foreground hover:text-foreground",
                    !hasValue && "opacity-50 cursor-not-allowed"
                  )}
                  title="Undo changes"
                  disabled={!hasValue}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    hasComment ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Comments"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    "text-muted-foreground hover:text-foreground"
                  )}
                  title="Question info"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question input */}
      <div className="ml-8">
        <QuestionInput
          question={question}
          choices={choices}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
          sheetId={sheetId}
          listTableColumns={listTableColumns}
        />

        {/* Rejection comment if exists */}
        {rejection && (
          <AnswerRejectionComment rejection={rejection} />
        )}
      </div>
    </div>
  )
}

export interface QuestionListProps {
  questions: Question[]
  choices: Choice[]
  answers: Map<string, Answer>
  onAnswerChange: (questionId: string, value: any, type: string) => void
  disabled?: boolean
  sheetId: string
  getRejectionForQuestion?: (questionId: string) => AnswerRejection | undefined
  startNumber?: number
  sectionPrefix?: string
}

export function QuestionList({
  questions,
  choices,
  answers,
  onAnswerChange,
  disabled = false,
  sheetId,
  getRejectionForQuestion,
  startNumber = 1,
  sectionPrefix = '',
}: QuestionListProps) {
  return (
    <div className="space-y-6">
      {questions.map((question, idx) => {
        const questionNumber = sectionPrefix
          ? `${sectionPrefix}.${idx + startNumber}`
          : `${idx + startNumber}`

        return (
          <div key={question.id} className="group">
            <QuestionItem
              question={question}
              choices={choices}
              answer={answers.get(question.id)}
              onAnswerChange={onAnswerChange}
              disabled={disabled}
              sheetId={sheetId}
              rejection={getRejectionForQuestion?.(question.id)}
              questionNumber={questionNumber}
            />
          </div>
        )
      })}
    </div>
  )
}
