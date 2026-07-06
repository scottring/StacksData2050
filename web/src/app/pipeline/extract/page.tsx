import { createClient } from '@/lib/supabase/server'
import { FileUp } from 'lucide-react'
import ExtractPageClient from './extract-client'
import ExtractionList from './extraction-list'

export default async function ExtractPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('extraction_documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileUp className="h-5 w-5 text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-900">Extract Documents</h1>
        </div>
        <p className="text-slate-500">
          Upload supplier documents and let Claude AI extract structured chemical, safety, and compliance data.
        </p>
      </div>

      {/* Upload zone (client component) */}
      <ExtractPageClient />

      {/* Previous extractions (client component with delete) */}
      {documents && documents.length > 0 && (
        <ExtractionList initialDocuments={documents} />
      )}
    </div>
  )
}
