'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WorkflowStatus } from '@/lib/workflows/product-introduction'

type Props = {
  workflowId: string
  status: WorkflowStatus
  isRequestor: boolean
  canTriage: boolean
  isSuperAdmin: boolean
  activeStep: { id: string; role: string } | null
  canSignActive: boolean
}

export function WorkflowActions({
  workflowId,
  status,
  isRequestor,
  canTriage,
  isSuperAdmin,
  activeStep,
  canSignActive,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState<
    null | 'triage-return' | 'triage-reject' | 'step-return'
  >(null)
  const [reason, setReason] = useState('')

  async function call(url: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `HTTP ${res.status}`)
      } else {
        router.refresh()
      }
    } finally {
      setBusy(false)
      setReasonOpen(null)
      setReason('')
    }
  }

  const showSubmit = status === 'draft' && (isRequestor || isSuperAdmin)
  const showTriage = status === 'triage' && canTriage
  const showSign =
    status === 'in_review' && (canSignActive || isSuperAdmin) && activeStep

  if (!showSubmit && !showTriage && !showSign && !error) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSubmit && (
        <Button
          disabled={busy}
          onClick={() => call(`/api/workflows/product-introduction/${workflowId}/submit`)}
        >
          Submit for triage
        </Button>
      )}

      {showTriage && (
        <>
          <Button
            disabled={busy}
            onClick={() =>
              call(`/api/workflows/product-introduction/${workflowId}/triage`, {
                action: 'advance',
              })
            }
          >
            Open internal review
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setReasonOpen('triage-return')}
          >
            Return to requestor
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => setReasonOpen('triage-reject')}
          >
            Reject
          </Button>
        </>
      )}

      {showSign && activeStep && (
        <>
          <Button
            disabled={busy}
            onClick={() =>
              call(
                `/api/workflows/product-introduction/${workflowId}/steps/${activeStep.id}/sign`,
                { decision: 'approved' }
              )
            }
          >
            Sign off ({activeStep.role})
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setReasonOpen('step-return')}
          >
            Return with comment
          </Button>
        </>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}

      <Dialog open={reasonOpen !== null} onOpenChange={(o) => !o && setReasonOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonOpen === 'triage-return' && 'Return to requestor'}
              {reasonOpen === 'triage-reject' && 'Reject workflow'}
              {reasonOpen === 'step-return' && 'Return with comment'}
            </DialogTitle>
            <DialogDescription>
              {reasonOpen === 'triage-reject'
                ? 'This terminates the workflow. The requestor cannot resubmit.'
                : 'Explain what needs to change so the requestor can fix and resubmit.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReasonOpen(null)
                setReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !reason.trim()}
              onClick={() => {
                if (reasonOpen === 'triage-return') {
                  call(`/api/workflows/product-introduction/${workflowId}/triage`, {
                    action: 'return',
                    reason,
                  })
                } else if (reasonOpen === 'triage-reject') {
                  call(`/api/workflows/product-introduction/${workflowId}/triage`, {
                    action: 'reject',
                    reason,
                  })
                } else if (reasonOpen === 'step-return' && activeStep) {
                  call(
                    `/api/workflows/product-introduction/${workflowId}/steps/${activeStep.id}/sign`,
                    { decision: 'returned', return_reason: reason }
                  )
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
