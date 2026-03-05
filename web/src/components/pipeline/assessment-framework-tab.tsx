'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldOff } from 'lucide-react'
import FrameworkStatusDot from './framework-status-dot'

interface ResultItem {
  id: string
  status: 'pass' | 'fail' | 'warning' | 'not_applicable' | 'insufficient_data'
  message: string
  triggered_by: Array<{
    cas_number: string
    chemical_name: string
    reason: string
    concentration_pct?: number | null
  }>
  overridden: boolean
  override_reason?: string | null
  rule_code?: string
  framework_code?: string
}

interface AssessmentFrameworkTabProps {
  frameworkCode: string
  frameworkName: string
  jurisdiction: string
  results: ResultItem[]
  onOverride?: (resultId: string, reason: string) => void
}

const STATUS_ICON = {
  pass: CheckCircle2,
  fail: XCircle,
  warning: AlertTriangle,
  not_applicable: Info,
  insufficient_data: Info,
}

const STATUS_COLOR = {
  pass: 'text-emerald-500',
  fail: 'text-red-500',
  warning: 'text-amber-500',
  not_applicable: 'text-slate-400',
  insufficient_data: 'text-blue-400',
}

export default function AssessmentFrameworkTab({
  frameworkCode,
  frameworkName,
  jurisdiction,
  results,
  onOverride,
}: AssessmentFrameworkTabProps) {
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const hasFail = results.some(r => r.status === 'fail' && !r.overridden)
  const hasWarning = results.some(r => r.status === 'warning' && !r.overridden)
  const overallStatus = hasFail ? 'fail' : hasWarning ? 'warning' : 'pass'

  const handleOverride = (resultId: string) => {
    if (overrideReason.trim() && onOverride) {
      onOverride(resultId, overrideReason.trim())
      setOverrideId(null)
      setOverrideReason('')
    }
  }

  return (
    <div className="space-y-3">
      {/* Framework header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FrameworkStatusDot status={overallStatus} size="lg" />
          <div>
            <span className="font-semibold text-slate-900">{frameworkName}</span>
            <Badge variant="outline" className="ml-2 text-[10px]">{jurisdiction}</Badge>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {results.filter(r => r.status === 'pass').length}/{results.length} rules passed
        </div>
      </div>

      {/* Rule results */}
      <div className="space-y-2">
        {results.map((result) => {
          const Icon = STATUS_ICON[result.status]
          const isExpanded = expandedResult === result.id

          return (
            <Card key={result.id} className={result.overridden ? 'opacity-60' : ''}>
              <CardContent className="py-3 px-4">
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${STATUS_COLOR[result.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-900">{result.message}</span>
                      {result.overridden && (
                        <Badge variant="outline" className="text-[10px]">
                          <ShieldOff className="h-3 w-3 mr-1" /> Overridden
                        </Badge>
                      )}
                    </div>
                    {result.rule_code && (
                      <span className="text-[10px] font-mono text-slate-400">{result.rule_code}</span>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 ml-7 space-y-2">
                    {result.triggered_by.length > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-slate-600">Triggered by:</div>
                        {result.triggered_by.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-slate-500 ml-2">
                            <span className="font-mono">{t.cas_number}</span>
                            <span>{t.chemical_name}</span>
                            {t.concentration_pct !== null && t.concentration_pct !== undefined && (
                              <Badge variant="outline" className="text-[10px]">
                                {t.concentration_pct}%
                              </Badge>
                            )}
                            <span className="text-slate-400">— {t.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.overridden && result.override_reason && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">
                        Override reason: {result.override_reason}
                      </div>
                    )}

                    {/* Override button */}
                    {!result.overridden && (result.status === 'fail' || result.status === 'warning') && onOverride && (
                      <div className="pt-1">
                        {overrideId === result.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Reason for override..."
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              className="flex-1 text-xs border rounded px-2 py-1"
                            />
                            <Button size="sm" variant="outline" onClick={() => handleOverride(result.id)}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setOverrideId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-slate-500"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOverrideId(result.id)
                            }}
                          >
                            <ShieldOff className="h-3 w-3 mr-1" /> Override
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
