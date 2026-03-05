'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Send, AlertCircle, Pencil } from 'lucide-react'

interface Recipient {
  email: string
  firstName: string
}

interface SendCustomEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedInvitations: { id: string; email: string; company_name: string | null }[]
}

const DEFAULT_SUBJECT = "Tomorrow's meeting \u2014 one quick question"

const DEFAULT_BODY = `Hi [First Name],

The trial has come and gone, and I wanted to share with you just how grateful I am that you took your valuable time to evaluate the new system. I'm looking forward to hearing your feedback during our conversation tomorrow but, to make the most of our time, I'd love to know one thing going in:

What's the single biggest factor that will drive your decision on Stacks?

It could be something that impressed you, something that's missing, or something entirely outside the product. Whatever comes to mind \u2014 even a one-line reply -- helps me make sure tomorrow is useful for everyone.

Thanks, and talk soon.

Best,
Scott`

function guessFirstName(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/)
  const first = parts[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function SendCustomEmailDialog({
  open,
  onOpenChange,
  selectedInvitations,
}: SendCustomEmailDialogProps) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number; errors?: string[] } | null>(null)

  // Sync recipients whenever the dialog opens
  useEffect(() => {
    if (open && selectedInvitations.length > 0) {
      setRecipients(
        selectedInvitations.map(inv => ({
          email: inv.email,
          firstName: guessFirstName(inv.email),
        }))
      )
      setResult(null)
      setSending(false)
    }
  }, [open, selectedInvitations])

  function updateFirstName(email: string, firstName: string) {
    setRecipients(prev =>
      prev.map(r => (r.email === email ? { ...r, firstName } : r))
    )
  }

  async function handleSend() {
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/trials/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      setResult(data)
    } catch (err: any) {
      setResult({ sent: 0, total: recipients.length, errors: [err.message] })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Custom Email
          </DialogTitle>
          <DialogDescription>
            Send a personalized email to {selectedInvitations.length} selected recipient{selectedInvitations.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6">
            {result.errors && result.errors.length > 0 && result.sent === 0 ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <p className="font-medium text-red-700">Failed to send emails</p>
                <div className="text-sm text-red-600 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="font-medium">
                  Sent {result.sent} of {result.total} email{result.total !== 1 ? 's' : ''}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="text-sm text-red-600 space-y-1 mt-2">
                    <p className="font-medium">Errors:</p>
                    {result.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* Recipients */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Recipients & First Names</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {recipients.map((r) => (
                  <div key={r.email} className="flex items-center gap-3 px-3 py-2">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{r.email}</span>
                    <div className="flex items-center gap-1.5">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                      <Input
                        value={r.firstName}
                        onChange={(e) => updateFirstName(r.email, e.target.value)}
                        className="w-32 h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                First names are guessed from emails. Edit them above before sending.
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message</Label>
                <Badge variant="outline" className="text-xs font-normal">
                  [First Name] will be replaced per recipient
                </Badge>
              </div>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || recipients.length === 0}
                className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
