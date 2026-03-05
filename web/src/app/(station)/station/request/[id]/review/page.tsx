import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewClient from './review-client'

export default async function StationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch request with sheet info
  const { data: request } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      sheet_id,
      sheet:sheets(id, name, status, company_id),
      requestor:companies!requestor_id(id, name, logo_url)
    `)
    .eq('id', id)
    .single()

  if (!request || !request.sheet) {
    redirect('/station')
  }

  const sheet = request.sheet as unknown as Record<string, unknown>
  const requestor = request.requestor as unknown as Record<string, unknown>
  const sheetId = sheet.id as string

  // Get tags for display
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag:tags(name)')
    .eq('sheet_id', sheetId)

  const tags = (sheetTags || []).map((st) => {
    const tag = st.tag as unknown as Record<string, unknown>
    return tag?.name as string
  }).filter(Boolean)

  // Get extraction documents for source references
  const { data: extractionDocs } = await supabase
    .from('extraction_documents')
    .select('id, file_name, document_type, status')
    .eq('sheet_id', sheetId)

  const docMap: Record<string, { fileName: string; documentType: string }> = {}
  for (const doc of extractionDocs || []) {
    docMap[doc.id] = { fileName: doc.file_name, documentType: doc.document_type }
  }

  return (
    <ReviewClient
      requestId={id}
      productName={(request.product_name as string) || (sheet.name as string) || 'Unknown'}
      customerName={(requestor?.name as string) || 'Unknown'}
      customerLogo={requestor?.logo_url as string | null}
      sheetId={sheetId}
      tags={tags}
      docMap={docMap}
    />
  )
}
