import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CustomerReviewClient from './review-client'

export default async function CustomerReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: requestId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the request
  const { data: request } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      created_at,
      sheet_id,
      sheet:sheets(id, name, status, company_id, requesting_company_id),
      supplier:companies!requesting_from_id(id, name, logo_url)
    `)
    .eq('id', requestId)
    .single()

  if (!request || !request.sheet) {
    redirect('/command')
  }

  const sheet = request.sheet as unknown as Record<string, unknown>
  const supplier = request.supplier as unknown as Record<string, unknown>
  const sheetId = sheet.id as string

  // Get tags
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag:tags(name)')
    .eq('sheet_id', sheetId)

  const tags = (sheetTags || []).map((st) => {
    const tag = st.tag as unknown as Record<string, unknown>
    return tag?.name as string
  }).filter(Boolean)

  // Get extraction documents (for source references)
  const { data: extractionDocs } = await supabase
    .from('extraction_documents')
    .select('id, file_name, document_type, status, product_name, supplier_name')
    .eq('sheet_id', sheetId)

  const docMap: Record<string, { fileName: string; documentType: string }> = {}
  for (const doc of extractionDocs || []) {
    docMap[doc.id] = { fileName: doc.file_name, documentType: doc.document_type }
  }

  return (
    <CustomerReviewClient
      requestId={requestId}
      productName={(request.product_name as string) || (sheet.name as string) || 'Unknown'}
      supplierName={(supplier?.name as string) || 'Unknown'}
      supplierLogo={supplier?.logo_url as string | null}
      sheetId={sheetId}
      sheetStatus={sheet.status as string}
      tags={tags}
      docMap={docMap}
    />
  )
}
