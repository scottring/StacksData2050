'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Loader2,
  Search,
  Filter,
  Building2,
  X,
  User,
  XCircle,
  Pencil,
  Check,
  Save,
  Workflow,
} from 'lucide-react'
import type { MappedParameter, MappingResult } from '@/lib/extraction/parameter-mapper'
import { StartWorkflowDialog } from '@/components/command/StartWorkflowDialog'

interface CustomerReviewClientProps {
  requestId: string
  productName: string
  supplierName: string
  supplierLogo: string | null
  sheetId: string
  sheetStatus: string
  tags: string[]
  docMap: Record<string, { fileName: string; documentType: string }>
}

type FilterMode = 'all' | 'high' | 'medium' | 'low' | 'gaps'

// ─── Confidence Badge (customer perspective) ───────────────

function ConfidenceBadge({ confidence, size = 'sm' }: { confidence: number; size?: 'sm' | 'lg' }) {
  const pct = Math.round(confidence * 100)
  let color = 'text-zinc-500 bg-zinc-500/10 ring-zinc-500/20'
  let label = 'No data'
  if (pct >= 90) { color = 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20'; label = 'High' }
  else if (pct >= 70) { color = 'text-amber-400 bg-amber-500/10 ring-amber-500/20'; label = 'Medium' }
  else if (pct > 0) { color = 'text-rose-400 bg-rose-500/10 ring-rose-500/20'; label = 'Low' }

  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 ring-1 ${color}`}>
        <span className="text-xs font-mono">{pct}%</span>
        <span className="text-[10px] font-mono uppercase">{label}</span>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono ring-1 ${color}`}>
      {pct}%
    </span>
  )
}

// ─── Source Badge ──────────────────────────────────────────

function SourceBadge({ status }: { status: MappedParameter['status'] }) {
  const configs = {
    mapped: { icon: Sparkles, label: 'AI Extracted', cls: 'text-violet-400 bg-violet-500/10' },
    // Provenance of supplier-submitted answers (AI vs manual) is not persisted, so this must not claim either.
    existing: { icon: User, label: 'Answered', cls: 'text-blue-400 bg-blue-500/10' },
    gap: { icon: AlertCircle, label: 'Missing', cls: 'text-rose-400 bg-rose-500/10' },
  }
  const { icon: Icon, label, cls } = configs[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─── Editable Value Cell (minimal port of the station review's ValueCell) ──

function ValueCell({
  displayValue,
  status,
  onSave,
}: {
  displayValue: string | null
  status: MappedParameter['status']
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const startEdit = () => {
    setValue(displayValue || '')
    setEditing(true)
  }

  const handleSave = () => {
    onSave(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          className="flex-1 bg-zinc-800 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="Enter value..."
        />
        <button
          onClick={handleSave}
          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (!displayValue) {
    return (
      <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors group">
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="italic">No data</span>
      </button>
    )
  }

  return (
    <button onClick={startEdit} className="group flex items-center gap-2 text-left">
      <span className={`text-sm ${status === 'mapped' ? 'text-violet-300' : 'text-zinc-300'}`}>{displayValue}</span>
      <Pencil className="h-3 w-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ─── Section Group ─────────────────────────────────────────

function ReviewSection({
  sectionName,
  parameters,
  docMap,
  flaggedIds,
  onFlag,
  editedValues,
  onEditValue,
}: {
  sectionName: string
  parameters: MappedParameter[]
  docMap: Record<string, { fileName: string; documentType: string }>
  flaggedIds: Set<string>
  onFlag: (id: string) => void
  editedValues: Map<string, string>
  onEditValue: (questionId: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const sectionStats = useMemo(() => {
    const total = parameters.length
    const filled = parameters.filter((p) => p.status !== 'gap').length
    const avgConfidence = parameters.reduce((sum, p) => sum + p.confidence, 0) / (total || 1)
    return { total, filled, pct: total > 0 ? Math.round((filled / total) * 100) : 0, avgConfidence }
  }, [parameters])

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-600" /> : <ChevronRight className="h-4 w-4 text-zinc-600" />}
          <h3 className="text-sm font-medium text-white">{sectionName}</h3>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceBadge confidence={sectionStats.avgConfidence} />
          <span className="text-[10px] font-mono text-zinc-500">
            {sectionStats.filled}/{sectionStats.total}
          </span>
          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sectionStats.pct === 100 ? 'bg-emerald-500' : sectionStats.pct > 0 ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${sectionStats.pct}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/4">
          {parameters.map((param, idx) => (
            <div
              key={param.questionId}
              className={`flex items-start gap-4 px-5 py-3 ${
                idx > 0 ? 'border-t border-white/3' : ''
              } ${param.status === 'gap' ? 'bg-rose-500/3' : ''} ${
                flaggedIds.has(param.questionId) ? 'bg-amber-500/[0.05]' : ''
              }`}
            >
              {/* Question */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                    {param.sectionNumber}.{param.subsectionNumber}.{param.orderNumber}
                  </span>
                  {param.required && (
                    <span className="text-[8px] font-mono text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded uppercase">req</span>
                  )}
                  {flaggedIds.has(param.questionId) && (
                    <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded uppercase">flagged</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{param.questionContent}</p>
              </div>

              {/* Value */}
              <div className="w-56 shrink-0">
                <ValueCell
                  displayValue={editedValues.get(param.questionId) ?? (param.existingValue || param.extractedValue)}
                  status={param.status}
                  onSave={(value) => onEditValue(param.questionId, value)}
                />
              </div>

              {/* Source + Confidence */}
              <div className="flex items-center gap-2 shrink-0">
                <SourceBadge status={param.status} />
                {param.confidence > 0 && <ConfidenceBadge confidence={param.confidence} />}
              </div>

              {/* Doc reference */}
              <div className="w-20 shrink-0">
                {param.sourceDocumentId && docMap[param.sourceDocumentId] && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{docMap[param.sourceDocumentId].fileName}</span>
                  </div>
                )}
              </div>

              {/* Flag button */}
              <button
                onClick={() => onFlag(param.questionId)}
                className={`p-1 rounded-lg transition-colors shrink-0 ${
                  flaggedIds.has(param.questionId)
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-zinc-700 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
                title="Flag for clarification"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────

export default function CustomerReviewClient({
  requestId,
  productName,
  supplierName,
  supplierLogo,
  sheetId,
  sheetStatus,
  tags,
  docMap,
}: CustomerReviewClientProps) {
  const [loading, setLoading] = useState(true)
  const [mapping, setMapping] = useState<MappingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchMapping() {
      try {
        const res = await fetch(`/api/station/request/${requestId}/mapping`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setMapping(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchMapping()
  }, [requestId])

  const handleEditValue = (questionId: string, value: string) => {
    setEditedValues((prev) => {
      const next = new Map(prev)
      next.set(questionId, value)
      return next
    })
  }

  const toggleFlag = (questionId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const filteredParams = useMemo(() => {
    if (!mapping) return []
    let params = mapping.parameters

    switch (filter) {
      case 'high': params = params.filter((p) => p.confidence >= 0.9); break
      case 'medium': params = params.filter((p) => p.confidence >= 0.7 && p.confidence < 0.9); break
      case 'low': params = params.filter((p) => p.confidence > 0 && p.confidence < 0.7); break
      case 'gaps': params = params.filter((p) => p.status === 'gap'); break
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      params = params.filter(
        (p) =>
          p.questionContent.toLowerCase().includes(q) ||
          p.sectionName.toLowerCase().includes(q) ||
          (p.extractedValue && p.extractedValue.toLowerCase().includes(q)),
      )
    }
    return params
  }, [mapping, filter, searchQuery])

  const groupedParams = useMemo(() => {
    const groups = new Map<string, MappedParameter[]>()
    for (const param of filteredParams) {
      const key = `${param.sectionNumber}. ${param.sectionName}`
      const list = groups.get(key) || []
      list.push(param)
      groups.set(key, list)
    }
    return groups
  }, [filteredParams])

  // Guards Approve/Request Clarification/Reject against silently discarding
  // pending inline edits. Returns false (and aborts the caller) if the user
  // cancels, or if a requested save fails.
  const confirmUnsavedEdits = async (): Promise<boolean> => {
    if (editedValues.size === 0) return true
    const proceed = window.confirm(
      `You have ${editedValues.size} unsaved edit(s). Save them before continuing?`,
    )
    if (!proceed) return false
    return handleSaveChanges()
  }

  const handleApprove = async () => {
    if (!(await confirmUnsavedEdits())) return
    setSubmitting(true)
    try {
      await fetch(`/api/sheets/${sheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      window.location.href = '/command'
    } catch {
      setError('Failed to approve')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFlagRequest = async () => {
    if (!(await confirmUnsavedEdits())) return
    setSubmitting(true)
    try {
      await fetch(`/api/sheets/${sheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'flagged' }),
      })
      window.location.href = '/command'
    } catch {
      setError('Failed to flag')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!(await confirmUnsavedEdits())) return
    if (!window.confirm('Reject this submission? The supplier will need to revise and resubmit.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sheets/${sheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      window.location.href = '/command'
    } catch {
      setError('Failed to reject')
    } finally {
      setSubmitting(false)
    }
  }

  // Returns true on success (including the no-op "nothing to save" case) and
  // false on failure, so callers can gate a follow-on action (approve, flag,
  // reject) on the save actually completing.
  const handleSaveChanges = async (): Promise<boolean> => {
    if (!mapping || editedValues.size === 0) return true
    setSaving(true)
    try {
      // Type is always 'text' here: the batch route derives choice handling
      // from the question's response_type server-side, not from a client hint.
      const answers = Array.from(editedValues.entries()).map(([questionId, value]) => ({
        question_id: questionId,
        value,
        type: 'text',
      }))

      const res = await fetch('/api/answers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_id: sheetId, answers }),
      })

      if (!res.ok) {
        setError('Failed to save changes')
        return false
      }

      // Refetch the mapping so saved edits persist in view (values, badges,
      // section stats, gap filters) instead of reverting to stale state.
      const mappingRes = await fetch(`/api/station/request/${requestId}/mapping`)
      if (mappingRes.ok) {
        setMapping(await mappingRes.json())
        setEditedValues(new Map())
      } else {
        // Keep pending edits visible: clearing them without fresh mapping
        // state would revert the view to stale values despite a saved POST.
        console.error('Mapping refetch failed after save:', mappingRes.status)
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
      return false
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 font-mono">Loading review data...</p>
        </div>
      </div>
    )
  }

  if (error && !mapping) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-400">{error}</p>
          <Link href="/command" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const summary = mapping?.summary

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Back nav */}
      <Link
        href="/command"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {supplierLogo ? (
              <img src={supplierLogo} alt="" className="h-12 w-12 object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-zinc-600" />
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              Review: {productName}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              From <span className="text-zinc-400">{supplierName}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 ring-1 ring-emerald-500/20"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Parameters</p>
              <p className="text-2xl font-display font-bold text-white mt-1">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">High Conf.</p>
              <p className="text-2xl font-display font-bold text-emerald-400 mt-1">
                {mapping?.parameters.filter((p) => p.confidence >= 0.9).length || 0}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Medium</p>
              <p className="text-2xl font-display font-bold text-amber-400 mt-1">
                {mapping?.parameters.filter((p) => p.confidence >= 0.7 && p.confidence < 0.9).length || 0}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">Gaps</p>
              <p className="text-2xl font-display font-bold text-rose-400 mt-1">{summary.gaps}</p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Overall</p>
              <ConfidenceBadge confidence={summary.overallConfidence} size="lg" />
            </div>
          </div>

          {/* Progress bar (segmented) */}
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${((mapping?.parameters.filter((p) => p.confidence >= 0.9).length || 0) / summary.total) * 100}%` }}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${((mapping?.parameters.filter((p) => p.confidence >= 0.7 && p.confidence < 0.9).length || 0) / summary.total) * 100}%` }}
            />
            <div
              className="h-full bg-violet-500 transition-all duration-700"
              style={{ width: `${((mapping?.parameters.filter((p) => p.confidence > 0 && p.confidence < 0.7).length || 0) / summary.total) * 100}%` }}
            />
          </div>
        </>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-600" />
          {(['all', 'high', 'medium', 'low', 'gaps'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filter === mode ? 'bg-white/8 text-white' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/3'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'high' ? 'High Conf.' : mode === 'medium' ? 'Medium' : mode === 'low' ? 'Low Conf.' : 'Gaps'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900/60 border border-white/6 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 w-64"
          />
        </div>
      </div>

      {/* Parameter sections */}
      <div className="space-y-4">
        {Array.from(groupedParams.entries()).map(([sectionName, params]) => (
          <ReviewSection
            key={sectionName}
            sectionName={sectionName}
            parameters={params}
            docMap={docMap}
            flaggedIds={flaggedIds}
            onFlag={toggleFlag}
            editedValues={editedValues}
            onEditValue={handleEditValue}
          />
        ))}

        {filteredParams.length === 0 && (
          <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-12 text-center">
            <p className="text-sm text-zinc-600">
              {filter !== 'all' ? 'No parameters match this filter.' : 'No parameters found.'}
            </p>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Action bar */}
      {sheetStatus === 'submitted' && (
        <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/6 -mx-8 px-8 py-4 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {flaggedIds.size > 0 && (
              <span className="text-amber-400">{flaggedIds.size} parameter{flaggedIds.size !== 1 ? 's' : ''} flagged</span>
            )}
            {flaggedIds.size > 0 && editedValues.size > 0 && ' · '}
            {editedValues.size > 0 && (
              <span className="text-emerald-400">{editedValues.size} edit{editedValues.size !== 1 ? 's' : ''} pending</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {editedValues.size > 0 && (
              <button
                onClick={handleSaveChanges}
                disabled={saving || submitting}
                className="flex items-center gap-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50 text-blue-400 px-4 py-2 text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
            )}
            <button
              onClick={handleReject}
              disabled={submitting || saving}
              className="flex items-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 disabled:opacity-50 text-rose-400 px-4 py-2 text-sm font-medium transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={handleFlagRequest}
              disabled={submitting || saving}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-50 text-amber-400 px-4 py-2 text-sm font-medium transition-colors"
            >
              <ThumbsDown className="h-4 w-4" />
              Request Clarification
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-5 py-2 text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-400/30"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Already approved/flagged/rejected state */}
      {sheetStatus === 'approved' && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <p className="text-sm text-emerald-400">This submission has been approved.</p>
          </div>
          <button
            onClick={() => setWorkflowDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Workflow className="h-3.5 w-3.5" />
            Start Introduction Workflow
          </button>
        </div>
      )}
      {sheetStatus === 'flagged' && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-amber-400" />
          <p className="text-sm text-amber-400">This submission has been flagged for clarification.</p>
        </div>
      )}
      {sheetStatus === 'rejected' && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-rose-400" />
          <p className="text-sm text-rose-400">This submission has been rejected.</p>
        </div>
      )}

      <StartWorkflowDialog
        sheetId={sheetId}
        open={workflowDialogOpen}
        onOpenChange={setWorkflowDialogOpen}
      />
    </div>
  )
}
