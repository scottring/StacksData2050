import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'
import {
  canTransition,
  DEFAULT_REVIEW_STEP_ORDER,
  ROLE_OWNED_FIELDS,
} from '@/lib/workflows/product-introduction'

type TriageBody = {
  action: 'advance' | 'return' | 'reject'
  reason?: string
}

// POST /api/workflows/product-introduction/[id]/triage
// Christian (or any admin/editor/reviewer with plant access) triages a
// submitted workflow. Advance opens the review pipeline by creating
// workflow_steps in the default order. Return bounces to the requestor.
// Reject terminates.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: TriageBody
  try {
    body = (await request.json()) as TriageBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!['advance', 'return', 'reject'].includes(body.action)) {
    return NextResponse.json(
      { error: 'action must be advance, return, or reject' },
      { status: 400 }
    )
  }

  if ((body.action === 'return' || body.action === 'reject') && !body.reason) {
    return NextResponse.json(
      { error: 'reason is required for return or reject' },
      { status: 400 }
    )
  }

  const { data: workflow } = await auth.supabase
    .from('product_introduction_workflows')
    .select('id, status, plant_id, company_id')
    .eq('id', id)
    .maybeSingle()
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (workflow.status !== 'triage') {
    return NextResponse.json(
      { error: `Workflow is in "${workflow.status}", not triage` },
      { status: 409 }
    )
  }

  if (body.action === 'return') {
    if (!canTransition('triage', 'returned')) {
      return NextResponse.json({ error: 'Invalid transition' }, { status: 409 })
    }
    const { data: updated, error } = await auth.supabase
      .from('product_introduction_workflows')
      .update({ status: 'returned' })
      .eq('id', id)
      .select('*')
      .single()
    if (error || !updated) {
      console.error('Triage return error:', error)
      return NextResponse.json({ error: 'Failed to return workflow' }, { status: 500 })
    }
    return NextResponse.json(updated)
  }

  if (body.action === 'reject') {
    const { data: updated, error } = await auth.supabase
      .from('product_introduction_workflows')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select('*')
      .single()
    if (error || !updated) {
      console.error('Triage reject error:', error)
      return NextResponse.json({ error: 'Failed to reject workflow' }, { status: 500 })
    }
    return NextResponse.json(updated)
  }

  // advance: create steps from DEFAULT_REVIEW_STEP_ORDER, then move to in_review.
  // Skip roles that have no one assigned at this plant (logged; status set to 'skipped').
  const { data: assignments } = await auth.supabase
    .from('plant_role_assignments')
    .select('role, user_id')
    .eq('plant_id', workflow.plant_id)

  const rolesWithAssignees = new Set((assignments ?? []).map((a) => a.role))

  const stepRows = DEFAULT_REVIEW_STEP_ORDER.map((role, index) => {
    const hasAssignee = rolesWithAssignees.has(role)
    return {
      workflow_id: id,
      step_order: index + 1,
      role,
      decision: hasAssignee ? 'pending' : 'skipped',
      owned_fields: ROLE_OWNED_FIELDS[role] ?? [],
      signed_at: hasAssignee ? null : new Date().toISOString(),
    }
  })

  const { error: stepsError } = await auth.supabase
    .from('workflow_steps')
    .insert(stepRows)
  if (stepsError) {
    console.error('Create steps error:', stepsError)
    return NextResponse.json({ error: 'Failed to create workflow steps' }, { status: 500 })
  }

  // Edge case: if every step was skipped (no role has an assignee at this
  // plant), there's no one to sign. Auto-approve so the workflow isn't
  // permanently stuck in in_review with zero pending steps.
  const anyPending = stepRows.some((s) => s.decision === 'pending')
  const nextStatus = anyPending ? 'in_review' : 'approved'
  const update: Record<string, string | null> = { status: nextStatus }
  if (!anyPending) update.approved_at = new Date().toISOString()

  const { data: updated, error: advanceError } = await auth.supabase
    .from('product_introduction_workflows')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (advanceError || !updated) {
    console.error('Triage advance error:', advanceError)
    return NextResponse.json({ error: 'Failed to advance workflow' }, { status: 500 })
  }

  return NextResponse.json(updated)
}
