'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Lock } from 'lucide-react'
import { ApiError, type Contact, type ContactInput } from './use-contacts'

interface Props {
  mode: 'add' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact
  onSubmit: (input: ContactInput) => Promise<unknown>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactFormSheet({ mode, open, onOpenChange, contact, onSubmit }: Props) {
  const locked = contact?.has_logged_in === true && mode === 'edit'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [sendInvite, setSendInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFirstName(contact?.first_name ?? '')
    setLastName(contact?.last_name ?? '')
    setEmail(contact?.email ?? '')
    setPhone(contact?.phone_text ?? '')
    setJobTitle(contact?.job_title ?? '')
    setIsPrimary(contact?.is_company_main_contact === true)
    setSendInvite(false)
    setErrors({})
  }, [open, contact])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'Required'
    if (!lastName.trim()) next.lastName = 'Required'
    if (!email.trim()) next.email = 'Required'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Invalid email'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (locked) return
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_text: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        is_primary: isPrimary,
        send_invite: mode === 'add' ? sendInvite : undefined,
      })
      toast.success(mode === 'add' ? 'Contact added' : 'Contact updated')
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) setErrors({ email: e.message })
        toast.error(e.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === 'add' ? 'Add contact' : 'Edit contact'}</SheetTitle>
          <SheetDescription>
            {mode === 'add'
              ? 'Add a new contact at this company.'
              : 'Update this contact\u2019s details.'}
          </SheetDescription>
        </SheetHeader>

        {locked && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <Lock className="h-4 w-4 mt-0.5" />
            <span>This contact has an active account and they manage their own profile.</span>
          </div>
        )}

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={locked || saving}
              />
              {errors.firstName && (
                <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={locked || saving}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={locked || saving}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={locked || saving}
            />
          </div>

          <div>
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={locked || saving}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(v === true)}
              disabled={locked || saving}
            />
            <Label htmlFor="isPrimary" className="cursor-pointer">
              Set as primary contact
            </Label>
          </div>

          {mode === 'add' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendInvite"
                checked={sendInvite}
                onCheckedChange={(v) => setSendInvite(v === true)}
                disabled={saving}
              />
              <Label htmlFor="sendInvite" className="cursor-pointer">
                Send invitation email now
              </Label>
            </div>
          )}
        </div>

        {!locked && (
          <div className="flex justify-end gap-2 px-4 pb-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
