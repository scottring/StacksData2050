'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Mail, AlertTriangle, Copy } from 'lucide-react'

interface InviteSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type SendResult =
  | { kind: 'sent'; email: string }
  | { kind: 'blocked'; email: string; reason: string; signupUrl: string }
  | { kind: 'connected'; email: string; companyName: string | null; alreadyConnected: boolean }

export function InviteSupplierDialog({ open, onOpenChange, onSuccess }: InviteSupplierDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const createRes = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          companyName: formData.companyName,
        }),
      })

      if (!createRes.ok) {
        const { error: errMsg } = await createRes.json().catch(() => ({ error: 'Failed to create invitation' }))
        throw new Error(errMsg || 'Failed to create invitation')
      }

      const createBody = await createRes.json()
      const { invitation, inviterName, existingUser, company } = createBody

      if (existingUser) {
        const ensureRes = await fetch('/api/relationships/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierCompanyId: company.id }),
        })
        const ensureBody = await ensureRes.json().catch(() => ({} as any))

        if (!ensureRes.ok && !ensureBody?.alreadyConnected) {
          throw new Error(ensureBody?.error || 'Failed to connect to existing supplier')
        }

        setResult({
          kind: 'connected',
          email: formData.email,
          companyName: company?.name ?? null,
          alreadyConnected: !!ensureBody?.alreadyConnected,
        })
        onSuccess?.()
        return
      }

      const sendRes = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          email: formData.email,
          companyName: formData.companyName,
          inviterName,
        })
      })

      const sendBody = await sendRes.json().catch(() => ({} as any))
      if (!sendRes.ok) {
        throw new Error(sendBody?.error || sendBody?.details || 'Failed to send invitation email')
      }

      if (sendBody?.emailBlocked) {
        setResult({
          kind: 'blocked',
          email: formData.email,
          reason: sendBody.blockedReason || 'UNKNOWN',
          signupUrl: sendBody.signupUrl,
        })
      } else {
        setResult({ kind: 'sent', email: formData.email })
      }
      onSuccess?.()

    } catch (err: any) {
      console.error('Error inviting supplier:', err)
      setError(err.message || 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setFormData({ email: '', companyName: '' })
      setError(null)
      setResult(null)
      setCopied(false)
      onOpenChange(false)
    }
  }

  if (result?.kind === 'sent') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Invitation Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We've sent an invitation email to {result.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (result?.kind === 'connected') {
    const companyLabel = result.companyName || 'the supplier'
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {result.alreadyConnected ? 'Already Connected' : 'Connected!'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.alreadyConnected
                  ? `You are already connected to ${companyLabel} (${result.email} is an existing user).`
                  : `${result.email} already has an account at ${companyLabel}. They will see your request on their dashboard.`}
              </p>
            </div>
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (result?.kind === 'blocked') {
    const reasonLabel =
      result.reason === 'DISABLE_OUTBOUND_EMAILS'
        ? 'Outbound email is disabled in this environment (DISABLE_OUTBOUND_EMAILS=true).'
        : result.reason === 'SENDGRID_NOT_CONFIGURED'
          ? 'SendGrid is not configured in this environment.'
          : 'Email delivery was skipped.'
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Invitation created, email not sent
            </DialogTitle>
            <DialogDescription>
              {reasonLabel} The invitation row exists, but no email was delivered to {result.email}. Copy the signup link below and share it manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Signup link</Label>
            <div className="flex gap-2">
              <Input readOnly value={result.signupUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.signupUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite New Supplier
            </DialogTitle>
            <DialogDescription>
              Send an invitation to a new supplier to join StacksData
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="supplier@company.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name
              </Label>
              <Input
                id="companyName"
                placeholder="Supplier Company Inc."
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Optional - they can update this when they sign up
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.email}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
