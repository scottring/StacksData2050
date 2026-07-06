import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StationRequestList from './station-client'

export default async function StationPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's company
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

  // Fetch incoming requests for this supplier
  const { data: requests } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      created_at,
      processed,
      comment_requestor,
      sheet:sheets(
        id,
        name,
        status,
        created_at,
        requesting_company_id
      ),
      requestor:companies!requestor_id(
        id,
        name,
        logo_url
      )
    `)
    .eq('requesting_from_id', profile.company_id)
    .order('created_at', { ascending: false })

  // Get tags for each sheet
  const sheetIds = (requests || [])
    .map((r: Record<string, unknown>) => {
      const sheet = r.sheet as Record<string, unknown> | null
      return sheet?.id as string
    })
    .filter(Boolean)

  let sheetTagsMap: Record<string, string[]> = {}
  if (sheetIds.length > 0) {
    const { data: sheetTags } = await supabase
      .from('sheet_tags')
      .select('sheet_id, tag:tags(name)')
      .in('sheet_id', sheetIds)

    if (sheetTags) {
      for (const st of sheetTags) {
        const sheetId = st.sheet_id as string
        const tagName = (st.tag as unknown as Record<string, unknown>)?.name as string
        if (!sheetTagsMap[sheetId]) sheetTagsMap[sheetId] = []
        if (tagName) sheetTagsMap[sheetId].push(tagName)
      }
    }
  }

  // Count extraction documents per sheet
  let extractionCounts: Record<string, number> = {}
  if (sheetIds.length > 0) {
    const { data: docs } = await supabase
      .from('extraction_documents')
      .select('sheet_id')
      .in('sheet_id', sheetIds)

    if (docs) {
      for (const doc of docs) {
        const sid = doc.sheet_id as string
        extractionCounts[sid] = (extractionCounts[sid] || 0) + 1
      }
    }
  }

  const formattedRequests = (requests || []).map((r: Record<string, unknown>) => {
    const sheet = r.sheet as Record<string, unknown> | null
    const requestor = r.requestor as Record<string, unknown> | null
    const sheetId = sheet?.id as string

    return {
      id: r.id as string,
      productName: (r.product_name as string) || (sheet?.name as string) || 'Unknown Product',
      createdAt: r.created_at as string,
      processed: r.processed as boolean,
      customerComment: r.comment_requestor as string | null,
      sheetId: sheetId,
      sheetStatus: (sheet?.status as string) || 'draft',
      customerName: (requestor?.name as string) || 'Unknown',
      customerLogo: requestor?.logo_url as string | null,
      tags: sheetTagsMap[sheetId] || [],
      docsUploaded: extractionCounts[sheetId] || 0,
    }
  })

  return <StationRequestList requests={formattedRequests} />
}
