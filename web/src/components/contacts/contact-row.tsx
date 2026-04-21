'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Pencil, Trash2, Star, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError, type Contact } from './use-contacts'

interface Props {
  contact: Contact
  onEdit: (contact: Contact) => void
  onSetPrimary: (contactId: string) => Promise<unknown>
  onDelete: (contactId: string) => Promise<unknown>
}

export function ContactRow({ contact, onEdit, onSetPrimary, onDelete }: Props) {
  const [starBusy, setStarBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const isPrimary = contact.is_company_main_contact === true
  const locked = contact.has_logged_in === true

  async function handleStar() {
    if (isPrimary || starBusy || locked) return
    setStarBusy(true)
    try {
      await onSetPrimary(contact.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set primary')
    } finally {
      setStarBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteBusy(true)
    try {
      await onDelete(contact.id)
      toast.success('Contact removed')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete contact')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <button
        type="button"
        onClick={handleStar}
        disabled={starBusy || locked}
        aria-label={isPrimary ? 'Primary contact' : 'Set as primary'}
        className={cn(
          'mt-1 shrink-0 transition-colors',
          isPrimary
            ? 'text-amber-500'
            : 'text-muted-foreground/40 hover:text-amber-400 disabled:hover:text-muted-foreground/40'
        )}
      >
        <Star className={cn('h-4 w-4', isPrimary && 'fill-current')} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {contact.full_name || 'Unnamed contact'}
          </span>
          {locked && (
            <Lock className="h-3 w-3 text-muted-foreground" aria-label="Active account" />
          )}
        </div>
        {contact.job_title && (
          <div className="text-xs text-muted-foreground truncate">{contact.job_title}</div>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground truncate"
          >
            <Mail className="h-3.5 w-3.5" />
            {contact.email}
          </a>
        )}
        {contact.phone_text && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {contact.phone_text}
          </div>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(contact)}
          aria-label="Edit contact"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!locked && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                aria-label="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this contact?</AlertDialogTitle>
                <AlertDialogDescription>
                  {contact.full_name || 'This contact'} will be removed from this company. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteBusy ? 'Removing...' : 'Remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
