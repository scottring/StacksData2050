import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authenticated-route'
import type { WorkflowStatus } from '@/lib/workflows/product-introduction'

// GET /api/workflows/product-introduction
// Query:
//   ?plant=<plant_id>      — filter to one plant
//   ?status=<status>       — filter by workflow status
//   ?inbox=true            — only workflows with a step currently
//                            pending for the caller
//
// Returns a lightweight list view. Use GET /[id] for full detail.
export async function GET(request: Request) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const plantId = url.searchParams.get('plant')
  const status = url.searchParams.get('status') as WorkflowStatus | null
  const inbox = url.searchParams.get('inbox') === 'true'

  let query = auth.supabase
    .from('product_introduction_workflows')
    .select(
      `id, company_id, plant_id, sheet_id, requestor_user_id, status,
       created_at, updated_at, submitted_at, approved_at,
       plants:plant_id ( id, code, name ),
       sheets:sheet_id ( id, name )`
    )
    .order('updated_at', { ascending: false })

  if (plantId) query = query.eq('plant_id', plantId)
  if (status) query = query.eq('status', status)

  const { data: workflows, error } = await query
  if (error) {
    console.error('List workflows error:', error)
    return NextResponse.json({ error: 'Failed to list workflows' }, { status: 500 })
  }

  if (!inbox) return NextResponse.json(workflows ?? [])

  // Inbox filter: workflows in 'in_review' with a pending step whose role
  // is held by the current user at the workflow's plant.
  const activeWorkflows = (workflows ?? []).filter((w) => w.status === 'in_review')
  if (activeWorkflows.length === 0) return NextResponse.json([])

  const { data: myRoles } = await auth.supabase
    .from('plant_role_assignments')
    .select('plant_id, role')
    .eq('user_id', auth.user.id)

  const rolesByPlant = new Map<string, Set<string>>()
  for (const r of myRoles ?? []) {
    if (!rolesByPlant.has(r.plant_id)) rolesByPlant.set(r.plant_id, new Set())
    rolesByPlant.get(r.plant_id)!.add(r.role)
  }

  const workflowIds = activeWorkflows.map((w) => w.id)
  const { data: pendingSteps } = await auth.supabase
    .from('workflow_steps')
    .select('workflow_id, role')
    .in('workflow_id', workflowIds)
    .eq('decision', 'pending')

  const pendingByWorkflow = new Map<string, string[]>()
  for (const s of pendingSteps ?? []) {
    if (!pendingByWorkflow.has(s.workflow_id)) pendingByWorkflow.set(s.workflow_id, [])
    pendingByWorkflow.get(s.workflow_id)!.push(s.role)
  }

  const inboxWorkflows = activeWorkflows.filter((w) => {
    const pending = pendingByWorkflow.get(w.id) ?? []
    const myPlantRoles = rolesByPlant.get(w.plant_id) ?? new Set()
    return pending.some((role) => myPlantRoles.has(role))
  })

  return NextResponse.json(inboxWorkflows)
}

type CreateBody = {
  sheet_id: string
  plant_id: string
}

// POST /api/workflows/product-introduction
// Creates a draft workflow for a sheet at a plant. The caller becomes the
// requestor. One draft workflow per sheet/plant pair is allowed.
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.sheet_id || !body.plant_id) {
    return NextResponse.json(
      { error: 'sheet_id and plant_id are required' },
      { status: 400 }
    )
  }

  // Verify the sheet belongs to the caller's company (RLS will also block,
  // but surface a clean 404/403 here).
  const { data: sheet } = await auth.supabase
    .from('sheets')
    .select('id, company_id, requesting_company_id')
    .eq('id', body.sheet_id)
    .maybeSingle()
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  // Verify the plant belongs to the caller's company.
  const { data: plant } = await auth.supabase
    .from('plants')
    .select('id, company_id')
    .eq('id', body.plant_id)
    .maybeSingle()
  if (!plant) return NextResponse.json({ error: 'Plant not found' }, { status: 404 })
  if (plant.company_id !== auth.companyId && !auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Guard against duplicate drafts for the same sheet+plant.
  const { data: existing } = await auth.supabase
    .from('product_introduction_workflows')
    .select('id, status')
    .eq('sheet_id', body.sheet_id)
    .eq('plant_id', body.plant_id)
    .in('status', ['draft', 'submitted', 'triage', 'in_review', 'returned'])
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: 'An active workflow already exists for this sheet + plant', workflow_id: existing.id },
      { status: 409 }
    )
  }

  const { data: created, error: insertError } = await auth.supabase
    .from('product_introduction_workflows')
    .insert({
      company_id: plant.company_id,
      plant_id: body.plant_id,
      sheet_id: body.sheet_id,
      requestor_user_id: auth.user.id,
      status: 'draft',
    })
    .select('*')
    .single()

  if (insertError || !created) {
    console.error('Create workflow error:', insertError)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }

  return NextResponse.json(created, { status: 201 })
}
