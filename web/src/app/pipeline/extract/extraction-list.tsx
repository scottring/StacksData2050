'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle2, AlertCircle, Loader2, Trash2, X } from 'lucide-react'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  uploaded: { icon: Clock, color: 'text-slate-500 bg-slate-100', label: 'Uploaded' },
  processing: { icon: Loader2, color: 'text-blue-500 bg-blue-100', label: 'Processing' },
  extracted: { icon: CheckCircle2, color: 'text-amber-500 bg-amber-100', label: 'Review' },
  confirmed: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-100', label: 'Confirmed' },
  failed: { icon: AlertCircle, color: 'text-red-500 bg-red-100', label: 'Failed' },
}

interface ExtractionDocument {
  id: string
  file_name: string
  document_type: string
  product_name: string | null
  status: string
  created_at: string
  extraction_duration_ms: number | null
}

export default function ExtractionList({ initialDocuments }: { initialDocuments: ExtractionDocument[] }) {
  const router = useRouter()
  const [documents, setDocuments] = useState(initialDocuments)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Delete this extraction? This cannot be undone.')) return

    setDeleting(docId)
    try {
      const res = await fetch(`/api/extraction/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId))
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirm(`Delete all ${documents.length} extractions? This cannot be undone.`)) return

    for (const doc of documents) {
      await fetch(`/api/extraction/${doc.id}`, { method: 'DELETE' })
    }
    setDocuments([])
    router.refresh()
  }

  if (documents.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Recent Extractions</h2>
        <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-red-500" onClick={handleClearAll}>
          <X className="h-3 w-3 mr-1" /> Clear All
        </Button>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded
          const StatusIcon = status.icon
          return (
            <Link key={doc.id} href={`/pipeline/extract/${doc.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${status.color}`}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {doc.file_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {doc.document_type.toUpperCase()} &middot;{' '}
                      {doc.product_name || 'Processing...'} &middot;{' '}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {status.label}
                  </Badge>
                  {doc.extraction_duration_ms && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {(doc.extraction_duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    disabled={deleting === doc.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500"
                  >
                    {deleting === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
