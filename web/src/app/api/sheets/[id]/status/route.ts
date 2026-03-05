import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['draft', 'in_progress', 'submitted', 'approved', 'flagged', 'rejected']

/**
 * PATCH /api/sheets/[id]/status
 * Update sheet status (e.g., submitted, approved)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sheetId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body as { status: string }

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  // Verify user has access
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, company_id, requesting_company_id')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
  }

  if (userData?.company_id) {
    const hasAccess =
      sheet.company_id === userData.company_id ||
      sheet.requesting_company_id === userData.company_id
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('sheets')
    .update({ status, modified_at: new Date().toISOString() })
    .eq('id', sheetId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
