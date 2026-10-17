'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// Statuses a customer can set by hand. Values must be accepted by
// PATCH /api/sheets/[id]/status.
const STATUS_OPTIONS = [
  { value: 'approved', label: 'Complete' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'draft', label: 'Draft' },
]

// Stored statuses that are not in the picker but should still read sensibly.
const OTHER_LABELS: Record<string, string> = {
  completed: 'Complete',
  imported: 'Imported',
  pending: 'Pending',
  submitted: 'Submitted',
  rejected: 'Rejected',
}

interface SheetCustomerActionsProps {
  sheetId: string
  sheetName: string
  status: string | null
  archived: boolean
}

export function SheetCustomerActions({ sheetId, sheetName, status, archived }: SheetCustomerActionsProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status || 'draft')
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingArchive, setSavingArchive] = useState(false)

  const inPicker = STATUS_OPTIONS.some(o => o.value === currentStatus)

  async function changeStatus(next: string) {
    if (next === currentStatus) return
    const previous = currentStatus
    setCurrentStatus(next)
    setSavingStatus(true)
    try {
      const res = await fetch(`/api/sheets/${sheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
      toast.success('Status updated')
      router.refresh()
    } catch (err) {
      setCurrentStatus(previous)
      toast.error(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setSavingStatus(false)
    }
  }

  async function setArchived(next: boolean) {
    setSavingArchive(true)
    try {
      const res = await fetch(`/api/sheets/${sheetId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed')
      toast.success(next ? 'Sheet archived' : 'Sheet restored')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update sheet')
    } finally {
      setSavingArchive(false)
    }
  }

  return (
    <>
      <Select value={currentStatus} onValueChange={changeStatus} disabled={savingStatus}>
        <SelectTrigger className="h-8 w-[150px]" aria-label="Sheet status">
          {savingStatus && <Loader2 className="h-3 w-3 animate-spin" />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!inPicker && (
            <SelectItem value={currentStatus} disabled>
              {OTHER_LABELS[currentStatus] || currentStatus}
            </SelectItem>
          )}
          {STATUS_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {archived ? (
        <Button size="sm" variant="outline" onClick={() => setArchived(false)} disabled={savingArchive}>
          <ArchiveRestore className="h-4 w-4 mr-2" />
          Restore
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={savingArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {sheetName}?</AlertDialogTitle>
              <AlertDialogDescription>
                The sheet will be hidden from Supplier Products. Nothing is deleted, and you can
                restore it at any time from the Archived filter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setArchived(true)}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
