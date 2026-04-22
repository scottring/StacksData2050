import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'
import { canTransition } from '@/lib/workflows/product-introduction'

// POST /api/workflows/product-introduction/[id]/submit
// Requestor submits a draft. Transitions draft → submitted → triage.
// Only the requestor (or super-admin) may submit.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: workflow, error: fetchError } = await auth.supabase
    .from('product_introduction_workflows')
    .select('id, status, requestor_user_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    console.error('Fetch workflow error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 })
  }
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (workflow.requestor_user_id !== auth.user.id && !auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Only the requestor may submit' }, { status: 403 })
  }

  if (!canTransition(workflow.status, 'submitted')) {
    return NextResponse.json(
      { error: `Cannot submit from status "${workflow.status}"` },
      { status: 409 }
    )
  }

  // draft → submitted → triage, recorded in a single update with submitted_at set.
  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await auth.supabase
    .from('product_introduction_workflows')
    .update({ status: 'triage', submitted_at: now })
    .eq('id', id)
    .eq('status', 'draft')
    .select('*')
    .single()

  if (updateError || !updated) {
    console.error('Submit workflow error:', updateError)
    return NextResponse.json({ error: 'Failed to submit workflow' }, { status: 500 })
  }

  return NextResponse.json(updated)
}
