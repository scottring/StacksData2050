import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WorkflowStatus } from '@/lib/workflows/product-introduction'

type WorkflowRow = {
  id: string
  status: WorkflowStatus
  updated_at: string
  submitted_at: string | null
  plants: { id: string; name: string; code: string } | null
  sheets: { id: string; name: string } | null
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

export default async function WorkflowsListPage() {
  const supabase = await createClient()

  const { data: workflows } = await supabase
    .from('product_introduction_workflows')
    .select(
      `id, status, updated_at, submitted_at,
       plants:plant_id ( id, name, code ),
       sheets:sheet_id ( id, name )`
    )
    .order('updated_at', { ascending: false })

  const rows = (workflows ?? []) as unknown as WorkflowRow[]

  const byStatus = {
    active: rows.filter((r) =>
      ['draft', 'submitted', 'triage', 'in_review', 'returned'].includes(r.status)
    ),
    done: rows.filter((r) => ['approved', 'rejected'].includes(r.status)),
  }

  return (
    <AppLayout title="Product Introduction Workflows">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active</CardTitle>
            <span className="text-sm text-muted-foreground">{byStatus.active.length}</span>
          </CardHeader>
          <CardContent className="p-0">
            <WorkflowTable rows={byStatus.active} emptyLabel="No active workflows." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Completed</CardTitle>
            <span className="text-sm text-muted-foreground">{byStatus.done.length}</span>
          </CardHeader>
          <CardContent className="p-0">
            <WorkflowTable rows={byStatus.done} emptyLabel="No completed workflows yet." />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function WorkflowTable({ rows, emptyLabel }: { rows: WorkflowRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground italic">{emptyLabel}</div>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Plant</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((w) => (
          <TableRow key={w.id}>
            <TableCell>
              <Link
                href={`/workflows/${w.id}`}
                className="font-medium hover:underline"
              >
                {w.sheets?.name ?? 'Unknown sheet'}
              </Link>
            </TableCell>
            <TableCell>{w.plants?.name ?? '—'}</TableCell>
            <TableCell>{statusBadge(w.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(w.updated_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
