import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companyId = userData.company_id

  // Get recent assessments
  const { data: assessments } = await supabase
    .from('compliance_assessments')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get aggregate stats
  const { count: totalAssessments } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const { count: passingAssessments } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('overall_status', 'pass')

  const { count: failingAssessments } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('overall_status', 'fail')

  const { count: warningAssessments } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('overall_status', 'warning')

  // Get framework-level stats from results
  const { data: frameworks } = await supabase
    .from('regulatory_frameworks')
    .select('id, code, name, jurisdiction')
    .eq('active', true)

  return NextResponse.json({
    assessments: assessments || [],
    stats: {
      total: totalAssessments ?? 0,
      passing: passingAssessments ?? 0,
      failing: failingAssessments ?? 0,
      warning: warningAssessments ?? 0,
    },
    frameworks: frameworks || [],
  })
}
