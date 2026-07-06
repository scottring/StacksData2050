'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, ArrowRight, Shield } from 'lucide-react'
import ExtractionItemCard from '@/components/pipeline/extraction-item-card'

interface ReviewClientProps {
  documentId: string
  productName: string | null
  items: Array<{
    id: string
    item_type: string
    data: Record<string, unknown>
    confidence: number
    reviewed: boolean
    review_status: string | null
  }>
  status: string
}

export default function ExtractionReviewClient({ documentId, productName, items, status }: ReviewClientProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [localItems, setLocalItems] = useState(items)

  const handleAccept = async (itemId: string) => {
    await fetch(`/api/extraction/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: 'accepted' }),
    })

    setLocalItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, reviewed: true, review_status: 'accepted' } : i)
    )
  }

  const handleUpdate = async (itemId: string, data: Record<string, unknown>) => {
    await fetch(`/api/extraction/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, review_status: 'modified' }),
    })

    setLocalItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, data, reviewed: true, review_status: 'modified' } : i)
    )
  }

  const handleConfirmAll = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/extraction/${documentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        router.push('/pipeline/extract')
        router.refresh()
      }
    } finally {
      setConfirming(false)
    }
  }

  const handleRunAssessment = async () => {
    setAssessing(true)
    try {
      const res = await fetch('/api/compliance/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          product_name: productName || 'Unknown Product',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/pipeline/compliance/${data.assessment_id}`)
      } else {
        const err = await res.json()
        alert(err.error || 'Assessment failed')
      }
    } finally {
      setAssessing(false)
    }
  }

  const isConfirmed = status === 'confirmed'
  const reviewedCount = localItems.filter(i => i.reviewed).length

  // Group items by type
  const grouped = localItems.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = []
    acc[item.item_type].push(item)
    return acc
  }, {} as Record<string, typeof localItems>)

  const typeOrder = ['chemical', 'hazard', 'test_result', 'physical_property', 'traceability']
  const typeLabels: Record<string, string> = {
    chemical: 'Chemicals',
    hazard: 'Hazards',
    test_result: 'Test Results',
    physical_property: 'Physical Properties',
    traceability: 'Traceability',
  }

  return (
    <div className="space-y-6">
      {typeOrder.map((type) => {
        const typeItems = grouped[type]
        if (!typeItems || typeItems.length === 0) return null

        return (
          <div key={type}>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {typeLabels[type] || type} ({typeItems.length})
            </h3>
            <div className="space-y-2">
              {typeItems.map((item) => (
                <ExtractionItemCard
                  key={item.id}
                  item={item}
                  onAccept={handleAccept}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Action bar */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border bg-white/95 backdrop-blur-sm px-6 py-4 shadow-lg">
        <div className="text-sm text-slate-600">
          {reviewedCount}/{localItems.length} items reviewed
        </div>
        <div className="flex items-center gap-3">
          {!isConfirmed && (
            <Button
              onClick={handleConfirmAll}
              disabled={confirming}
              size="lg"
            >
              {confirming ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Save to Inventory</>
              )}
            </Button>
          )}
          <Button
            variant={isConfirmed ? 'default' : 'outline'}
            size="lg"
            onClick={handleRunAssessment}
            disabled={assessing}
          >
            {assessing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running Assessment...</>
            ) : (
              <><Shield className="h-4 w-4 mr-2" /> Run Compliance Assessment</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
