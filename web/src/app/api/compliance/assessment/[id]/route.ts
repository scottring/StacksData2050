import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Fetch assessment
  const { data: assessment, error } = await supabase
    .from('compliance_assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  if (!userData?.company_id || assessment.company_id !== userData.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch results
  const { data: results } = await supabase
    .from('compliance_results')
    .select('*')
    .eq('assessment_id', id)

  // Fetch frameworks for grouping
  const { data: frameworks } = await supabase
    .from('regulatory_frameworks')
    .select('*')
    .eq('active', true)

  return NextResponse.json({
    assessment,
    results: results || [],
    frameworks: frameworks || [],
  })
}
