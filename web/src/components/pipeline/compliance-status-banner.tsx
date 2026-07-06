import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComplianceStatusBannerProps {
  status: 'pass' | 'fail' | 'warning' | 'pending'
  rulesEvaluated: number
  rulesPassed: number
  rulesFailed: number
  rulesWarning: number
}

const STATUS_CONFIG = {
  pass: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-500',
    label: 'All Checks Passed',
  },
  fail: {
    icon: XCircle,
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
    label: 'Compliance Issues Found',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
    label: 'Warnings Detected',
  },
  pending: {
    icon: Clock,
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-800',
    iconColor: 'text-slate-400',
    label: 'Assessment Pending',
  },
}

export default function ComplianceStatusBanner({
  status,
  rulesEvaluated,
  rulesPassed,
  rulesFailed,
  rulesWarning,
}: ComplianceStatusBannerProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className={cn('rounded-xl border px-6 py-4', config.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-6 w-6', config.iconColor)} />
          <div>
            <div className={cn('font-semibold', config.text)}>{config.label}</div>
            <div className="text-sm text-slate-600 mt-0.5">
              {rulesEvaluated} rules evaluated across all frameworks
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-emerald-600">{rulesPassed}</div>
            <div className="text-[10px] text-slate-500 uppercase">Passed</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-red-600">{rulesFailed}</div>
            <div className="text-[10px] text-slate-500 uppercase">Failed</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-amber-600">{rulesWarning}</div>
            <div className="text-[10px] text-slate-500 uppercase">Warnings</div>
          </div>
        </div>
      </div>
    </div>
  )
}
