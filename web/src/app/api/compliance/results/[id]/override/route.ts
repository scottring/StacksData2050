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

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Resolve the owning assessment's company via the result's assessment_id
  const { data: existingResult } = await supabase
    .from('compliance_results')
    .select('id, assessment_id')
    .eq('id', id)
    .single()

  if (!existingResult) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 })
  }

  const { data: assessment } = await supabase
    .from('compliance_assessments')
    .select('company_id')
    .eq('id', existingResult.assessment_id)
    .single()

  if (!assessment || assessment.company_id !== userData.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
