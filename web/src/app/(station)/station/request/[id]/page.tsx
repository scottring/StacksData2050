import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StationRequestDetail from './request-detail-client'

export default async function StationRequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch request with related data
  const { data: request } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      created_at,
      processed,
      comment_requestor,
      comment_supplier,
      sheet_id,
      sheet:sheets(
        id,
        name,
        status,
        company_id,
        requesting_company_id
      ),
      requestor:companies!requestor_id(
        id,
        name,
        logo_url
      )
    `)
    .eq('id', id)
    .single()

  if (!request || !request.sheet) {
    redirect('/station')
  }

  const sheet = request.sheet as unknown as Record<string, unknown>
  const requestor = request.requestor as unknown as Record<string, unknown>
  const sheetId = sheet.id as string

  // Get tags for this sheet (determines which parameters are needed)
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag:tags(id, name)')
    .eq('sheet_id', sheetId)

  const tags = (sheetTags || []).map((st) => {
    const tag = st.tag as unknown as Record<string, unknown>
    return { id: tag.id as string, name: tag.name as string }
  })

  const tagIds = tags.map((t) => t.id)

  // Get question count for these tags
  let questionCount = 0
  if (tagIds.length > 0) {
    const { data: questionTags } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds)

    const uniqueQuestionIds = new Set((questionTags || []).map((qt) => qt.question_id))
    questionCount = uniqueQuestionIds.size
  }

  // Get existing extraction documents for this sheet
  const { data: extractionDocs } = await supabase
    .from('extraction_documents')
    .select('id, file_name, document_type, status, created_at, extraction_completed_at')
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: false })

  // Get extraction items count
  const docIds = (extractionDocs || []).map((d) => d.id)
  let extractionItemCount = 0
  if (docIds.length > 0) {
    const { count } = await supabase
      .from('extraction_items')
      .select('id', { count: 'exact', head: true })
      .in('document_id', docIds)
    extractionItemCount = count || 0
  }

  // Get answers count (how many parameters are already filled)
  const { count: answersCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  return (
    <StationRequestDetail
      request={{
        id: request.id,
        productName: (request.product_name as string) || (sheet.name as string) || 'Unknown',
        createdAt: request.created_at as string,
        customerComment: request.comment_requestor as string | null,
        sheetId,
        sheetStatus: sheet.status as string,
        customerName: (requestor?.name as string) || 'Unknown',
        customerLogo: requestor?.logo_url as string | null,
        tags: tags.map((t) => t.name),
        questionCount,
        docsUploaded: (extractionDocs || []).length,
        extractionItemCount,
        answersCount: answersCount || 0,
      }}
      extractionDocs={(extractionDocs || []).map((d) => ({
        id: d.id,
        fileName: d.file_name,
        documentType: d.document_type,
        status: d.status,
        createdAt: d.created_at,
      }))}
    />
  )
}
