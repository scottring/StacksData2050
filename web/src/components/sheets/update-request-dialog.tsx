'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Send } from 'lucide-react'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'

interface TagOption {
  id: string
  name: string | null
  description: string | null
}

interface UpdateRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: {
    id: string
    sheet_id: string
    sheet_name: string
    supplier_name: string
    supplier_company_id: string
    existing_tags: string[]
    existing_tag_ids: string[]
  } | null
}

export function UpdateRequestDialog({ open, onOpenChange, request }: UpdateRequestDialogProps) {
  const [allTags, setAllTags] = useState<TagOption[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && request) {
      fetchTags()
      setSelectedTags([])
      setSuccess(false)
    }
  }, [open, request])

  async function fetchTags() {
    setLoading(true)
    const supabase = createClient()
    const { data: tagData } = await supabase
      .from('tags')
      .select('id, name, description')
      .order('name')
    setAllTags(tagData || [])
    setLoading(false)
  }

  // Filter out tags already on this request
  const availableTags = allTags.filter(t => !request?.existing_tag_ids.includes(t.id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!request) return
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('company_id, full_name')
        .eq('id', user.id)
        .single()

      // Add new tags to the sheet
      if (selectedTags.length > 0) {
        const sheetTagInserts = selectedTags.map(tagId => ({
          sheet_id: request.sheet_id,
          tag_id: tagId,
        }))
        const { error: sheetTagError } = await supabase
          .from('sheet_tags')
          .insert(sheetTagInserts)
        if (sheetTagError) console.error('Error adding sheet tags:', sheetTagError)

        // Also add to request_tags
        const requestTagInserts = selectedTags.map(tagId => ({
          request_id: request.id,
          tag_id: tagId,
        }))
        const { error: reqTagError } = await supabase
          .from('request_tags')
          .insert(requestTagInserts)
        if (reqTagError) console.error('Error adding request tags:', reqTagError)
      }

      // Reset sheet status to trigger re-fill
      await supabase
        .from('sheets')
        .update({ status: 'pending' })
        .eq('id', request.sheet_id)

      // Send notification email to supplier
      try {
        const { data: supplierUsers } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('company_id', request.supplier_company_id)
          .not('email', 'ilike', '%placeholder%')
          .limit(1)

        const { data: requesterCompany } = await supabase
          .from('companies')
          .select('name')
          .eq('id', userData?.company_id)
          .single()

        if (supplierUsers && supplierUsers.length > 0) {
          await fetch('/api/requests/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: request.id,
              sheetId: request.sheet_id,
              supplierEmail: supplierUsers[0].email,
              supplierName: supplierUsers[0].full_name,
              productName: request.sheet_name,
              requesterName: userData?.full_name,
              requesterCompany: requesterCompany?.name,
            }),
          })
        }
      } catch (emailError) {
        console.error('Error sending update notification:', emailError)
      }

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error('Failed to update request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!request) return null

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Sent</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Update Request Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The supplier will be notified about the updated questionnaire.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Update</DialogTitle>
            <DialogDescription>
              Request updated data for this product sheet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Product</p>
              <p className="text-sm text-slate-900">{request.sheet_name}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">Supplier</p>
              <p className="text-sm text-slate-900">{request.supplier_name}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Current Tags</p>
              <div className="flex gap-1.5 flex-wrap">
                {request.existing_tags.length > 0 ? (
                  request.existing_tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs rounded-full">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Add Question Tags</p>
                <TagMultiSelect
                  tags={availableTags}
                  selectedTags={selectedTags}
                  onSelectionChange={setSelectedTags}
                  placeholder="Type to search tags..."
                />
                <p className="text-xs text-muted-foreground">
                  Select additional question sets to add to this request
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Update Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
