'use client'

import { cn } from '@/lib/utils'
import { Check, X, Clock, Minus } from 'lucide-react'
import type { WorkflowRole, StepDecision } from '@/lib/workflows/product-introduction'

const ROLE_LABELS: Record<WorkflowRole, string> = {
  requestor: 'Requestor',
  operator: 'Operator',
  procurement: 'Procurement',
  incident_officer: 'Incident Officer',
  water_protection: 'Water Protection',
  pqm: 'PQM',
  security_specialist: 'Security',
  head_procurement: 'Head Procurement',
  operator_brk: 'Operator BRK',
  fire_protection: 'Fire Protection',
}

export type StepStripItem = {
  id: string
  role: WorkflowRole
  step_order: number
  decision: StepDecision
  signed_at: string | null
}

type Props = {
  steps: StepStripItem[]
  activeStepId?: string | null
}

export function WorkflowStepStrip({ steps, activeStepId }: Props) {
  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Workflow has not entered review yet.
      </div>
    )
  }

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step) => {
        const isActive = step.id === activeStepId
        return (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
              step.decision === 'approved' &&
                'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300',
              step.decision === 'returned' &&
                'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
              step.decision === 'skipped' &&
                'border-gray-200 bg-gray-50 text-gray-400 line-through dark:border-gray-800 dark:bg-gray-900',
              step.decision === 'pending' &&
                !isActive &&
                'border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400',
              step.decision === 'pending' &&
                isActive &&
                'border-blue-400 bg-blue-50 text-blue-900 ring-2 ring-blue-300 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold">
              {step.decision === 'approved' ? (
                <Check className="h-3.5 w-3.5" />
              ) : step.decision === 'returned' ? (
                <X className="h-3.5 w-3.5" />
              ) : step.decision === 'skipped' ? (
                <Minus className="h-3.5 w-3.5" />
              ) : isActive ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                step.step_order
              )}
            </span>
            <span className="font-medium">{ROLE_LABELS[step.role]}</span>
          </li>
        )
      })}
    </ol>
  )
}

export { ROLE_LABELS }
