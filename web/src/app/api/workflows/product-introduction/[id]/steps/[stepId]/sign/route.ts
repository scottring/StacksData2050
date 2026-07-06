import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'

type SignBody = {
  decision: 'approved' | 'returned'
  return_reason?: string
}

// POST /api/workflows/product-introduction/[id]/steps/[stepId]/sign
// Reviewer decides on their step.
// approved: if the final pending step, workflow → approved. Otherwise,
//           the next step stays pending (already is) and we just record.
// returned: workflow → returned, step decision = returned, reason stored.
//
// Access control: the caller must hold the step's role at the workflow's
// plant via plant_role_assignments.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, stepId } = await params

  let body: SignBody
  try {
    body = (await request.json()) as SignBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!['approved', 'returned'].includes(body.decision)) {
    return NextResponse.json(
      { error: 'decision must be approved or returned' },
      { status: 400 }
    )
  }
  if (body.decision === 'returned' && !body.return_reason) {
    return NextResponse.json(
      { error: 'return_reason is required when returning' },
      { status: 400 }
    )
  }

  const { data: workflow } = await auth.supabase
    .from('product_introduction_workflows')
    .select('id, status, plant_id')
    .eq('id', id)
    .maybeSingle()
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  if (workflow.status !== 'in_review') {
    return NextResponse.json(
      { error: `Workflow is in "${workflow.status}", not in_review` },
      { status: 409 }
    )
  }

  const { data: step } = await auth.supabase
    .from('workflow_steps')
    .select('id, workflow_id, role, decision, step_order')
    .eq('id', stepId)
    .maybeSingle()
  if (!step || step.workflow_id !== id) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 })
  }
  if (step.decision !== 'pending') {
    return NextResponse.json(
      { error: `Step already ${step.decision}` },
      { status: 409 }
    )
  }

  // Caller must hold this step's role at the workflow's plant.
  const { data: hasRole } = await auth.supabase
    .from('plant_role_assignments')
    .select('id')
    .eq('plant_id', workflow.plant_id)
    .eq('user_id', auth.user.id)
    .eq('role', step.role)
    .maybeSingle()
  if (!hasRole && !auth.isSuperAdmin) {
    return NextResponse.json(
      { error: `You do not hold the ${step.role} role at this plant` },
      { status: 403 }
    )
  }

  const now = new Date().toISOString()

  if (body.decision === 'returned') {
    const { error: stepError } = await auth.supabase
      .from('workflow_steps')
      .update({
        decision: 'returned',
        signed_at: now,
        signed_by_user_id: auth.user.id,
        return_reason: body.return_reason,
      })
      .eq('id', stepId)
    if (stepError) {
      console.error('Step return error:', stepError)
      return NextResponse.json({ error: 'Failed to return step' }, { status: 500 })
    }

    const { data: updated, error: wfError } = await auth.supabase
      .from('product_introduction_workflows')
      .update({ status: 'returned' })
      .eq('id', id)
      .select('*')
      .single()
    if (wfError || !updated) {
      console.error('Workflow return error:', wfError)
      return NextResponse.json({ error: 'Failed to return workflow' }, { status: 500 })
    }
    return NextResponse.json({ workflow: updated, step_id: stepId })
  }

  // approved: mark this step, then check if any pending remain.
  const { error: stepError } = await auth.supabase
    .from('workflow_steps')
    .update({
      decision: 'approved',
      signed_at: now,
      signed_by_user_id: auth.user.id,
    })
    .eq('id', stepId)
  if (stepError) {
    console.error('Step approve error:', stepError)
    return NextResponse.json({ error: 'Failed to approve step' }, { status: 500 })
  }

  const { count: pendingCount } = await auth.supabase
    .from('workflow_steps')
    .select('id', { count: 'exact', head: true })
    .eq('workflow_id', id)
    .eq('decision', 'pending')

  if ((pendingCount ?? 0) === 0) {
    const { data: updated, error: wfError } = await auth.supabase
      .from('product_introduction_workflows')
      .update({ status: 'approved', approved_at: now })
      .eq('id', id)
      .select('*')
      .single()
    if (wfError || !updated) {
      console.error('Workflow approve error:', wfError)
      return NextResponse.json({ error: 'Failed to approve workflow' }, { status: 500 })
    }
    return NextResponse.json({ workflow: updated, step_id: stepId, workflow_approved: true })
  }

  return NextResponse.json({ step_id: stepId, workflow_approved: false })
}
