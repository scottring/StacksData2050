'use client'

import { AlertTriangle, MessageSquare } from 'lucide-react'

export interface AnswerRejection {
  id: string
  answer_id: string
  reason: string | null
  rejected_by?: string | null
  created_at?: string
  rejector_name?: string
}

interface AnswerRejectionCommentProps {
  rejection: AnswerRejection
}

export function AnswerRejectionComment({ rejection }: AnswerRejectionCommentProps) {
  const formattedDate = rejection.created_at
    ? new Date(rejection.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  if (!rejection.reason) return null

  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Reviewer Feedback
            </span>
            {formattedDate && (
              <span className="text-amber-600 dark:text-amber-500 text-xs">
                {formattedDate}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
            {rejection.reason}
          </p>
        </div>
      </div>
    </div>
  )
}

interface SheetObservationsProps {
  observations: string
  createdAt?: string
}

export function SheetObservations({ observations, createdAt }: SheetObservationsProps) {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-3">
        <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Reviewer Comments
            </span>
            {formattedDate && (
              <span className="text-amber-600 dark:text-amber-500 text-xs">
                {formattedDate}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
            {observations}
          </p>
        </div>
      </div>
    </div>
  )
}
