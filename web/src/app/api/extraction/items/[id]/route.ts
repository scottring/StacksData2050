import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { data, review_status } = body

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Fetch existing item to save original
  const { data: existing } = await supabase
    .from('extraction_items')
    .select('data, original_data, document_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('company_id')
    .eq('id', existing.document_id)
    .single()

  if (!userData?.company_id || !doc || doc.company_id !== userData.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updatePayload: Record<string, unknown> = {
    reviewed: true,
    review_status: review_status || 'modified',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }

  // Save original data before overwriting (only on first edit)
  if (data && !existing.original_data) {
    updatePayload.original_data = existing.data
  }

  if (data) {
    updatePayload.data = data
  }

  const { data: updated, error } = await supabase
    .from('extraction_items')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
