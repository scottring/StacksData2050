import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const { override_reason } = body

  if (!override_reason) {
    return NextResponse.json({ error: 'override_reason is required' }, { status: 400 })
  }

  // Update the result
  const { data: result, error } = await supabase
    .from('compliance_results')
    .update({
      overridden: true,
      override_reason,
      overridden_by: user.id,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !result) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 })
  }

  return NextResponse.json({ result })
}
