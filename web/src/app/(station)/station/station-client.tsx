'use client'

import Link from 'next/link'
import { FileUp, Clock, CheckCircle2, AlertTriangle, ChevronRight, Building2 } from 'lucide-react'

interface StationRequest {
  id: string
  productName: string
  createdAt: string
  processed: boolean
  customerComment: string | null
  sheetId: string
  sheetStatus: string
  customerName: string
  customerLogo: string | null
  tags: string[]
  docsUploaded: number
}

interface StationRequestListProps {
  requests: StationRequest[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Not Started', color: 'text-zinc-400 bg-zinc-400/10 ring-zinc-400/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-amber-400 bg-amber-400/10 ring-amber-400/20', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-400 bg-blue-400/10 ring-blue-400/20', icon: CheckCircle2 },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-400/10 ring-emerald-400/20', icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'text-emerald-400 bg-emerald-400/10 ring-emerald-400/20', icon: CheckCircle2 },
  flagged: { label: 'Needs Attention', color: 'text-rose-400 bg-rose-400/10 ring-rose-400/20', icon: AlertTriangle },
  rejected: { label: 'Rejected', color: 'text-rose-400 bg-rose-400/10 ring-rose-400/20', icon: AlertTriangle },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function StationRequestList({ requests }: StationRequestListProps) {
  const pending = requests.filter((r) => ['draft', 'in_progress', 'flagged'].includes(r.sheetStatus))
  const completed = requests.filter((r) => ['submitted', 'approved', 'completed'].includes(r.sheetStatus))

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white">
          Incoming Requests
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload documents to respond to customer compliance requests
        </p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
            <FileUp className="h-7 w-7 text-zinc-600" />
          </div>
          <h2 className="text-lg font-medium text-zinc-300">No requests yet</h2>
          <p className="mt-1 text-sm text-zinc-600 max-w-sm">
            When customers send compliance data requests, they will appear here.
          </p>
        </div>
      )}
    </div>
  )
}

function RequestCard({ request }: { request: StationRequest }) {
  const status = STATUS_CONFIG[request.sheetStatus] || STATUS_CONFIG.draft
  const StatusIcon = status.icon
  const isPending = ['draft', 'in_progress', 'flagged'].includes(request.sheetStatus)

  return (
    <Link
      href={`/station/request/${request.id}`}
      className="group block rounded-2xl bg-zinc-900/60 border border-white/6 hover:border-emerald-500/20 hover:bg-zinc-900/80 transition-all p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {/* Customer logo */}
          <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {request.customerLogo ? (
              <img src={request.customerLogo} alt="" className="h-10 w-10 object-cover" />
            ) : (
              <Building2 className="h-4 w-4 text-zinc-600" />
            )}
          </div>

          <div className="min-w-0">
            {/* Product name */}
            <h3 className="text-base font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
              {request.productName}
            </h3>
            {/* Customer */}
            <p className="text-sm text-zinc-500 mt-0.5">
              from <span className="text-zinc-400">{request.customerName}</span>
              <span className="text-zinc-700 mx-2">&middot;</span>
              {formatDate(request.createdAt)}
            </p>
            {/* Tags */}
            {request.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {request.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 ring-1 ring-emerald-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {/* Customer comment */}
            {request.customerComment && (
              <p className="mt-2 text-xs text-zinc-600 italic truncate max-w-md">
                &ldquo;{request.customerComment}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Docs uploaded count */}
          {request.docsUploaded > 0 && (
            <span className="text-[10px] font-mono text-zinc-600">
              {request.docsUploaded} doc{request.docsUploaded !== 1 ? 's' : ''}
            </span>
          )}
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ring-1 ${status.color}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
          {/* Arrow */}
          {isPending && (
            <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>
      </div>
    </Link>
  )
}
