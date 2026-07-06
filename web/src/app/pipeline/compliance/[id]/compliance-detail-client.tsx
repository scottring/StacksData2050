'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import AssessmentFrameworkTab from '@/components/pipeline/assessment-framework-tab'
import { FRAMEWORK_SEEDS } from '@/lib/compliance/seed'

interface ComplianceDetailClientProps {
  assessmentId: string
  results: Array<{
    id: string
    status: string
    message: string
    triggered_by: unknown
    overridden: boolean
    override_reason: string | null
    rule_code: string | null
    framework_code: string | null
    rule_id: string | null
    framework_id: string | null
  }>
  frameworks: Array<{
    id: string
    code: string
    name: string
    jurisdiction: string
  }>
}

export default function ComplianceDetailClient({
  assessmentId,
  results,
  frameworks,
}: ComplianceDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string | null>(null)

  // Use DB frameworks if available, otherwise use seed data to group
  const frameworkList = frameworks.length > 0
    ? frameworks
    : FRAMEWORK_SEEDS.map(s => ({ id: `seed-${s.code}`, code: s.code, name: s.name, jurisdiction: s.jurisdiction }))

  // Group results by framework
  const groupedResults: Record<string, typeof results> = {}
  for (const fw of frameworkList) {
    groupedResults[fw.code] = results.filter(r =>
      r.framework_id === fw.id || r.framework_code === fw.code
    )
  }

  // Set default active tab to first framework with results
  const firstWithResults = frameworkList.find(fw => groupedResults[fw.code]?.length > 0)
  const currentTab = activeTab || firstWithResults?.code || frameworkList[0]?.code

  const handleOverride = async (resultId: string, reason: string) => {
    await fetch(`/api/compliance/results/${resultId}/override`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ override_reason: reason }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Framework tabs */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        {frameworkList.map((fw) => {
          const fwResults = groupedResults[fw.code] || []
          const hasFail = fwResults.some(r => r.status === 'fail' && !r.overridden)
          const hasWarning = fwResults.some(r => r.status === 'warning' && !r.overridden)

          return (
            <button
              key={fw.code}
              onClick={() => setActiveTab(fw.code)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                currentTab === fw.code
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {fw.name}
                {fwResults.length > 0 && (
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    hasFail ? 'bg-red-500' : hasWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active framework content */}
      {currentTab && (
        <div>
          {frameworkList
            .filter(fw => fw.code === currentTab)
            .map(fw => (
              <AssessmentFrameworkTab
                key={fw.code}
                frameworkCode={fw.code}
                frameworkName={fw.name}
                jurisdiction={fw.jurisdiction}
                results={(groupedResults[fw.code] || []).map(r => ({
                  id: r.id,
                  status: r.status as 'pass' | 'fail' | 'warning' | 'not_applicable' | 'insufficient_data',
                  message: r.message,
                  triggered_by: (r.triggered_by as Array<{
                    cas_number: string
                    chemical_name: string
                    reason: string
                    concentration_pct?: number | null
                  }>) || [],
                  overridden: r.overridden,
                  override_reason: r.override_reason,
                  rule_code: r.rule_code || undefined,
                  framework_code: r.framework_code || undefined,
                }))}
                onOverride={handleOverride}
              />
            ))}
        </div>
      )}

      {/* Generate document action */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/pipeline/documents')}
        >
          <FileText className="h-4 w-4 mr-2" /> Generate Compliance Document
        </Button>
      </div>
    </div>
  )
}
