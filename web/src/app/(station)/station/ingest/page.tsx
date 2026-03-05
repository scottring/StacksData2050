import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IngestClient from './ingest-client'

export default async function StationIngestPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-zinc-500 text-sm">No company associated with your account.</p>
      </div>
    )
  }

  // Get recently processed questionnaires for this supplier
  const { data: recentDocs } = await supabase
    .from('extraction_documents')
    .select('id, file_name, document_type, status, created_at, product_name, supplier_name')
    .eq('company_id', profile.company_id)
    .in('document_type', ['questionnaire', 'questionnaire_filled'])
    .neq('status', 'superseded')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <IngestClient
      recentDocs={(recentDocs || []).map((d) => ({
        id: d.id,
        fileName: d.file_name,
        status: d.status,
        createdAt: d.created_at,
        title: d.product_name || d.file_name,
      }))}
    />
  )
}
