import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'
import FrameworkStatusDot from '@/components/pipeline/framework-status-dot'

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  pass: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-100', label: 'Pass' },
  fail: { icon: XCircle, color: 'text-red-500 bg-red-100', label: 'Fail' },
  warning: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-100', label: 'Warning' },
  pending: { icon: Clock, color: 'text-slate-500 bg-slate-100', label: 'Pending' },
}

export default async function CompliancePage() {
  const supabase = await createClient()

  // Get recent assessments
  const { data: assessments } = await supabase
    .from('compliance_assessments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  // Get aggregate stats
  const { count: totalCount } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })

  const { count: passCount } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('overall_status', 'pass')

  const { count: failCount } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('overall_status', 'fail')

  const { count: warningCount } = await supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('overall_status', 'warning')

  // Get frameworks
  const { data: frameworks } = await supabase
    .from('regulatory_frameworks')
    .select('code, name, jurisdiction')
    .eq('active', true)

  const stats = [
    { label: 'Total Assessments', value: totalCount ?? 0, color: 'text-slate-900' },
    { label: 'Passing', value: passCount ?? 0, color: 'text-emerald-600' },
    { label: 'Failing', value: failCount ?? 0, color: 'text-red-600' },
    { label: 'Warnings', value: warningCount ?? 0, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Compliance Assessment</h1>
        </div>
        <p className="text-slate-500">
          Evaluate products against 6 regulatory frameworks. Automated rule checking with manual override support.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4 px-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Frameworks overview */}
      {frameworks && frameworks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Active Frameworks</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {frameworks.map((fw) => (
              <Card key={fw.code} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-3 text-center">
                  <div className="text-sm font-semibold text-slate-900">{fw.name}</div>
                  <div className="text-[10px] text-slate-500">{fw.jurisdiction}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent assessments */}
      {assessments && assessments.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Assessments</h2>
          <div className="space-y-2">
            {assessments.map((assessment) => {
              const status = STATUS_CONFIG[assessment.overall_status] || STATUS_CONFIG.pending
              const StatusIcon = status.icon
              return (
                <Link key={assessment.id} href={`/pipeline/compliance/${assessment.id}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-3 px-4">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${status.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {assessment.product_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assessment.total_rules_evaluated} rules &middot;{' '}
                          {assessment.rules_passed} passed &middot;{' '}
                          {assessment.rules_failed} failed &middot;{' '}
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {status.label}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No assessments yet. Extract a document and confirm it, then run a compliance assessment.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
