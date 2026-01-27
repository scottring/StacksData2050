'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Building2,
  Package,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Shield,
} from 'lucide-react'

export interface AssociationMetrics {
  totalCompanies: number
  activeCompanies: number
  totalSheets: number
  activeSheetsCount: number
  recentSheetsCount: number
  fulfilledSheetsCount: number
  totalUsers: number
  activeUsers30d: number
  overallCompletionRate: number
  sheetsCreated7d: number
  sheetsModified7d: number
  dppReadiness: number
  topCompanies: Array<{
    id: string
    name: string
    totalSheets: number
    completionRate: number
    isActive: boolean
  }>
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ title, value, description, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  }

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600">
              {trend.value > 0 ? '+' : ''}{trend.value}
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AssociationMetricsDashboard({ metrics }: { metrics: AssociationMetrics }) {
  return (
    <div className="space-y-6">
      {/* Super Admin Badge */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-violet-600" />
        <h1 className="text-2xl font-bold">Association Overview</h1>
        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-800">
          Super Admin
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Companies"
          value={metrics.totalCompanies}
          description={`${metrics.activeCompanies} active`}
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Total Product Sheets"
          value={metrics.totalSheets}
          description={`${metrics.activeSheetsCount} active (90d)`}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Network Users"
          value={metrics.totalUsers}
          description={`${metrics.activeUsers30d} active (30d)`}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Activity Rate (90d)"
          value={`${metrics.overallCompletionRate}%`}
          description="Sheets modified in last 90 days"
          icon={CheckCircle2}
          variant={metrics.overallCompletionRate >= 70 ? 'success' : metrics.overallCompletionRate >= 40 ? 'warning' : 'danger'}
        />
      </div>

      {/* Compliance & Activity Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DPP Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-emerald-600">{metrics.dppReadiness}%</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Network-Wide
                </Badge>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${metrics.dppReadiness}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                EU Digital Product Passport compliance target: 2027
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sheet Activity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="/sheets?filter=active_90d"
                className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm">Active (90d)</span>
                </div>
                <span className="font-medium">{metrics.activeSheetsCount}</span>
              </a>
              <a
                href="/sheets?filter=recent_30d"
                className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Recent (30d)</span>
                </div>
                <span className="font-medium">{metrics.recentSheetsCount}</span>
              </a>
              <a
                href="/sheets?filter=fulfilled"
                className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Fulfilled</span>
                </div>
                <span className="font-medium">{metrics.fulfilledSheetsCount}</span>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Last 7 days</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Created</span>
                    <Badge variant="outline">{metrics.sheetsCreated7d}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Modified</span>
                    <Badge variant="outline">{metrics.sheetsModified7d}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Companies by Sheet Volume</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Activity % = sheets modified in last 90 days
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.topCompanies.slice(0, 10).map((company, index) => (
              <a
                key={company.id}
                href={`/admin/companies/${company.id}`}
                className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{company.name}</p>
                    {company.isActive && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {company.totalSheets} sheets
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative h-2 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: `${company.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {company.completionRate}%
                  </span>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
