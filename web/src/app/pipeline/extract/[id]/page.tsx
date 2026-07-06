import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, Zap } from 'lucide-react'
import ExtractionReviewClient from './review-client'

export default async function ExtractionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const { data: items } = await supabase
    .from('extraction_items')
    .select('*')
    .eq('document_id', id)
    .order('item_type')
    .order('created_at')

  return (
    <div className="space-y-6">
      {/* Document header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-slate-400" />
            <h1 className="text-xl font-bold text-slate-900">{doc.file_name}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Badge variant="outline">{doc.document_type.toUpperCase()}</Badge>
            {doc.product_name && <span>Product: <strong>{doc.product_name}</strong></span>}
            {doc.supplier_name && <span>Supplier: <strong>{doc.supplier_name}</strong></span>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          {doc.extraction_duration_ms && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(doc.extraction_duration_ms / 1000).toFixed(1)}s
            </div>
          )}
          {doc.extraction_token_count && (
            <div className="flex items-center gap-1 mt-1">
              <Zap className="h-3 w-3" />
              {doc.extraction_token_count.toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['chemical', 'hazard', 'test_result', 'physical_property', 'traceability'].map((type) => {
            const count = items.filter(i => i.item_type === type).length
            return (
              <Card key={type} className={count > 0 ? '' : 'opacity-50'}>
                <CardContent className="py-3 px-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {type.replace(/_/g, ' ')}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Error state */}
      {doc.status === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 px-4">
            <p className="text-sm text-red-700 font-medium">Extraction failed</p>
            {doc.extraction_error && (
              <p className="text-xs text-red-600 mt-1 font-mono">{doc.extraction_error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review items (client component) */}
      {items && items.length > 0 && (
        <ExtractionReviewClient
          documentId={id}
          productName={doc.product_name}
          items={items}
          status={doc.status}
        />
      )}

      {/* Empty state */}
      {doc.status === 'uploaded' && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Document uploaded but not yet processed. Go back to the extract page to process it.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
