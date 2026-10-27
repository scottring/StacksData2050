'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Lock, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomerUser {
  id: string
  full_name: string | null
  email: string | null
}

const EVERYONE = '__everyone__'

/**
 * Supplier-side control: restrict concentration values on this sheet to one
 * named person at the customer. Backed by GET/PUT
 * /api/sheets/[id]/concentration-viewer.
 */
export function ConcentrationViewerControl({
  sheetId,
  customerCompanyName,
  initialViewerId,
}: {
  sheetId: string
  customerCompanyName?: string
  initialViewerId: string | null
}) {
  const [users, setUsers] = useState<CustomerUser[]>([])
  const [viewerId, setViewerId] = useState<string>(initialViewerId || EVERYONE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/sheets/${sheetId}/concentration-viewer`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { users: [] }))
      .then(data => {
        setUsers(data.users || [])
        if (data.viewerId !== undefined) setViewerId(data.viewerId || EVERYONE)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [sheetId])

  async function handleChange(value: string) {
    const previous = viewerId
    setViewerId(value)
    setSaving(true)
    try {
      const res = await fetch(`/api/sheets/${sheetId}/concentration-viewer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: value === EVERYONE ? null : value }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(error || 'Failed to save')
      }
      toast.success(value === EVERYONE ? 'Concentrations visible to the whole customer team' : 'Concentrations restricted to one person')
    } catch (err) {
      setViewerId(previous)
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const customer = customerCompanyName || 'the customer'

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Concentration visibility</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose who at {customer} may see concentration values in this sheet. Everyone else there sees &quot;Restricted&quot;. All other answers stay visible.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:w-72">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select value={viewerId} onValueChange={handleChange} disabled={saving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERYONE}>Everyone at {customer}</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    Only {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  )
}
