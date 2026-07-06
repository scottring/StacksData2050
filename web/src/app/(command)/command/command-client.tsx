'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { RequestSheetDialog } from '@/components/sheets/request-sheet-dialog'
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Building2,
  ChevronRight,
} from 'lucide-react'
import type { CompanyNode, RequestArc } from '@/lib/geo'

const CommandCanvas = dynamic(
  () => import('@/components/command/CommandCanvas'),
  { ssr: false },
)

interface RequestItem {
  id: string
  productName: string
  createdAt: string
  processed: boolean
  sheetId: string
  sheetStatus: string
  partnerName: string
  partnerLogo: string | null
  direction: 'outgoing' | 'incoming'
}

interface CommandClientProps {
  requests: RequestItem[]
  companyName: string
  totals: { total: number; outgoing: number; incoming: number }
}

type FilterTab = 'all' | 'outgoing' | 'incoming'

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', cls: 'text-zinc-400 bg-zinc-500/10', icon: FileText },
  in_progress: { label: 'In Progress', cls: 'text-blue-400 bg-blue-500/10', icon: Clock },
  submitted: { label: 'Submitted', cls: 'text-amber-400 bg-amber-500/10', icon: ArrowUpRight },
  approved: { label: 'Approved', cls: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
  flagged: { label: 'Flagged', cls: 'text-rose-400 bg-rose-500/10', icon: AlertCircle },
  rejected: { label: 'Rejected', cls: 'text-rose-400 bg-rose-500/10', icon: AlertCircle },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${config.cls}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommandClient({ requests, companyName, totals }: CommandClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [globeData, setGlobeData] = useState<{ companies: CompanyNode[]; requests: RequestArc[] } | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  // Fetch globe data lazily (non-blocking)
  useState(() => {
    fetch('/api/command/network')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setGlobeData(data) })
      .catch(() => {})
  })

  const filteredRequests = useMemo(() => {
    let items = requests
    if (tab !== 'all') items = items.filter((r) => r.direction === tab)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.partnerName.toLowerCase().includes(q),
      )
    }
    return items
  }, [requests, tab, searchQuery])

  // Stats. Total/Sent/Received come from server-side aggregate counts (totals prop) so they
  // reflect the full requests table, not just the loaded window. Active and Attention still
  // derive from the loaded rows because they need sheet status, which the count queries don't carry.
  const stats = useMemo(() => {
    const active = requests.filter((r) => !['approved', 'rejected'].includes(r.sheetStatus))
    const attention = requests.filter((r) => r.sheetStatus === 'flagged' || r.sheetStatus === 'rejected')
    return {
      total: totals.total,
      outgoing: totals.outgoing,
      incoming: totals.incoming,
      active: active.length,
      attention: attention.length,
    }
  }, [requests, totals])

  return (
    <>
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Main dashboard content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Command Center
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{companyName}</p>
          </div>
          <button
            onClick={() => setRequestDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-400/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Requests</p>
            <p className="text-2xl font-display font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Active</p>
            <p className="text-2xl font-display font-bold text-amber-400 mt-1">{stats.active}</p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3 w-3 text-blue-400" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Sent</p>
            </div>
            <p className="text-2xl font-display font-bold text-blue-400 mt-1">{stats.outgoing}</p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="h-3 w-3 text-violet-400" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Received</p>
            </div>
            <p className="text-2xl font-display font-bold text-violet-400 mt-1">{stats.incoming}</p>
          </div>
        </div>

        {stats.attention > 0 && (
          <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 px-4 py-3 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <p className="text-sm text-rose-400">
              <span className="font-medium">{stats.attention}</span> request{stats.attention !== 1 ? 's' : ''} need{stats.attention === 1 ? 's' : ''} your attention
            </p>
          </div>
        )}

        {/* Filter + Search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-900/60 rounded-xl p-1 border border-white/6">
            {(['all', 'outgoing', 'incoming'] as FilterTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  tab === t
                    ? 'bg-white/8 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'all' ? 'All' : t === 'outgoing' ? 'Sent' : 'Received'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/60 border border-white/6 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 w-56"
            />
          </div>
        </div>

        {/* Request table */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/6 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_100px_100px_80px_32px] gap-4 px-5 py-3 border-b border-white/4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Product / Partner</span>
            <span>Status</span>
            <span>Direction</span>
            <span>Date</span>
            <span>Sheet</span>
            <span />
          </div>

          {/* Rows */}
          {filteredRequests.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-zinc-600">
                {searchQuery ? 'No requests match your search.' : 'No requests yet.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <Link
                key={req.id}
                href={req.direction === 'incoming' ? `/station/request/${req.id}` : `/command/review/${req.id}`}
                className="grid grid-cols-[1fr_140px_100px_100px_80px_32px] gap-4 items-center px-5 py-3.5 border-b border-white/3 hover:bg-white/2 transition-colors group"
              >
                {/* Product + Partner */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {req.partnerLogo ? (
                      <img src={req.partnerLogo} alt="" className="h-8 w-8 object-cover" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                      {req.productName}
                    </p>
                    <p className="text-[10px] text-zinc-600 truncate">{req.partnerName}</p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={req.sheetStatus} />
                </div>

                {/* Direction */}
                <div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                    req.direction === 'outgoing' ? 'text-blue-400' : 'text-violet-400'
                  }`}>
                    {req.direction === 'outgoing' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3" />
                    )}
                    {req.direction === 'outgoing' ? 'Sent' : 'Received'}
                  </span>
                </div>

                {/* Date */}
                <span className="text-xs text-zinc-600">{formatRelativeDate(req.createdAt)}</span>

                {/* Sheet link */}
                <span className="text-[10px] font-mono text-zinc-600 truncate">
                  {req.sheetId?.slice(0, 8)}
                </span>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Globe accent + quick info */}
      <aside className="hidden lg:flex w-80 flex-col border-l border-white/6 bg-zinc-900/30">
        {/* Mini globe */}
        <div className="h-72 relative overflow-hidden">
          {globeData && (
            <CommandCanvas
              companies={globeData.companies}
              requests={globeData.requests}
              selectedNodeId={null}
              selectedArcId={null}
              onNodeClick={() => {}}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-zinc-900/80 to-transparent" />
        </div>

        {/* Network legend */}
        <div className="px-5 py-4 border-b border-white/6">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Network</p>
          <div className="space-y-2">
            {[
              { color: 'bg-amber-400', label: 'Awaiting Response' },
              { color: 'bg-blue-400', label: 'Processing' },
              { color: 'bg-emerald-400', label: 'Complete' },
              { color: 'bg-rose-400', label: 'Needs Attention' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-[11px] text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Quick Actions</p>
          <Link
            href="/station"
            className="flex items-center gap-2.5 rounded-xl bg-white/4 hover:bg-white/6 border border-white/6 px-3.5 py-2.5 text-xs text-zinc-300 hover:text-white transition-colors group"
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-violet-400" />
            <span className="flex-1">Processing Station</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
          </Link>
          <Link
            href="/sheets"
            className="flex items-center gap-2.5 rounded-xl bg-white/4 hover:bg-white/6 border border-white/6 px-3.5 py-2.5 text-xs text-zinc-300 hover:text-white transition-colors group"
          >
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span className="flex-1">All Sheets</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
          </Link>
        </div>
      </aside>
    </div>
    <RequestSheetDialog
      open={requestDialogOpen}
      onOpenChange={(open) => {
        setRequestDialogOpen(open)
        if (!open) router.refresh()
      }}
    />
    </>
  )
}
