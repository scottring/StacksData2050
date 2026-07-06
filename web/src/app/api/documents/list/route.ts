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

  const { data: documents } = await supabase
    .from('generated_documents')
    .select('*, compliance_assessments(product_name)')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ documents: documents || [] })
}
