import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'

// GET /api/workflows/product-introduction/[id]
// Returns the workflow + ordered steps + conditions log.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: workflow, error } = await auth.supabase
    .from('product_introduction_workflows')
    .select(
      `id, company_id, plant_id, sheet_id, requestor_user_id, status,
       created_at, updated_at, submitted_at, approved_at,
       plants:plant_id ( id, code, name ),
       sheets:sheet_id ( id, name ),
       requestor:requestor_user_id ( id, full_name, email )`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Get workflow error:', error)
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 })
  }
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: steps } = await auth.supabase
    .from('workflow_steps')
    .select(
      `id, step_order, role, decision, signed_at, signed_by_user_id,
       return_reason, owned_fields, created_at, updated_at,
       signed_by:signed_by_user_id ( id, full_name, email )`
    )
    .eq('workflow_id', id)
    .order('step_order', { ascending: true })

  const { data: conditions } = await auth.supabase
    .from('workflow_conditions')
    .select(
      `id, step_id, role, user_id, category, body, created_at,
       user:user_id ( id, full_name, email )`
    )
    .eq('workflow_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    ...workflow,
    steps: steps ?? [],
    conditions: conditions ?? [],
  })
}
