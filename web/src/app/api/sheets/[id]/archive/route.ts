import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/sheets/[id]/archive
 * Archive or restore a sheet. Only the requesting (customer) company can do
 * this; the sheet is hidden from its Supplier Products list, not deleted.
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
  const { archived } = body as { archived: unknown }
  if (typeof archived !== 'boolean') {
    return NextResponse.json({ error: 'archived must be true or false' }, { status: 400 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, requesting_company_id')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
  }

  if (!userData?.company_id || sheet.requesting_company_id !== userData.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // RLS limits updates to admins, editors and reviewers; a blocked update
  // returns no rows rather than an error.
  const { data: updated, error } = await supabase
    .from('sheets')
    .update({ mark_as_archived: archived, modified_at: new Date().toISOString() })
    .eq('id', sheetId)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'You do not have permission to change this sheet' }, { status: 403 })
  }

  return NextResponse.json({ success: true, archived })
}
