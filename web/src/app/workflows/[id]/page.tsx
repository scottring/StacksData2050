import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import {
  WorkflowStepStrip,
  ROLE_LABELS,
  type StepStripItem,
} from '@/components/workflows/step-strip'
import {
  ConditionsLog,
  type ConditionEntry,
} from '@/components/workflows/conditions-log'
import { WorkflowActions } from '@/components/workflows/workflow-actions'
import { ProductDetailsCard } from '@/components/workflows/product-details-card'
import type {
  WorkflowRole,
  WorkflowStatus,
} from '@/lib/workflows/product-introduction'

type WorkflowDetail = {
  id: string
  company_id: string
  plant_id: string
  sheet_id: string
  requestor_user_id: string
  status: WorkflowStatus
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  zone_a_data: Record<string, unknown>
  zone_b_data: Record<string, unknown>
  plants: { id: string; code: string; name: string } | null
  sheets: { id: string; name: string } | null
  requestor: { id: string; full_name: string | null; email: string | null } | null
  steps: Array<
    StepStripItem & {
      return_reason: string | null
      owned_fields: string[]
      signed_by: { full_name: string | null; email: string | null } | null
    }
  >
  conditions: ConditionEntry[]
}

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  triage: 'Triage',
  in_review: 'In Review',
  approved: 'Approved',
  returned: 'Returned',
  rejected: 'Rejected',
}

function statusBadge(status: WorkflowStatus) {
  const color =
    status === 'approved'
      ? 'bg-green-100 text-green-800'
      : status === 'rejected'
        ? 'bg-red-100 text-red-800'
        : status === 'returned'
          ? 'bg-amber-100 text-amber-800'
          : status === 'in_review'
            ? 'bg-blue-100 text-blue-800'
            : status === 'triage'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
  return <Badge className={color}>{STATUS_LABELS[status]}</Badge>
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role === 'super_admin'
  const isAdminOrEditor =
    profile?.role === 'admin' || profile?.role === 'editor' || isSuperAdmin

  // Fetch via API-equivalent query to get the nested structure we need.
  const { data: workflow } = await supabase
    .from('product_introduction_workflows')
    .select(
      `id, company_id, plant_id, sheet_id, requestor_user_id, status,
       created_at, updated_at, submitted_at, approved_at,
       zone_a_data, zone_b_data,
       plants:plant_id ( id, code, name ),
       sheets:sheet_id ( id, name ),
       requestor:requestor_user_id ( id, full_name, email )`
    )
    .eq('id', id)
    .maybeSingle()

  if (!workflow) notFound()

  const { data: steps } = await supabase
    .from('workflow_steps')
    .select(
      `id, step_order, role, decision, signed_at, signed_by_user_id,
       return_reason, owned_fields,
       signed_by:signed_by_user_id ( full_name, email )`
    )
    .eq('workflow_id', id)
    .order('step_order', { ascending: true })

  const { data: conditions } = await supabase
    .from('workflow_conditions')
    .select(
      `id, step_id, role, user_id, category, body, created_at,
       user:user_id ( id, full_name, email )`
    )
    .eq('workflow_id', id)
    .order('created_at', { ascending: true })

  const detail: WorkflowDetail = {
    ...(workflow as unknown as Omit<WorkflowDetail, 'steps' | 'conditions'>),
    steps: (steps ?? []) as unknown as WorkflowDetail['steps'],
    conditions: (conditions ?? []) as unknown as ConditionEntry[],
  }

  // Caller context: roles held at this plant
  const { data: myRoles } = await supabase
    .from('plant_role_assignments')
    .select('role')
    .eq('plant_id', detail.plant_id)
    .eq('user_id', user.id)
  const myPlantRoles = new Set((myRoles ?? []).map((r) => r.role as WorkflowRole))

  const activeStep = detail.steps.find((s) => s.decision === 'pending') ?? null
  const canSignActive = activeStep ? myPlantRoles.has(activeStep.role) : false
  const isRequestor = detail.requestor_user_id === user.id
  const canTriage = isAdminOrEditor

  return (
    <AppLayout title={`Workflow · ${detail.sheets?.name ?? 'Unknown sheet'}`}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/workflows"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All workflows
          </Link>
          {statusBadge(detail.status)}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {detail.sheets?.name ?? 'Sheet'} → {detail.plants?.name ?? 'Plant'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Requestor</div>
              <div>{detail.requestor?.full_name ?? detail.requestor?.email ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Plant</div>
              <div>{detail.plants?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Submitted</div>
              <div>
                {detail.submitted_at
                  ? new Date(detail.submitted_at).toLocaleString()
                  : 'Not yet submitted'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Approved</div>
              <div>
                {detail.approved_at
                  ? new Date(detail.approved_at).toLocaleString()
                  : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        <ProductDetailsCard
          zoneA={(detail.zone_a_data ?? {}) as Record<string, unknown>}
          zoneB={(detail.zone_b_data ?? {}) as Record<string, unknown>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorkflowStepStrip steps={detail.steps} activeStepId={activeStep?.id} />

            {activeStep && detail.status === 'in_review' && (
              <div className="rounded-md border bg-blue-50/40 p-3 text-sm dark:bg-blue-950/20">
                <div className="font-medium">
                  Active step: {ROLE_LABELS[activeStep.role]}
                </div>
                {activeStep.owned_fields.length > 0 && (
                  <div className="mt-1 text-muted-foreground">
                    Fields this role edits: {activeStep.owned_fields.join(', ')}
                  </div>
                )}
              </div>
            )}

            <WorkflowActions
              workflowId={detail.id}
              status={detail.status}
              isRequestor={isRequestor}
              canTriage={canTriage}
              isSuperAdmin={isSuperAdmin}
              activeStep={
                activeStep ? { id: activeStep.id, role: ROLE_LABELS[activeStep.role] } : null
              }
              canSignActive={canSignActive}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conditions log</CardTitle>
          </CardHeader>
          <CardContent>
            <ConditionsLog
              workflowId={detail.id}
              entries={detail.conditions}
              canAdd={myPlantRoles.size > 0 || isAdminOrEditor}
            />
          </CardContent>
        </Card>

        {detail.status === 'returned' && (
          <Card className="border-amber-300">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900">Returned to requestor</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {detail.steps
                .filter((s) => s.decision === 'returned')
                .map((s) => (
                  <div key={s.id} className="mb-2">
                    <div className="font-medium">{ROLE_LABELS[s.role]}:</div>
                    <div className="whitespace-pre-wrap">
                      {s.return_reason ?? '(no reason given)'}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
