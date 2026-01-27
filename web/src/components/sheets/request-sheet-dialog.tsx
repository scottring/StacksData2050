'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'

type Company = Database['public']['Tables']['companies']['Row']

// Use a simpler tag type for what we actually need
interface TagOption {
  id: string
  name: string | null
  description: string | null
}

interface RequestSheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestSheetDialog({ open, onOpenChange }: RequestSheetDialogProps) {
  const [suppliers, setSuppliers] = useState<Company[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>('existing')

  const [formData, setFormData] = useState({
    productName: '',
    supplierId: '',
    selectedTags: [] as string[],
    newSupplierEmail: '',
    newSupplierCompanyName: '',
  })

  useEffect(() => {
    if (open) {
      fetchData()
      setSuccess(false)
    }
  }, [open])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()

    // Fetch suppliers (companies with show_as_supplier = true)
    const { data: supplierData } = await supabase
      .from('companies')
      .select('*')
      .eq('active', true)
      .eq('show_as_supplier', true)
      .order('name')

    // Fetch tags (HQ 2.0.1, HQ2.1, etc.)
    const { data: tagData } = await supabase
      .from('tags')
      .select('id, name, description')
      .order('name')

    setSuppliers(supplierData || [])
    setTags(tagData || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('company_id, full_name, email')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) throw new Error('No company found')

      let supplierCompanyId = formData.supplierId
      let invitationId: string | null = null

      // Handle new supplier invitation
      if (supplierMode === 'new') {
        // Generate unique token
        const token = crypto.randomUUID()

        // Create invitation record
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .insert({
            email: formData.newSupplierEmail,
            company_name: formData.newSupplierCompanyName || null,
            token,
            created_by: user.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (inviteError) throw inviteError

        invitationId = invitation.id

        // Create placeholder company (will be replaced when supplier signs up)
        const { data: placeholderCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: formData.newSupplierCompanyName || `Invited: ${formData.newSupplierEmail}`,
            active: false, // Inactive until signup
            show_as_supplier: true,
          })
          .select()
          .single()

        if (companyError) throw companyError

        supplierCompanyId = placeholderCompany.id

        // Send invitation email via API route
        try {
          await fetch('/api/invitations/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invitationId: invitation.id,
              email: formData.newSupplierEmail,
              companyName: formData.newSupplierCompanyName,
              inviterName: userData.full_name,
            })
          })
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError)
          // Non-fatal: continue with request creation
        }
      }

      // Create new sheet
      const { data: newSheet, error: sheetError } = await supabase
        .from('sheets')
        .insert({
          name: formData.productName,
          company_id: userData.company_id,
          assigned_to_company_id: supplierCompanyId,
          stack_id: null, // Not using stacks anymore - tags control questions
          new_status: 'pending',
          created_by: user.id,
        })
        .select()
        .single()

      if (sheetError) throw sheetError

      // Create request record
      const { data: newRequest, error: requestError} = await supabase
        .from('requests')
        .insert({
          sheet_id: newSheet.id,
          requestor_id: userData.company_id,
          requesting_from_id: supplierCompanyId,
          processed: false,
          created_by: user.id,
        })
        .select()
        .single()

      if (requestError) throw requestError

      // Link selected tags to request
      if (formData.selectedTags.length > 0) {
        const requestTagInserts = formData.selectedTags.map(tagId => ({
          request_id: newRequest.id,
          tag_id: tagId
        }))

        const { error: tagError } = await supabase
          .from('request_tags')
          .insert(requestTagInserts)

        if (tagError) {
          console.error('Error linking tags to request:', tagError)
        }
      }

      // Also link tags to sheet for question filtering
      if (formData.selectedTags.length > 0) {
        const sheetTagInserts = formData.selectedTags.map(tagId => ({
          sheet_id: newSheet.id,
          tag_id: tagId
        }))

        const { error: sheetTagError } = await supabase
          .from('sheet_tags')
          .insert(sheetTagInserts)

        if (sheetTagError) {
          console.error('Error linking tags to sheet:', sheetTagError)
        }
      }

      // If invitation, link request to invitation
      if (supplierMode === 'new' && invitationId) {
        await supabase
          .from('invitations')
          .update({ request_id: newRequest.id })
          .eq('id', invitationId)
      }

      setSuccess(true)
      setTimeout(() => {
        setFormData({
          productName: '',
          supplierId: '',
          selectedTags: [],
          newSupplierEmail: '',
          newSupplierCompanyName: '',
        })
        onOpenChange(false)
      }, 1500)

    } catch (error) {
      console.error('Error creating request:', error)
      alert('Failed to create request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Product Data</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Sent Successfully</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Request Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The supplier will be notified to complete the product data sheet.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Product Data</DialogTitle>
            <DialogDescription>
              Send a product data questionnaire to a supplier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="productName"
                placeholder="e.g., Hydrocarb 60 ME"
                value={formData.productName}
                onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the name of the product you need data for
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Supplier <span className="text-red-500">*</span>
              </Label>

              {/* Toggle between existing/new */}
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={supplierMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSupplierMode('existing')}
                  disabled={submitting}
                >
                  Existing Supplier
                </Button>
                <Button
                  type="button"
                  variant={supplierMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSupplierMode('new')}
                  disabled={submitting}
                >
                  Invite New Supplier
                </Button>
              </div>

              {supplierMode === 'existing' ? (
                <>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}
                    required
                    disabled={submitting}
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No suppliers found
                        </div>
                      ) : (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The supplier who will fill out the questionnaire
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Supplier email address"
                    type="email"
                    value={formData.newSupplierEmail}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newSupplierEmail: e.target.value
                    }))}
                    required={supplierMode === 'new'}
                    disabled={submitting}
                  />
                  <Input
                    placeholder="Company name (optional)"
                    value={formData.newSupplierCompanyName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newSupplierCompanyName: e.target.value
                    }))}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send an invitation email to this address. They can sign up and respond to your request.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">
                Question Tags <span className="text-red-500">*</span>
              </Label>
              <TagMultiSelect
                tags={tags}
                selectedTags={formData.selectedTags}
                onSelectionChange={(tagIds) =>
                  setFormData(prev => ({ ...prev, selectedTags: tagIds }))
                }
                placeholder="Type to search tags (e.g., HQ 2.0.1)..."
              />
              <p className="text-xs text-muted-foreground">
                Select which question sets to include in this request
              </p>
            </div>
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
            <Button
              type="submit"
              disabled={
                submitting ||
                !formData.productName ||
                formData.selectedTags.length === 0 ||
                (supplierMode === 'existing' && !formData.supplierId) ||
                (supplierMode === 'new' && !formData.newSupplierEmail)
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
