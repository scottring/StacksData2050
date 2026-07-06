'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CONDITION_CATEGORIES } from '@/lib/workflows/product-introduction'
import type { ConditionCategory } from '@/lib/workflows/product-introduction'

const CATEGORY_LABELS: Record<ConditionCategory, string> = {
  emission: 'Emission',
  wastewater: 'Wastewater',
  storage: 'Storage',
  osh: 'OSH',
  fire: 'Fire Protection',
  wastewater_treatment: 'Wastewater Treatment',
  other: 'Other',
}

export type ConditionEntry = {
  id: string
  category: ConditionCategory
  body: string
  role: string | null
  created_at: string
  user?: { full_name: string | null; email: string | null } | null
}

type Props = {
  workflowId: string
  entries: ConditionEntry[]
  canAdd: boolean
}

export function ConditionsLog({ workflowId, entries, canAdd }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState<ConditionCategory>('other')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/workflows/product-introduction/${workflowId}/conditions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, body }),
        }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `HTTP ${res.status}`)
      } else {
        setBody('')
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <div className="text-sm text-muted-foreground italic">
          No conditions added yet.
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((c) => (
          <li key={c.id} className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{CATEGORY_LABELS[c.category]}</Badge>
              <span className="text-muted-foreground">
                {c.user?.full_name ?? c.user?.email ?? 'Unknown'}
                {c.role ? ` · ${c.role}` : ''}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
          </li>
        ))}
      </ul>

      {canAdd && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cond-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ConditionCategory)}>
              <SelectTrigger id="cond-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cond-body">Condition</Label>
            <Textarea
              id="cond-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the condition, constraint, or note..."
              rows={3}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !body.trim()}>
              {submitting ? 'Adding...' : 'Add condition'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
