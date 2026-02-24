import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: documents } = await supabase
    .from('generated_documents')
    .select('*, compliance_assessments(product_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ documents: documents || [] })
}
