'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Shield,
  Globe,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'

export interface ComplianceStats {
  totalSheets: number
  completeSheets: number
  incompleteSheets: number
  overdueSheets: number
  dataCompleteness: number
  dppReadiness: number
  recentAlerts: ComplianceAlert[]
  regulatoryGaps: RegulatoryGap[]
}

export interface ComplianceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  affectedSheets: number
  date: string
}

export interface RegulatoryGap {
  id: string
  regulation: string
  description: string
  sheetCount: number
  severity: 'high' | 'medium' | 'low'
}

interface ComplianceStatusDashboardProps {
  stats: ComplianceStats
}

export function ComplianceStatusDashboard({ stats }: ComplianceStatusDashboardProps) {
  const completionPercentage = stats.totalSheets > 0
    ? Math.round((stats.completeSheets / stats.totalSheets) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Hero Stats - Liquid Design */}
      <div className="relative">
        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-linear-to-r from-emerald-500/10 via-blue-500/10 to-violet-500/10 blur-3xl -z-10" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Sheets - Emerald */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Total Sheets
                </p>
                <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {stats.totalSheets}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {stats.completeSheets} complete · {stats.incompleteSheets} pending
                </p>
              </div>
            </div>
          </div>

          {/* Completion Rate - Blue */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/50">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-950/50 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  +12%
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Completion Rate
                </p>
                <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {completionPercentage}%
                </p>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            </div>
          </div>

          {/* Data Quality - Violet */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-950/50">
                  <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <Sparkles className="h-4 w-4 text-neutral-400 group-hover:text-violet-600 transition-colors" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Data Quality
                </p>
                <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {stats.dataCompleteness}%
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Average field completeness
                </p>
              </div>
            </div>
          </div>

          {/* DPP Readiness - Amber/Green */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/50">
                  <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <Badge
                  className={`${
                    stats.dppReadiness >= 80
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  } px-2 py-1 text-xs font-semibold`}
                >
                  {stats.dppReadiness >= 80 ? 'Ready' : 'In Progress'}
                </Badge>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  DPP Readiness
                </p>
                <p className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {stats.dppReadiness}%
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  EU Digital Product Passport
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown - Refined Cards */}
      <Card className="border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-900/5">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Compliance Status Overview</CardTitle>
              <CardDescription>
                Real-time monitoring across your supply chain
              </CardDescription>
            </div>
            <a
              href="/sheets"
              className="text-sm text-primary hover:underline"
            >
              View all sheets →
            </a>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Complete - Emerald */}
            <a href="/sheets?status=completed" className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-4 p-6 rounded-2xl bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 transition-transform hover:scale-[1.02]">
                <div className="p-4 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
                    {stats.completeSheets}
                  </p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500 mt-1">
                    Complete
                  </p>
                </div>
              </div>
            </a>

            {/* In Progress - Blue */}
            <a href="/sheets?status=in_progress" className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-4 p-6 rounded-2xl bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800/50 transition-transform hover:scale-[1.02]">
                <div className="p-4 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/25">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">
                    {stats.incompleteSheets}
                  </p>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-500 mt-1">
                    In Progress
                  </p>
                </div>
              </div>
            </a>

            {/* Overdue - Red */}
            <a href="/sheets?status=overdue" className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-red-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-4 p-6 rounded-2xl bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/10 border border-red-200 dark:border-red-800/50 transition-transform hover:scale-[1.02]">
                <div className="p-4 rounded-xl bg-red-500 shadow-lg shadow-red-500/25">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400 tracking-tight">
                    {stats.overdueSheets}
                  </p>
                  <p className="text-sm font-medium text-red-600 dark:text-red-500 mt-1">
                    Overdue
                  </p>
                </div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts - Timeline Design */}
      {stats.recentAlerts.length > 0 && (
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-900/5">
          <CardHeader className="border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-xl">Regulatory Intelligence</CardTitle>
            </div>
            <CardDescription>
              Latest compliance updates and regulatory changes
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stats.recentAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className="group relative animate-in fade-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  {/* Timeline connector */}
                  {index < stats.recentAlerts.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
                  )}

                  <div className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200">
                    <div className={`relative p-2.5 rounded-lg ${
                      alert.type === 'error'
                        ? 'bg-red-100 dark:bg-red-950/50'
                        : alert.type === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/50'
                        : 'bg-blue-100 dark:bg-blue-950/50'
                    }`}>
                      {alert.type === 'error' && (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      {alert.type === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                      {alert.type === 'info' && (
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-neutral-900 dark:text-white text-sm">
                          {alert.title}
                        </h4>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {alert.affectedSheets} {alert.affectedSheets === 1 ? 'sheet' : 'sheets'}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {alert.description}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">
                        {new Date(alert.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regulatory Gaps - Action Cards */}
      {stats.regulatoryGaps.length > 0 && (
        <Card className="border-neutral-200 dark:border-neutral-800 shadow-lg shadow-neutral-900/5">
          <CardHeader className="border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-xl">Compliance Gaps</CardTitle>
            </div>
            <CardDescription>
              Priority actions to maintain full regulatory compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {stats.regulatoryGaps.map((gap, index) => (
                <div
                  key={gap.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 animate-in fade-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-neutral-900 dark:text-white text-sm">
                        {gap.regulation}
                      </h4>
                      <Badge
                        className={`text-xs px-2 py-0.5 ${
                          gap.severity === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
                            : gap.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {gap.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {gap.description}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">
                      Affects {gap.sheetCount} {gap.sheetCount === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
