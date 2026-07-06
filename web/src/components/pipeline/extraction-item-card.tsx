'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Pencil, X, FlaskConical, AlertTriangle, TestTube2, MapPin } from 'lucide-react'
import ConfidenceBadge from './confidence-badge'

interface ExtractionItemCardProps {
  item: {
    id: string
    item_type: string
    data: Record<string, unknown>
    confidence: number
    reviewed: boolean
    review_status: string | null
  }
  onAccept: (id: string) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  chemical: { icon: FlaskConical, label: 'Chemical', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  hazard: { icon: AlertTriangle, label: 'Hazard', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  test_result: { icon: TestTube2, label: 'Test Result', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  physical_property: { icon: FlaskConical, label: 'Physical Property', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  traceability: { icon: MapPin, label: 'Traceability', color: 'text-rose-600 bg-rose-50 border-rose-200' },
}

export default function ExtractionItemCard({ item, onAccept, onUpdate }: ExtractionItemCardProps) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(item.data)

  const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.chemical
  const Icon = config.icon

  const handleSave = () => {
    onUpdate(item.id, editData)
    setEditing(false)
  }

  const handleFieldChange = (key: string, value: string) => {
    setEditData(prev => ({ ...prev, [key]: value }))
  }

  // Render data fields
  const renderFields = () => {
    const data = editing ? editData : item.data
    const entries = Object.entries(data).filter(
      ([key]) => key !== 'confidence' && key !== 'function_in_product'
    )

    return (
      <div className="space-y-1.5">
        {entries.map(([key, value]) => {
          if (value === null || value === undefined) return null
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

          if (typeof value === 'object' && !Array.isArray(value)) {
            // Nested object — flatten
            return Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => {
              if (!subVal) return null
              const subLabel = subKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              return (
                <div key={`${key}.${subKey}`} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 min-w-[120px]">{subLabel}</span>
                  {editing ? (
                    <Input
                      value={String(subVal)}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="h-7 text-xs"
                    />
                  ) : (
                    <span className="text-slate-900 font-mono">{String(subVal)}</span>
                  )}
                </div>
              )
            })
          }

          if (Array.isArray(value)) {
            return (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 min-w-[120px]">{label}</span>
                <div className="flex flex-wrap gap-1">
                  {value.map((v, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{String(v)}</Badge>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 min-w-[120px]">{label}</span>
              {editing ? (
                <Input
                  value={String(value)}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="h-7 text-xs"
                />
              ) : (
                <span className="text-slate-900 font-mono">{String(value)}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={`transition-all ${item.reviewed ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </div>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
          <div className="flex items-center gap-1">
            {item.reviewed ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Reviewed
              </Badge>
            ) : editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 px-2">
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={handleSave} className="h-7 px-3 text-xs">
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAccept(item.id)} className="h-7 px-3 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Accept
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {renderFields()}
      </CardContent>
    </Card>
  )
}
