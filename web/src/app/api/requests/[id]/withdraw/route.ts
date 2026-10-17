import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Sheets in these states hold accepted data; withdrawing would hide it.
const NON_WITHDRAWABLE_STATUSES = ['approved', 'completed']

// POST /api/requests/[id]/withdraw
// Soft withdraw: sets withdrawn_at / withdrawn_by. The request, its sheet and
// any answers are kept. Only the requesting company (requests.requestor_id)
// or a super admin may withdraw.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    const auth = await getAuthenticatedUser()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = getServiceClient()
    const { data: req, error: fetchError } = await service
      .from('requests')
      .select('id, requestor_id, withdrawn_at, sheet:sheets(status)')
      .eq('id', requestId)
      .maybeSingle()

    if (fetchError) {
      console.error('Withdraw request fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to withdraw request' }, { status: 500 })
    }
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (!auth.isSuperAdmin && (!auth.companyId || req.requestor_id !== auth.companyId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (req.withdrawn_at) {
      return NextResponse.json({ success: true, withdrawn_at: req.withdrawn_at })
    }

    const sheet = req.sheet as unknown as { status: string | null } | null
    if (sheet?.status && NON_WITHDRAWABLE_STATUSES.includes(sheet.status)) {
      return NextResponse.json(
        { error: 'This request is already complete and cannot be withdrawn' },
        { status: 409 }
      )
    }

    const withdrawnAt = new Date().toISOString()
    const { error: updateError } = await service
      .from('requests')
      .update({ withdrawn_at: withdrawnAt, withdrawn_by: auth.user.id })
      .eq('id', requestId)

    if (updateError) {
      console.error('Withdraw request update error:', updateError)
      return NextResponse.json({ error: 'Failed to withdraw request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, withdrawn_at: withdrawnAt })
  } catch (error) {
    console.error('Withdraw request error:', error)
    return NextResponse.json({ error: 'Failed to withdraw request' }, { status: 500 })
  }
}
