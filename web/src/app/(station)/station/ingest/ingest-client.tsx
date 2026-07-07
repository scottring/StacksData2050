'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  Download,
  Pencil,
  Check,
  X,
  Clock,
  Flag,
} from 'lucide-react'
import UploadDropzone from '@/components/pipeline/upload-dropzone'
import type { ReverseMatchResult, MatchedExternalQuestion } from '@/lib/extraction/reverse-matcher'

interface RecentDoc {
  id: string
  fileName: string
  status: string
  createdAt: string
  title: string
}

interface IngestClientProps {
  recentDocs: RecentDoc[]
}

type Phase = 'upload' | 'matching' | 'review'
type FilterMode = 'all' | 'answered' | 'partial' | 'unmatched'

// ─── Confidence Badge ──────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  let color = 'text-zinc-500 bg-zinc-500/10 ring-zinc-500/20'
  if (pct >= 80) color = 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20'
  else if (pct >= 50) color = 'text-amber-400 bg-amber-500/10 ring-amber-500/20'
  else if (pct > 0) color = 'text-rose-400 bg-rose-500/10 ring-rose-500/20'

  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono ring-1 ${color}`}>
      {pct}%
    </span>
  )
}

// ─── Source Badge ──────────────────────────────────────────

function SourceBadge({ source }: { source: MatchedExternalQuestion['matchSource'] }) {
  if (!source) return null
  const config: Record<string, { label: string; cls: string }> = {
    prior_answer: { label: 'Prior Answer', cls: 'text-blue-400 bg-blue-500/10' },
    extraction: { label: 'Doc Extract', cls: 'text-violet-400 bg-violet-500/10' },
    document: { label: 'From Doc', cls: 'text-emerald-400 bg-emerald-500/10' },
  }
  const { label, cls } = config[source] || { label: source, cls: 'text-zinc-400 bg-zinc-500/10' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono ${cls}`}>
      {label}
    </span>
  )
}

// ─── Editable Value ────────────────────────────────────────

function EditableValue({
  question,
  editedValue,
  onSave,
}: {
  question: MatchedExternalQuestion
  editedValue: string | undefined
  onSave: (id: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const displayValue = editedValue ?? question.matchedValue

  const startEdit = () => {
    setValue(displayValue || '')
    setEditing(true)
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
            if (e.key === 'Enter') { onSave(question.extractedQuestionId, value); setEditing(false) }
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder="Enter value..."
        />
        <button
          onClick={() => { onSave(question.extractedQuestionId, value); setEditing(false) }}
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
        <span className="italic">Click to fill...</span>
      </button>
    )
  }

  return (
    <button onClick={startEdit} className="group flex items-center gap-2 text-left">
      <span className="text-sm text-zinc-300">{displayValue}</span>
      <Pencil className="h-3 w-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ─── Section Group ─────────────────────────────────────────

function SectionGroup({
  sectionName,
  questions,
  editedValues,
  onSave,
}: {
  sectionName: string
  questions: MatchedExternalQuestion[]
  editedValues: Map<string, string>
  onSave: (id: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const stats = useMemo(() => {
    const total = questions.length
    const filled = questions.filter((q) => q.status !== 'unmatched' || editedValues.has(q.extractedQuestionId)).length
    return { total, filled, pct: total > 0 ? Math.round((filled / total) * 100) : 0 }
  }, [questions, editedValues])

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
          <span className="text-[10px] font-mono text-zinc-500">{stats.filled}/{stats.total}</span>
          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.pct === 100 ? 'bg-emerald-500' : stats.pct > 0 ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${stats.pct}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/4">
          {questions.map((q, idx) => (
            <div
              key={q.extractedQuestionId}
              className={`flex items-start gap-4 px-5 py-3 ${idx > 0 ? 'border-t border-white/3' : ''} ${
                q.status === 'unmatched' && !editedValues.has(q.extractedQuestionId) ? 'bg-rose-500/3' : ''
              }`}
            >
              {/* Question */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {q.questionNumber && (
                    <span className="text-[10px] font-mono text-zinc-600">{q.questionNumber}</span>
                  )}
                  {q.required && (
                    <span className="text-[8px] font-mono text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded uppercase">req</span>
                  )}
                  <span className="text-[8px] font-mono text-zinc-600 bg-zinc-800 px-1 py-0.5 rounded">{q.domain}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{q.questionText}</p>
                {q.matchReason && (
                  <p className="text-[10px] text-zinc-600 font-mono">{q.matchReason}</p>
                )}
              </div>

              {/* Value */}
              <div className="w-56 shrink-0">
                <EditableValue
                  question={q}
                  editedValue={editedValues.get(q.extractedQuestionId)}
                  onSave={onSave}
                />
              </div>

              {/* Source + Confidence */}
              <div className="flex items-center gap-2 shrink-0">
                <SourceBadge source={q.matchSource} />
                {q.confidence > 0 && <ConfidenceBadge confidence={q.confidence} />}
              </div>

              {/* Source detail */}
              <div className="w-28 shrink-0">
                {q.matchSourceDetail && (
                  <p className="text-[10px] text-zinc-600 truncate">{q.matchSourceDetail}</p>
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

type UploadMode = 'blank' | 'filled'

export default function IngestClient({ recentDocs }: IngestClientProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('upload')
  const [uploadMode, setUploadMode] = useState<UploadMode>('blank')
  const [docId, setDocId] = useState<string | null>(null)
  const [docFileName, setDocFileName] = useState<string | null>(null)
  const [matchResult, setMatchResult] = useState<ReverseMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map())

  const handleUploadComplete = useCallback(async (uploadedDocId: string) => {
    setDocId(uploadedDocId)
    setDocFileName(null)
    setPhase('matching')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/station/ingest/${uploadedDocId}/match`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to match')
      }
      const data = await res.json()
      setMatchResult(data)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed')
      setPhase('review')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load a previously processed questionnaire
  const handleLoadRecent = async (recentDocId: string) => {
    setDocId(recentDocId)
    setDocFileName(recentDocs.find((d) => d.id === recentDocId)?.fileName ?? null)
    setPhase('matching')
    setLoading(true)

    try {
      const res = await fetch(`/api/station/ingest/${recentDocId}/match`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Failed to load')
      }
      const data = await res.json()
      setMatchResult(data)
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setPhase('review')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveValue = useCallback((id: string, value: string) => {
    setEditedValues((prev) => {
      const next = new Map(prev)
      next.set(id, value)
      return next
    })
  }, [])

  // Filter + search
  const filteredQuestions = useMemo(() => {
    if (!matchResult) return []
    let qs = matchResult.questions

    if (filter !== 'all') {
      qs = qs.filter((q) => q.status === filter)
    }

    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase()
      qs = qs.filter(
        (q) =>
          q.questionText.toLowerCase().includes(search) ||
          (q.sectionName && q.sectionName.toLowerCase().includes(search)) ||
          (q.matchedValue && q.matchedValue.toLowerCase().includes(search)),
      )
    }

    return qs
  }, [matchResult, filter, searchQuery])

  // Group by section
  const grouped = useMemo(() => {
    const groups = new Map<string, MatchedExternalQuestion[]>()
    for (const q of filteredQuestions) {
      const key = q.sectionName || 'General'
      const list = groups.get(key) || []
      list.push(q)
      groups.set(key, list)
    }
    return groups
  }, [filteredQuestions])

  // Live summary accounting for edits
  const liveSummary = useMemo(() => {
    if (!matchResult) return null
    let { answered, partial, unmatched, requiredUnmatched } = matchResult.summary

    for (const [id, val] of editedValues) {
      const q = matchResult.questions.find((q) => q.extractedQuestionId === id)
      if (!q) continue
      if (q.status === 'unmatched' && val) {
        unmatched--
        answered++
        if (q.required) requiredUnmatched--
      } else if (q.status === 'partial' && val) {
        partial--
        answered++
      }
    }

    const total = matchResult.summary.total
    const filled = answered + partial
    return { total, answered, partial, unmatched, requiredUnmatched, pct: total > 0 ? Math.round((answered / total) * 100) : 0 }
  }, [matchResult, editedValues])

  // Export as CSV
  const handleExport = () => {
    if (!matchResult) return
    const rows = matchResult.questions.map((q) => {
      const isManualEdit = editedValues.has(q.extractedQuestionId)
      const val = editedValues.get(q.extractedQuestionId) ?? q.matchedValue ?? ''
      return [
        q.questionNumber || '',
        q.sectionName || '',
        q.questionText,
        val,
        isManualEdit ? 'manual' : (q.matchSource || 'manual'),
        String(Math.round(q.confidence * 100)),
      ].map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    })

    const csv = ['Question #,Section,Question,Answer,Source,Confidence %', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url

    const titleSource = matchResult.metadata.documentTitle ?? docFileName ?? 'export'
    const slug = titleSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '')
      .slice(0, 40)
    const date = new Date().toISOString().slice(0, 10)
    a.download = `questionnaire-response-${slug}-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Upload Phase ──────────────────────────────────────

  if (phase === 'upload') {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <Link
          href="/station"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to station
        </Link>

        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Import External Request
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Upload a customer questionnaire or data request. Stacks will extract the questions and auto-fill from your existing data.
          </p>
        </div>

        {/* Upload mode toggle */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white">Upload Questionnaire</h2>
              <p className="text-xs text-zinc-600">Excel, CSV, or PDF from your customer</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setUploadMode('blank')}
              className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                uploadMode === 'blank'
                  ? 'border-violet-500/30 bg-violet-500/5 ring-1 ring-violet-500/20'
                  : 'border-white/6 hover:border-white/10 hover:bg-white/2'
              }`}
            >
              <p className={`text-sm font-medium ${uploadMode === 'blank' ? 'text-violet-300' : 'text-zinc-400'}`}>
                Questions Only
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Blank questionnaire — we'll auto-fill from your data
              </p>
            </button>
            <button
              onClick={() => setUploadMode('filled')}
              className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                uploadMode === 'filled'
                  ? 'border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                  : 'border-white/6 hover:border-white/10 hover:bg-white/2'
              }`}
            >
              <p className={`text-sm font-medium ${uploadMode === 'filled' ? 'text-emerald-300' : 'text-zinc-400'}`}>
                With Answers
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Completed questionnaire — we'll extract questions + answers
              </p>
            </button>
          </div>

          <UploadDropzone
            onUploadComplete={handleUploadComplete}
            defaultDocType={uploadMode === 'filled' ? 'questionnaire_filled' : 'questionnaire'}
          />
        </div>

        {/* Recent questionnaires */}
        {recentDocs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Recent Imports
            </h2>
            <div className="space-y-2">
              {recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleLoadRecent(doc.id)}
                  className="w-full flex items-center justify-between rounded-xl bg-zinc-900/40 border border-white/4 px-4 py-3 hover:bg-white/2 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="h-4 w-4 text-zinc-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">{doc.title}</p>
                      <p className="text-[10px] text-zinc-600">
                        {doc.status === 'extracted' ? (
                          <span className="text-emerald-500">Ready</span>
                        ) : (
                          <span>{doc.status}</span>
                        )}
                        <span className="mx-1.5">&middot;</span>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Matching Phase ────────────────────────────────────

  if (phase === 'matching' || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 font-mono">Matching against your data...</p>
        </div>
      </div>
    )
  }

  // ─── Review Phase ──────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <Link
        href="/station/ingest"
        onClick={(e) => { e.preventDefault(); setPhase('upload'); setMatchResult(null); setEditedValues(new Map()) }}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        New import
      </Link>

      {/* Header with metadata */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            {matchResult?.metadata.documentTitle || 'External Questionnaire'}
          </h1>
          {matchResult?.metadata.requestingOrganization && (
            <p className="text-sm text-zinc-500 mt-0.5">
              From <span className="text-zinc-400">{matchResult.metadata.requestingOrganization}</span>
            </p>
          )}
        </div>
        {matchResult?.metadata.referencedRegulations && matchResult.metadata.referencedRegulations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matchResult.metadata.referencedRegulations.map((reg) => (
              <span key={reg} className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400 ring-1 ring-blue-500/20">
                {reg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {liveSummary && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-xl bg-zinc-900/60 border border-white/6 px-4 py-3">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Questions</p>
              <p className="text-2xl font-display font-bold text-white mt-1">{liveSummary.total}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Answered</p>
              <p className="text-2xl font-display font-bold text-emerald-400 mt-1">{liveSummary.answered}</p>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Partial</p>
              <p className="text-2xl font-display font-bold text-amber-400 mt-1">{liveSummary.partial}</p>
            </div>
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 px-4 py-3">
              <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">Gaps</p>
              <p className="text-2xl font-display font-bold text-rose-400 mt-1">{liveSummary.unmatched}</p>
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

          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(liveSummary.answered / liveSummary.total) * 100}%` }} />
            <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${(liveSummary.partial / liveSummary.total) * 100}%` }} />
          </div>
        </>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-600" />
          {(['all', 'answered', 'partial', 'unmatched'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filter === mode ? 'bg-white/8 text-white' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/3'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'answered' ? 'Answered' : mode === 'partial' ? 'Partial' : 'Gaps'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900/60 border border-white/6 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 w-64"
          />
        </div>
      </div>

      {/* Question sections */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([section, qs]) => (
          <SectionGroup
            key={section}
            sectionName={section}
            questions={qs}
            editedValues={editedValues}
            onSave={handleSaveValue}
          />
        ))}

        {filteredQuestions.length === 0 && !error && (
          <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-12 text-center">
            <p className="text-sm text-zinc-600">
              {filter !== 'all' ? 'No questions match this filter.' : 'No questions extracted.'}
            </p>
          </div>
        )}
      </div>

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
      {matchResult && (
        <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/6 -mx-8 px-8 py-4 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">
            {editedValues.size > 0 && (
              <span className="text-amber-400">{editedValues.size} manual edit{editedValues.size !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 text-zinc-300 px-4 py-2 text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
