'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle, Loader2, Sparkles, XCircle } from 'lucide-react'
import type { AiMappedAnswer, AiMappedTable } from '@/lib/import/response-mapper'

export interface AiImportPreview {
  success: boolean
  fileName: string
  sheetId: string
  companyId: string
  model: string
  questionCount: number
  preselectConfidence: number
  answers: AiMappedAnswer[]
  tables: AiMappedTable[]
  warnings: string[]
  stats: { cellsRead: number; totalCells: number; inputTokens: number; outputTokens: number }
}

interface AiResponseReviewProps {
  preview: AiImportPreview
  onCancel: () => void
  onImported?: () => void
}

function confidenceBadge(confidence: number) {
  const pct = Math.round(confidence * 100)
  if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">High {pct}%</Badge>
  if (confidence >= 0.6) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Medium {pct}%</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Low {pct}%</Badge>
}

/**
 * Review screen for AI-mapped answers from a non-standard supplier workbook.
 * Low-confidence answers, answers that need attention, and anything that
 * would replace an existing answer start unselected.
 */
export function AiResponseReview({ preview, onCancel, onImported }: AiResponseReviewProps) {
  const threshold = preview.preselectConfidence
  const [allowReplace, setAllowReplace] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preview.answers.filter(a => a.confidence >= threshold && !a.hasIssue && !a.existingValue).map(a => a.questionId)),
  )
  const [selectedTables, setSelectedTables] = useState<Set<string>>(
    () => new Set(preview.tables.filter(t => t.confidence >= threshold && t.existingRows === 0).map(t => t.questionId)),
  )
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const selectable = (a: AiMappedAnswer) => !a.existingValue || allowReplace
  const chosenAnswers = preview.answers.filter(a => selected.has(a.questionId) && selectable(a))
  const chosenTables = preview.tables.filter(t => selectedTables.has(t.questionId) && t.existingRows === 0)
  const replacing = chosenAnswers.filter(a => a.existingValue).length
  const existingCount = preview.answers.filter(a => a.existingValue).length

  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set)
    if (on) next.add(id)
    else next.delete(id)
    return next
  }

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: preview.sheetId,
          companyId: preview.companyId,
          protectExisting: true,
          answers: chosenAnswers.map(a => ({ ...a, overwrite: allowReplace && !!a.existingValue })),
          listTables: chosenTables.map(t => ({ questionId: t.questionId, columns: t.columns, rows: t.rows })),
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Import failed')
      setResult(json)
      onImported?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  if (result) {
    const saved = (result.answersInserted ?? 0) + (result.answersUpdated ?? 0)
    return (
      <div className="space-y-4">
        <Alert className={result.errors?.length ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          {result.errors?.length ? <AlertCircle className="h-4 w-4 text-orange-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
          <AlertDescription className={result.errors?.length ? 'text-orange-800' : 'text-green-800'}>
            Saved {saved} answer{saved === 1 ? '' : 's'}
            {result.answersUpdated ? ` (${result.answersUpdated} replaced)` : ''}
            {result.listTablesImported ? ` and ${result.listTablesImported} table${result.listTablesImported === 1 ? '' : 's'}` : ''} to &quot;{result.sheetName}&quot;.
            {result.answersSkippedExisting ? ` ${result.answersSkippedExisting} kept as they were because the sheet already had an answer.` : ''}
            {result.errors?.length ? ` ${result.errors.length} problem(s): ${result.errors.slice(0, 3).join('; ')}` : ''}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Import another file</Button>
          <Button asChild className="flex-1">
            <a href={`/sheets/${preview.sheetId}/edit`}>Open sheet</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
        <p>
          <span className="font-medium text-foreground">{preview.fileName}</span> is not in the standard HQ 2.1 layout, so its
          answers were matched to this sheet&apos;s {preview.questionCount} questions with AI. Check each suggestion before importing.
          Low-confidence matches are not selected.
        </p>
      </div>

      {preview.warnings.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 space-y-1">
            {preview.warnings.map((w, i) => <div key={i}>{w}</div>)}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold">{preview.answers.length + preview.tables.length}</div>
          <div className="text-xs text-muted-foreground">Answers found</div>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{chosenAnswers.length + chosenTables.length}</div>
          <div className="text-xs text-muted-foreground">Selected</div>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {preview.answers.filter(a => a.confidence < threshold || a.hasIssue).length}
          </div>
          <div className="text-xs text-muted-foreground">Need a closer look</div>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <div className="text-2xl font-bold">{existingCount}</div>
          <div className="text-xs text-muted-foreground">Already answered</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button variant="outline" size="sm" onClick={() => setSelected(new Set(preview.answers.filter(selectable).map(a => a.questionId)))}>
          Select all
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setSelected(new Set()); setSelectedTables(new Set()) }}>
          Select none
        </Button>
        {existingCount > 0 && (
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <Checkbox checked={allowReplace} onCheckedChange={v => setAllowReplace(v === true)} />
            <span>Allow replacing answers already on the sheet ({existingCount})</span>
          </label>
        )}
      </div>

      {preview.answers.length > 0 && (
        <div className="rounded-lg border divide-y max-h-[32rem] overflow-y-auto">
          {preview.answers.map(a => {
            const canSelect = selectable(a)
            const isChecked = canSelect && selected.has(a.questionId)
            return (
              <label
                key={a.questionId}
                className={`flex items-start gap-3 p-3 text-sm ${canSelect ? 'cursor-pointer hover:bg-muted/40' : 'opacity-60'}`}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={isChecked}
                  disabled={!canSelect}
                  onCheckedChange={v => setSelected(prev => toggle(prev, a.questionId, v === true))}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">
                      <span className="text-muted-foreground mr-1.5">{a.questionNumber}</span>
                      {a.questionText}
                    </div>
                    <div className="shrink-0">{confidenceBadge(a.confidence)}</div>
                  </div>
                  <div className="text-foreground">
                    {a.choiceText ?? String(a.mappedValue)}
                    {a.choiceText && a.excelValue && a.excelValue !== a.choiceText && (
                      <span className="text-muted-foreground"> (supplier wrote: &quot;{a.excelValue}&quot;)</span>
                    )}
                  </div>
                  {a.additionalNotes && <div className="text-muted-foreground">Comment: {a.additionalNotes}</div>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {a.sourceCell && <span className="font-mono">{a.sourceCell}</span>}
                    {a.note && <span className="italic">{a.note}</span>}
                  </div>
                  {a.hasIssue && <div className="text-xs text-orange-700">{a.issueDetails}</div>}
                  {a.existingValue && (
                    <div className="text-xs text-amber-700">
                      Sheet already has: &quot;{a.existingValue}&quot;{canSelect ? '. Selecting this replaces it.' : '. Kept unless you allow replacing.'}
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      {preview.tables.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Tables ({preview.tables.length})</h4>
          {preview.tables.map(t => {
            const canSelect = t.existingRows === 0
            return (
              <div key={t.questionId} className={`rounded-lg border ${canSelect ? '' : 'opacity-60'}`}>
                <label className={`flex items-start gap-3 px-3 py-2 border-b bg-muted/40 text-sm ${canSelect ? 'cursor-pointer' : ''}`}>
                  <Checkbox
                    className="mt-0.5"
                    checked={canSelect && selectedTables.has(t.questionId)}
                    disabled={!canSelect}
                    onCheckedChange={v => setSelectedTables(prev => toggle(prev, t.questionId, v === true))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">
                        <span className="text-muted-foreground mr-1.5">{t.questionNumber}</span>
                        {t.questionText}
                      </span>
                      <span className="shrink-0">{confidenceBadge(t.confidence)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                      <span>{t.rows.length} row{t.rows.length === 1 ? '' : 's'}</span>
                      {t.sourceCell && <span className="font-mono">{t.sourceCell}</span>}
                      {t.note && <span className="italic">{t.note}</span>}
                    </div>
                    {!canSelect && (
                      <div className="text-xs text-amber-700 mt-0.5">
                        The sheet already has {t.existingRows} row{t.existingRows === 1 ? '' : 's'} here, so this table is not imported. Edit it in the sheet.
                      </div>
                    )}
                  </div>
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/20">
                        {t.columns.map(col => (
                          <th key={col.excelCol} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                            {col.headerText}
                            {!col.columnId && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1">new</Badge>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {t.columns.map(col => (
                            <td key={col.excelCol} className="px-2 py-1.5 align-top max-w-[220px]">
                              {row[col.excelCol] ?? <span className="text-muted-foreground">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {preview.answers.length === 0 && preview.tables.length === 0 && (
        <p className="text-sm text-muted-foreground">No answers to this sheet&apos;s questions were found in the file.</p>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleImport} disabled={importing || chosenAnswers.length + chosenTables.length === 0} className="flex-1">
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              Import {chosenAnswers.length} answer{chosenAnswers.length === 1 ? '' : 's'}
              {chosenTables.length ? ` + ${chosenTables.length} table${chosenTables.length === 1 ? '' : 's'}` : ''}
              {replacing ? ` (replaces ${replacing})` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
