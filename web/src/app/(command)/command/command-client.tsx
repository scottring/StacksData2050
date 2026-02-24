'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Loader2 } from 'lucide-react'
import type { CompanyNode, RequestArc } from '@/lib/geo'
import FloatingLabel from '@/components/vision/ui/FloatingLabel'
import AnimatedCounter from '@/components/vision/ui/AnimatedCounter'

const CommandCanvas = dynamic(
  () => import('@/components/command/CommandCanvas'),
  { ssr: false }
)

interface NetworkData {
  companies: CompanyNode[]
  requests: RequestArc[]
}

export default function CommandClient() {
  const [data, setData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNetwork() {
      try {
        const res = await fetch('/api/command/network')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Silent fail — globe shows empty
      } finally {
        setLoading(false)
      }
    }
    fetchNetwork()
  }, [])

  const handleNodeClick = useCallback((id: string) => {
    setSelectedNodeId((prev) => (prev === id ? null : id))
    setSelectedArcId(null)
  }, [])

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedArcId(null)
  }, [])

  const companies = data?.companies || []
  const requests = data?.requests || []

  // Stats
  const activeRequests = requests.filter((r) => r.status !== 'complete').length
  const pendingAttention = requests.filter((r) => r.status === 'attention').length
  const totalSuppliers = companies.filter((c) => c.role === 'supplier' || c.role === 'both').length

  // Selected company info
  const selectedCompany = selectedNodeId
    ? companies.find((c) => c.id === selectedNodeId)
    : null

  return (
    <div className="relative h-[calc(100vh-3.5rem)]" onClick={handleDeselect}>
      {/* Globe canvas */}
      <CommandCanvas
        companies={companies}
        requests={requests}
        selectedNodeId={selectedNodeId}
        selectedArcId={selectedArcId}
        onNodeClick={handleNodeClick}
        dimmed={!!selectedNodeId}
      />

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        </div>
      )}

      {/* Top-left stats */}
      {!loading && (
        <div className="absolute top-6 left-6 z-20 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.06] px-4 py-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Suppliers</p>
              <p className="text-2xl font-display font-bold text-white">
                <AnimatedCounter value={totalSuppliers} visible={true} />
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.06] px-4 py-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Active</p>
              <p className="text-2xl font-display font-bold text-amber-400">
                <AnimatedCounter value={activeRequests} visible={true} />
              </p>
            </div>
            {pendingAttention > 0 && (
              <div className="rounded-xl bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 px-4 py-3">
                <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">Attention</p>
                <p className="text-2xl font-display font-bold text-rose-400">
                  <AnimatedCounter value={pendingAttention} visible={true} />
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom-right: New Request button */}
      {!loading && (
        <div className="absolute bottom-8 right-8 z-20" onClick={(e) => e.stopPropagation()}>
          <button className="flex items-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-400/30 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      )}

      {/* Selected company info panel (minimal for now — full panel in Phase 2) */}
      {selectedCompany && (
        <div
          className="absolute bottom-8 left-6 z-20 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/[0.08] px-6 py-4 max-w-sm animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          <FloatingLabel variant="subtitle" visible={true} text={selectedCompany.name} />
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${
              selectedCompany.role === 'customer'
                ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                : selectedCompany.role === 'supplier'
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20'
            }`}>
              {selectedCompany.role}
            </span>
            {selectedCompany.pendingActions > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                {selectedCompany.pendingActions} pending
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-300 transition-colors">
              View Details
            </button>
            <button className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 transition-colors">
              New Request
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !selectedNodeId && (
        <div className="absolute bottom-8 left-6 z-20 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {[
            { color: 'bg-amber-400', label: 'Awaiting' },
            { color: 'bg-blue-400', label: 'Processing' },
            { color: 'bg-emerald-400', label: 'Complete' },
            { color: 'bg-rose-400', label: 'Attention' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${color}`} />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
