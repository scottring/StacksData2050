import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommandClient from './command-client'

export default async function CommandPage() {
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

  const companyId = profile.company_id

  // Fetch recent requests (as customer/requestor)
  const { data: outgoingRequests } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      created_at,
      processed,
      comment_requestor,
      sheet:sheets(id, name, status),
      supplier:companies!requesting_from_id(id, name, logo_url)
    `)
    .eq('requestor_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch incoming requests (as supplier)
  const { data: incomingRequests } = await supabase
    .from('requests')
    .select(`
      id,
      product_name,
      created_at,
      processed,
      comment_requestor,
      sheet:sheets(id, name, status),
      requestor:companies!requestor_id(id, name, logo_url)
    `)
    .eq('requesting_from_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get company info
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .eq('id', companyId)
    .single()

  // Format for client
  const formatRequest = (r: Record<string, unknown>, direction: 'outgoing' | 'incoming') => {
    const sheet = r.sheet as unknown as Record<string, unknown> | null
    const partner = direction === 'outgoing'
      ? r.supplier as unknown as Record<string, unknown> | null
      : r.requestor as unknown as Record<string, unknown> | null

    return {
      id: r.id as string,
      productName: (r.product_name as string) || (sheet?.name as string) || 'Unknown',
      createdAt: r.created_at as string,
      processed: r.processed as boolean,
      sheetId: sheet?.id as string,
      sheetStatus: (sheet?.status as string) || 'draft',
      partnerName: (partner?.name as string) || 'Unknown',
      partnerLogo: partner?.logo_url as string | null,
      direction,
    }
  }

  const allRequests = [
    ...(outgoingRequests || []).map((r) => formatRequest(r as Record<string, unknown>, 'outgoing')),
    ...(incomingRequests || []).map((r) => formatRequest(r as Record<string, unknown>, 'incoming')),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <CommandClient
      requests={allRequests}
      companyName={company?.name || 'Your Company'}
    />
  )
}
