'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Plant {
  id: string
  code: string
  name: string
}

interface StartWorkflowDialogProps {
  sheetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Plants are read directly via the browser Supabase client: the
// `plants_select` RLS policy (20260421000002_product_introduction_workflow.sql)
// scopes SELECT to `company_id = public.user_company_id()` with no
// admin/editor restriction, so any authenticated company member can list
// their own plants without a service-role API route.
export function StartWorkflowDialog({ sheetId, open, onOpenChange }: StartWorkflowDialogProps) {
  const router = useRouter()
  const [plants, setPlants] = useState<Plant[]>([])
  const [plantId, setPlantId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setPlantId('')
    fetchPlants()
  }, [open])

  async function fetchPlants() {
    setLoading(true)
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('plants')
      .select('id, code, name')
      .order('name')

    if (fetchError) {
      setError('Failed to load plants')
    } else {
      setPlants(data ?? [])
    }
    setLoading(false)
  }

  async function handleConfirm() {
    if (!plantId) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/workflows/product-introduction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_id: sheetId, plant_id: plantId }),
      })

      if (res.status === 409) {
        setError('An active workflow already exists for this sheet and plant')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        setError('Failed to start workflow')
        setSubmitting(false)
        return
      }

      const created = await res.json()
      router.push(`/workflows/${created.id}`)
    } catch {
      setError('Failed to start workflow')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Introduction Workflow</DialogTitle>
          <DialogDescription>
            Select the plant this product is being introduced at.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plant" />
            </SelectTrigger>
            <SelectContent>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.name} ({plant.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!plantId || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
