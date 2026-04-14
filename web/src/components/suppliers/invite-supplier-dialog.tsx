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
import { Loader2, CheckCircle2, Mail } from 'lucide-react'

interface InviteSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InviteSupplierDialog({ open, onOpenChange, onSuccess }: InviteSupplierDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

      const { invitation, inviterName } = await createRes.json()

      await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          email: formData.email,
          companyName: formData.companyName,
          inviterName,
        })
      })

      setSuccess(true)
      onSuccess?.()

      // Reset and close after short delay
      setTimeout(() => {
        setFormData({ email: '', companyName: '' })
        setSuccess(false)
        onOpenChange(false)
      }, 2000)

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
      setSuccess(false)
      onOpenChange(false)
    }
  }

  if (success) {
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
                We've sent an invitation email to {formData.email}
              </p>
            </div>
          </div>
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
