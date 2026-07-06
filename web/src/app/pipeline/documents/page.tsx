import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import DocumentTypeIcon, { getDocumentTypeLabel } from '@/components/pipeline/document-type-icon'
import DocumentListClient from './documents-client'

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  generating: { icon: Clock, color: 'text-blue-500 bg-blue-100', label: 'Generating' },
  ready: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-100', label: 'Ready' },
  failed: { icon: AlertCircle, color: 'text-red-500 bg-red-100', label: 'Failed' },
}

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('generated_documents')
    .select('*, compliance_assessments(product_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get stats
  const { count: totalCount } = await supabase
    .from('generated_documents')
    .select('*', { count: 'exact', head: true })

  const { count: readyCount } = await supabase
    .from('generated_documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ready')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-violet-500" />
          <h1 className="text-2xl font-bold text-slate-900">Generated Documents</h1>
        </div>
        <p className="text-slate-500">
          Compliance documents generated from assessments. Download PDFs and JSON-LD files.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4 px-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{totalCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{readyCount ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Ready for Download</div>
          </CardContent>
        </Card>
      </div>

      {/* Document generation (client component) */}
      <DocumentListClient />

      {/* Document list */}
      {documents && documents.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Document Library</h2>
          <div className="space-y-2">
            {documents.map((doc) => {
              const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.generating
              const productName = (doc.compliance_assessments as Record<string, unknown>)?.product_name as string || 'Unknown'

              return (
                <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <DocumentTypeIcon type={doc.document_type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {doc.file_name || getDocumentTypeLabel(doc.document_type)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {productName} &middot;{' '}
                        {getDocumentTypeLabel(doc.document_type)} &middot;{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {status.label}
                    </Badge>
                    {doc.status === 'ready' && (
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="text-blue-500 hover:text-blue-700"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No documents generated yet. Run a compliance assessment first, then generate documents from the assessment detail page.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
