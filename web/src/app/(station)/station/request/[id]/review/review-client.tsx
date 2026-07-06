'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2,
  Search,
  Filter,
  Pencil,
  X,
  Check,
  Building2,
} from 'lucide-react'
import type { MappedParameter, MappingResult } from '@/lib/extraction/parameter-mapper'

interface ReviewClientProps {
  requestId: string
  productName: string
  customerName: string
  customerLogo: string | null
  sheetId: string
  tags: string[]
  docMap: Record<string, { fileName: string; documentType: string }>
}

type FilterMode = 'all' | 'mapped' | 'gaps' | 'existing'

// questionType values that indicate a choice question. The batch API also
// resolves this server-side from the question's response_type, so this is a
// best-effort client-side hint, not the source of truth.
const CHOICE_QUESTION_TYPES = new Set([
  'choice',
  'Select one',
  'Select one Radio',
  'Dropdown',
  'Select multiple',
])

// ─── Confidence Badge ──────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  let color = 'text-zinc-500 bg-zinc-500/10 ring-zinc-500/20'
  if (pct >= 90) color = 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20'
  else if (pct >= 70) color = 'text-amber-400 bg-amber-500/10 ring-amber-500/20'
  else if (pct > 0) color = 'text-rose-400 bg-rose-500/10 ring-rose-500/20'

  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono ring-1 ${color}`}>
      {pct}%
    </span>
  )
}

// ─── Status Pill ───────────────────────────────────────────

function StatusPill({ status }: { status: MappedParameter['status'] }) {
  const config = {
    mapped: { icon: Sparkles, label: 'AI Mapped', cls: 'text-violet-400 bg-violet-500/10' },
    existing: { icon: CheckCircle2, label: 'Answered', cls: 'text-emerald-400 bg-emerald-500/10' },
    gap: { icon: AlertCircle, label: 'Gap', cls: 'text-rose-400 bg-rose-500/10' },
  }
  const { icon: Icon, label, cls } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─── Editable Value Cell ───────────────────────────────────

function ValueCell({
  param,
  onSave,
}: {
  param: MappedParameter
  onSave: (questionId: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const displayValue = param.existingValue || param.extractedValue

  const startEdit = () => {
    setValue(displayValue || '')
    setEditing(true)
  }

  const handleSave = () => {
    onSave(param.questionId, value)
    setEditing(false)
  }

  const handleCancel = () => {
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
            if (e.key === 'Escape') handleCancel()
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
          onClick={handleCancel}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (param.status === 'gap' && !displayValue) {
    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors group"
      >
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="italic">Click to fill...</span>
      </button>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-2 text-left"
    >
      <span className={`text-sm ${param.status === 'mapped' ? 'text-violet-300' : 'text-zinc-300'}`}>
        {displayValue}
      </span>
      <Pencil className="h-3 w-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ─── Section Group ─────────────────────────────────────────

function SectionGroup({
  sectionName,
  parameters,
  docMap,
  onSave,
}: {
  sectionName: string
  parameters: MappedParameter[]
  docMap: Record<string, { fileName: string; documentType: string }>
  onSave: (questionId: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const sectionStats = useMemo(() => {
    const total = parameters.length
    const filled = parameters.filter((p) => p.status !== 'gap').length
    return { total, filled, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
  }, [parameters])

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/6 overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          )}
          <h3 className="text-sm font-medium text-white">{sectionName}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500">
            {sectionStats.filled}/{sectionStats.total}
          </span>
          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                sectionStats.pct === 100
                  ? 'bg-emerald-500'
                  : sectionStats.pct > 0
                    ? 'bg-amber-500'
                    : 'bg-zinc-700'
              }`}
              style={{ width: `${sectionStats.pct}%` }}
            />
          </div>
        </div>
      </button>

      {/* Parameter rows */}
      {expanded && (
        <div className="border-t border-white/4">
          {parameters.map((param, idx) => (
            <div
              key={param.questionId}
              className={`flex items-start gap-4 px-5 py-3 ${
                idx > 0 ? 'border-t border-white/3' : ''
              } ${param.status === 'gap' && param.required ? 'bg-rose-500/3' : ''}`}
            >
              {/* Question number + content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                    {param.sectionNumber}.{param.subsectionNumber}.{param.orderNumber}
                  </span>
                  {param.required && (
                    <span className="text-[8px] font-mono text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded uppercase">
                      req
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {param.questionContent}
                </p>
                {param.matchReason && (
                  <p className="text-[10px] text-zinc-600 font-mono">
                    {param.matchReason}
                  </p>
                )}
              </div>

              {/* Value */}
              <div className="w-64 shrink-0">
                <ValueCell param={param} onSave={onSave} />
              </div>

              {/* Status + Confidence */}
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill status={param.status} />
                {param.status === 'mapped' && (
                  <ConfidenceBadge confidence={param.confidence} />
                )}
              </div>

              {/* Source document */}
              <div className="w-24 shrink-0">
                {param.sourceDocumentId && docMap[param.sourceDocumentId] && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {docMap[param.sourceDocumentId].fileName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────

export default function ReviewClient({
  requestId,
  productName,
  customerName,
  customerLogo,
  sheetId,
  tags,
  docMap,
}: ReviewClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mapping, setMapping] = useState<MappingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map())
  const [customerCompanyId, setCustomerCompanyId] = useState<string | null>(null)

  // Fetch mapping data
  useEffect(() => {
    async function fetchMapping() {
      try {
        const res = await fetch(`/api/station/request/${requestId}/mapping`)
        if (!res.ok) throw new Error('Failed to load mapping')
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

  // Fetch the customer's company id (needed for the submit notification)
  useEffect(() => {
    async function fetchRequestor() {
      const supabase = createClient()
      const { data } = await supabase
        .from('requests')
        .select('requestor_id')
        .eq('id', requestId)
        .single()
      if (data?.requestor_id) setCustomerCompanyId(data.requestor_id)
    }
    fetchRequestor()
  }, [requestId])

  const handleSaveValue = useCallback((questionId: string, value: string) => {
    setEditedValues((prev) => {
      const next = new Map(prev)
      next.set(questionId, value)
      return next
    })
  }, [])

  // Filter and search parameters
  const filteredParams = useMemo(() => {
    if (!mapping) return []
    let params = mapping.parameters

    // Apply edited values to display
    params = params.map((p) => {
      const edited = editedValues.get(p.questionId)
      if (edited !== undefined) {
        return {
          ...p,
          extractedValue: edited,
          status: edited ? 'mapped' as const : p.status,
          confidence: edited ? 1.0 : p.confidence,
          matchReason: edited ? 'Manually entered' : p.matchReason,
        }
      }
      return p
    })

    if (filter !== 'all') {
      params = params.filter((p) => p.status === filter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      params = params.filter(
        (p) =>
          p.questionContent.toLowerCase().includes(q) ||
          p.sectionName.toLowerCase().includes(q) ||
          p.subsectionName.toLowerCase().includes(q) ||
          (p.extractedValue && p.extractedValue.toLowerCase().includes(q)),
      )
    }

    return params
  }, [mapping, filter, searchQuery, editedValues])

  // Group by section
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

  // Updated summary accounting for edits
  const liveSummary = useMemo(() => {
    if (!mapping) return null
    let mapped = mapping.summary.mapped
    let gaps = mapping.summary.gaps
    let existing = mapping.summary.existing
    let requiredGaps = mapping.summary.requiredGaps

    for (const [qId, val] of editedValues) {
      const param = mapping.parameters.find((p) => p.questionId === qId)
      if (!param) continue
      if (param.status === 'gap' && val) {
        gaps--
        mapped++
        if (param.required) requiredGaps--
      }
    }

    const total = mapping.summary.total
    const filled = mapped + existing
    return { total, mapped, existing, gaps, requiredGaps, filled, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
  }, [mapping, editedValues])

  // Submit handler — saves all edited values + AI-mapped values as answers
  const handleSubmit = async () => {
    if (!mapping) return

    if (liveSummary && liveSummary.requiredGaps > 0) {
      const proceed = window.confirm(
        `${liveSummary.requiredGaps} required parameters are still unanswered. Submit anyway?`,
      )
      if (!proceed) return
    }

    setSubmitting(true)

    try {
      // Collect all answers to save (edited values + accepted AI mappings)
      const answers: Array<{
        question_id: string
        value: string | number | boolean | null
        type: string
      }> = []

      for (const param of mapping.parameters) {
        const editedVal = editedValues.get(param.questionId)
        const type = CHOICE_QUESTION_TYPES.has(param.questionType)
          ? 'choice'
          : param.questionType === 'number'
            ? 'number'
            : 'text'

        if (editedVal !== undefined && editedVal) {
          // Manually entered value
          answers.push({
            question_id: param.questionId,
            value: editedVal,
            type,
          })
        } else if (param.status === 'mapped' && param.extractedValue) {
          // AI-mapped value (auto-accept)
          answers.push({
            question_id: param.questionId,
            value: param.extractedValue,
            type,
          })
        }
      }

      if (answers.length > 0) {
        const res = await fetch('/api/answers/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheet_id: sheetId, answers }),
        })

        if (!res.ok) {
          throw new Error('Failed to save answers')
        }
      }

      // Update sheet status to submitted
      const statusRes = await fetch(`/api/sheets/${sheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      })

      if (!statusRes.ok) {
        throw new Error('Failed to update sheet status')
      }

      // Notify the customer that a response is ready for review. Mirrors
      // the legacy sheets/submit/route.ts contract. Non-blocking: a failed
      // notification must not fail the submit.
      fetch('/api/requests/notify-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId,
          customerCompanyId,
          productName,
        }),
      }).catch((err) => console.error('Failed to send submit notification:', err))

      router.push(`/station/request/${requestId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading state ─────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 font-mono">Mapping parameters...</p>
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
          <Link
            href={`/station/request/${requestId}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Back to request
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Back nav */}
      <Link
        href={`/station/request/${requestId}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to request
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {customerLogo ? (
              <img src={customerLogo} alt="" className="h-12 w-12 object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-zinc-600" />
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              Review: {productName}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              For <span className="text-zinc-400">{customerName}</span>
            </p>
          </div>
        </div>

        {/* Tags */}
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

      {/* Summary cards */}
      {liveSummary && (
        <div className="grid grid-cols-5 gap-3">
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total</p>
            <p className="text-2xl font-display font-bold text-white mt-1">{liveSummary.total}</p>
          </div>
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 px-4 py-3">
            <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">AI Mapped</p>
            <p className="text-2xl font-display font-bold text-violet-400 mt-1">{liveSummary.mapped}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Answered</p>
            <p className="text-2xl font-display font-bold text-emerald-400 mt-1">{liveSummary.existing}</p>
          </div>
          <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 px-4 py-3">
            <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">Gaps</p>
            <p className="text-2xl font-display font-bold text-rose-400 mt-1">{liveSummary.gaps}</p>
            {liveSummary.requiredGaps > 0 && (
              <p className="text-[10px] font-mono text-rose-500 mt-0.5">
                {liveSummary.requiredGaps} required
              </p>
            )}
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Complete</p>
            <p className={`text-2xl font-display font-bold mt-1 ${
              liveSummary.pct === 100 ? 'text-emerald-400' : liveSummary.pct >= 80 ? 'text-amber-400' : 'text-white'
            }`}>
              {liveSummary.pct}%
            </p>
          </div>
        </div>
      )}

      {/* Overall progress bar */}
      {liveSummary && (
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full flex">
            {/* Existing (green) */}
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${(liveSummary.existing / liveSummary.total) * 100}%` }}
            />
            {/* AI mapped (violet) */}
            <div
              className="h-full bg-violet-500 transition-all duration-700"
              style={{ width: `${(liveSummary.mapped / liveSummary.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-600" />
          {(['all', 'mapped', 'gaps', 'existing'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filter === mode
                  ? 'bg-white/8 text-white'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/3'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'mapped' ? 'AI Mapped' : mode === 'gaps' ? 'Gaps' : 'Answered'}
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
          <SectionGroup
            key={sectionName}
            sectionName={sectionName}
            parameters={params}
            docMap={docMap}
            onSave={handleSaveValue}
          />
        ))}

        {filteredParams.length === 0 && (
          <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-12 text-center">
            <p className="text-sm text-zinc-500">
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

      {/* Submit bar */}
      <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/6 -mx-8 px-8 py-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500 font-mono">
          {editedValues.size > 0 && (
            <span className="text-amber-400">{editedValues.size} manual edit{editedValues.size !== 1 ? 's' : ''}</span>
          )}
          {editedValues.size > 0 && liveSummary && liveSummary.gaps > 0 && ' · '}
          {liveSummary && liveSummary.gaps > 0 && (
            <span className="text-rose-400">{liveSummary.gaps} gap{liveSummary.gaps !== 1 ? 's' : ''} remaining</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/station/request/${requestId}`}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Save & Exit
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-400/30"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit to {customerName}
          </button>
        </div>
      </div>
    </div>
  )
}
