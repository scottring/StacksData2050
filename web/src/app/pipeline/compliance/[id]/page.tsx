import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'
import ComplianceStatusBanner from '@/components/pipeline/compliance-status-banner'
import ComplianceDetailClient from './compliance-detail-client'

export default async function ComplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch assessment
  const { data: assessment } = await supabase
    .from('compliance_assessments')
    .select('*')
    .eq('id', id)
    .single()

  if (!assessment) notFound()

  // Fetch results
  const { data: results } = await supabase
    .from('compliance_results')
    .select('*')
    .eq('assessment_id', id)

  // Fetch frameworks
  const { data: frameworks } = await supabase
    .from('regulatory_frameworks')
    .select('*')
    .eq('active', true)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-blue-500" />
            <h1 className="text-xl font-bold text-slate-900">{assessment.product_name}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Badge variant="outline">Assessment</Badge>
            <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <ComplianceStatusBanner
        status={assessment.overall_status}
        rulesEvaluated={assessment.total_rules_evaluated}
        rulesPassed={assessment.rules_passed}
        rulesFailed={assessment.rules_failed}
        rulesWarning={assessment.rules_warning}
      />

      {/* Framework tabs (client component) */}
      <ComplianceDetailClient
        assessmentId={id}
        results={results || []}
        frameworks={frameworks || []}
      />
    </div>
  )
}
