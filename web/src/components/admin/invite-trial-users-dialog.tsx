'use client'

import { useState, useMemo } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, Mail, Users, AlertCircle, Building2 } from 'lucide-react'

interface InviteTrialUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ParsedEmail {
  email: string
  domain: string
  valid: boolean
}

interface InviteResult {
  email: string
  status: 'sent' | 'failed' | 'duplicate'
  error?: string
}

export function InviteTrialUsersDialog({ open, onOpenChange, onSuccess }: InviteTrialUsersDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchName, setBatchName] = useState('')
  const [emailsText, setEmailsText] = useState('')
  const [results, setResults] = useState<InviteResult[]>([])
  const [progress, setProgress] = useState(0)

  // Parse emails from text
  const parsedEmails = useMemo<ParsedEmail[]>(() => {
    if (!emailsText.trim()) return []

    // Split by comma, newline, semicolon, or space
    const rawEmails = emailsText
      .split(/[,;\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0)

    // Deduplicate
    const uniqueEmails = [...new Set(rawEmails)]

    // Validate and parse
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return uniqueEmails.map(email => ({
      email,
      domain: email.includes('@') ? email.split('@')[1] : '',
      valid: emailRegex.test(email),
    }))
  }, [emailsText])

  // Group by domain for preview
  const emailsByDomain = useMemo(() => {
    const validEmails = parsedEmails.filter(e => e.valid)
    const domains = new Map<string, string[]>()
    validEmails.forEach(({ email, domain }) => {
      if (!domains.has(domain)) {
        domains.set(domain, [])
      }
      domains.get(domain)!.push(email)
    })
    return domains
  }, [parsedEmails])

  const validCount = parsedEmails.filter(e => e.valid).length
  const invalidCount = parsedEmails.filter(e => !e.valid).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validCount === 0) {
      setError('Please enter at least one valid email address')
      return
    }

    setSubmitting(true)
    setError(null)
    setProgress(0)
    setResults([])

    try {
      const response = await fetch('/api/admin/trials/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: parsedEmails.filter(e => e.valid).map(e => e.email),
          batchName: batchName || `PPvis ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations')
      }

      setResults(data.results || [])
      setSuccess(true)
      onSuccess?.()

    } catch (err: any) {
      console.error('Error sending invitations:', err)
      setError(err.message || 'Failed to send invitations')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setBatchName('')
      setEmailsText('')
      setError(null)
      setSuccess(false)
      setResults([])
      setProgress(0)
      onOpenChange(false)
    }
  }

  // Success view
  if (success && results.length > 0) {
    const sentCount = results.filter(r => r.status === 'sent').length
    const failedCount = results.filter(r => r.status === 'failed').length
    const duplicateCount = results.filter(r => r.status === 'duplicate').length

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Invitations Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully sent {sentCount} invitation{sentCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Results summary */}
            <div className="flex gap-4 mt-2">
              {sentCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  {sentCount} sent
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  {duplicateCount} duplicate
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  {failedCount} failed
                </Badge>
              )}
            </div>

            {/* Failed emails detail */}
            {failedCount > 0 && (
              <div className="w-full mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-2">Failed to send:</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {results.filter(r => r.status === 'failed').map(r => (
                    <li key={r.email}>{r.email}: {r.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invite Trial Users
            </DialogTitle>
            <DialogDescription>
              Invite PPvis members to try Stacks Data. They&apos;ll complete discovery questions before accessing the trial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Batch Name */}
            <div className="space-y-2">
              <Label htmlFor="batchName">
                Batch Name
              </Label>
              <Input
                id="batchName"
                placeholder={`PPvis ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Name this batch for easier tracking (e.g., &quot;PPvis February 2026&quot;)
              </p>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="emails">
                Email Addresses <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses separated by commas, spaces, or new lines:

john@acme.com
sarah@bigcorp.com, mike@bigcorp.com
anna@supplier.io"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                disabled={submitting}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Preview */}
            {parsedEmails.length > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Preview</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white">
                      {validCount} valid
                    </Badge>
                    {invalidCount > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                        {invalidCount} invalid
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Group by domain */}
                <div className="space-y-2">
                  {Array.from(emailsByDomain.entries()).slice(0, 5).map(([domain, emails]) => (
                    <div key={domain} className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{domain}</span>
                      <span className="text-muted-foreground">({emails.length} user{emails.length !== 1 ? 's' : ''})</span>
                    </div>
                  ))}
                  {emailsByDomain.size > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{emailsByDomain.size - 5} more companies
                    </p>
                  )}
                </div>

                {/* Invalid emails warning */}
                {invalidCount > 0 && (
                  <div className="text-xs text-red-600 mt-2">
                    Invalid: {parsedEmails.filter(e => !e.valid).map(e => e.email).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Progress during submission */}
            {submitting && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Sending invitations...
                </p>
              </div>
            )}
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
              disabled={submitting || validCount === 0}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send {validCount} Invitation{validCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
