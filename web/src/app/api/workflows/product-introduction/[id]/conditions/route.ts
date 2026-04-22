import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'
import { isConditionCategory } from '@/lib/workflows/product-introduction'

type PostBody = {
  category: string
  body: string
  step_id?: string
}

// POST /api/workflows/product-introduction/[id]/conditions
// Append a condition to the workflow's conditions log. Any user with
// access to the workflow can add (enforced by RLS + existence check).
// Append-only — no PATCH/DELETE exposed.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isConditionCategory(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const { data: workflow } = await auth.supabase
    .from('product_introduction_workflows')
    .select('id, plant_id')
    .eq('id', id)
    .maybeSingle()
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  // Resolve the caller's role at the plant (if any) — used to attribute
  // the condition. If the caller holds multiple roles, and step_id was
  // supplied, prefer the role matching the step.
  let resolvedRole: string | null = null
  if (body.step_id) {
    const { data: step } = await auth.supabase
      .from('workflow_steps')
      .select('id, role, workflow_id')
      .eq('id', body.step_id)
      .maybeSingle()
    if (step && step.workflow_id === id) {
      const { data: hasRole } = await auth.supabase
        .from('plant_role_assignments')
        .select('role')
        .eq('plant_id', workflow.plant_id)
        .eq('user_id', auth.user.id)
        .eq('role', step.role)
        .maybeSingle()
      if (hasRole) resolvedRole = step.role
    }
  }

  if (!resolvedRole) {
    const { data: anyRole } = await auth.supabase
      .from('plant_role_assignments')
      .select('role')
      .eq('plant_id', workflow.plant_id)
      .eq('user_id', auth.user.id)
      .limit(1)
      .maybeSingle()
    resolvedRole = anyRole?.role ?? null
  }

  if (!resolvedRole && !auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'You must hold a role at this plant to add conditions' },
      { status: 403 }
    )
  }

  const { data: inserted, error } = await auth.supabase
    .from('workflow_conditions')
    .insert({
      workflow_id: id,
      step_id: body.step_id ?? null,
      role: resolvedRole,
      user_id: auth.user.id,
      category: body.category,
      body: body.body.trim(),
    })
    .select('*')
    .single()

  if (error || !inserted) {
    console.error('Append condition error:', error)
    return NextResponse.json({ error: 'Failed to append condition' }, { status: 500 })
  }

  return NextResponse.json(inserted, { status: 201 })
}
