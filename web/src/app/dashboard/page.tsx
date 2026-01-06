'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
  Building2,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  // As supplier
  supplierOpenTasks: number
  supplierCompletedTasks: number
  supplierTotalTasks: number
  // As customer
  customerTotalProducts: number
  customerCompliantProducts: number
  customerPendingReviews: number
  customerActiveSuppliers: number
  customerVerifiedSuppliers: number
  customerTotalSuppliers: number
  // Recent activity
  recentSheets: Array<{
    id: string
    name: string
    status: string | null
    companyName: string | null
    modifiedAt: string | null
  }>
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface TaskProgressProps {
  open: number
  completed: number
  total: number
  title: string
}

function TaskProgress({ open, completed, total, title }: TaskProgressProps) {
  const openPercent = total > 0 ? (open / total) * 100 : 0
  const completedPercent = total > 0 ? (completed / total) * 100 : 0

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="flex h-4 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-primary transition-all"
                style={{ width: `${completedPercent}%` }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${openPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{completed} completed</span>
              <span>{open} open</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col items-center rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{completed}</span>
              </div>
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <div className="flex flex-col items-center rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{open}</span>
              </div>
              <span className="text-xs text-muted-foreground">Open Tasks</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ComplianceRingProps {
  compliant: number
  total: number
  title: string
  subtitle: string
}

function ComplianceRing({ compliant, total, title, subtitle }: ComplianceRingProps) {
  const percent = total > 0 ? Math.round((compliant / total) * 100) : 0
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (percent / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{percent}%</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
        <p className="text-xs text-muted-foreground">
          {compliant} of {total}
        </p>
      </CardContent>
    </Card>
  )
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
    case 'approved':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
    case 'in_progress':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
    default:
      return <Badge variant="outline">{status || 'Draft'}</Badge>
  }
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()

      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const companyId = userProfile?.company_id
      setUserCompanyId(companyId)

      if (!companyId) {
        setLoading(false)
        return
      }

      // Fetch all sheets for stats calculation
      const { data: allSheets } = await supabase
        .from('sheets')
        .select('id, name, new_status, company_id, assigned_to_company_id, modified_at')

      // As Supplier: sheets assigned TO my company
      const supplierSheets = (allSheets || []).filter(s => s.assigned_to_company_id === companyId)
      const supplierOpenTasks = supplierSheets.filter(s =>
        s.new_status === 'in_progress' || s.new_status === 'pending'
      ).length
      const supplierCompletedTasks = supplierSheets.filter(s =>
        s.new_status === 'completed' || s.new_status === 'approved'
      ).length

      // As Customer: sheets created BY my company
      const customerSheets = (allSheets || []).filter(s => s.company_id === companyId)
      const customerCompliantProducts = customerSheets.filter(s =>
        s.new_status === 'completed' || s.new_status === 'approved'
      ).length
      const customerPendingReviews = customerSheets.filter(s =>
        s.new_status === 'in_progress'
      ).length

      // Count unique suppliers (assigned_to_company_id)
      const supplierIds = new Set(customerSheets.map(s => s.assigned_to_company_id).filter(Boolean))
      const customerTotalSuppliers = supplierIds.size

      // Count verified suppliers (all their sheets are complete)
      let verifiedCount = 0
      supplierIds.forEach(supplierId => {
        const supplierCustomerSheets = customerSheets.filter(s => s.assigned_to_company_id === supplierId)
        const allComplete = supplierCustomerSheets.every(s =>
          s.new_status === 'completed' || s.new_status === 'approved'
        )
        if (allComplete && supplierCustomerSheets.length > 0) verifiedCount++
      })

      // Active suppliers (have at least one in_progress or pending sheet)
      let activeCount = 0
      supplierIds.forEach(supplierId => {
        const hasActive = customerSheets.some(s =>
          s.assigned_to_company_id === supplierId &&
          (s.new_status === 'in_progress' || s.new_status === 'pending')
        )
        if (hasActive) activeCount++
      })

      // Recent activity - get companies for names
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')

      const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

      // Recent sheets (both supplier and customer) - dedupe by ID
      const allRelevantSheets = [...supplierSheets, ...customerSheets]
      const uniqueSheets = Array.from(new Map(allRelevantSheets.map(s => [s.id, s])).values())
      const recentSheets = uniqueSheets
        .sort((a, b) => {
          const dateA = a.modified_at ? new Date(a.modified_at).getTime() : 0
          const dateB = b.modified_at ? new Date(b.modified_at).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          name: s.name,
          status: s.new_status,
          companyName: companyMap.get(s.company_id === companyId ? s.assigned_to_company_id : s.company_id) || 'Unknown',
          modifiedAt: s.modified_at
        }))

      setStats({
        supplierOpenTasks,
        supplierCompletedTasks,
        supplierTotalTasks: supplierSheets.length,
        customerTotalProducts: customerSheets.length,
        customerCompliantProducts,
        customerPendingReviews,
        customerActiveSuppliers: activeCount,
        customerVerifiedSuppliers: verifiedCount,
        customerTotalSuppliers,
        recentSheets
      })

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!stats) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Unable to load dashboard data</p>
        </div>
      </AppLayout>
    )
  }

  const supplierCompletionRate = stats.supplierTotalTasks > 0
    ? Math.round((stats.supplierCompletedTasks / stats.supplierTotalTasks) * 100)
    : 0

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* As Supplier Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your Tasks (As Supplier)</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <TaskProgress
              open={stats.supplierOpenTasks}
              completed={stats.supplierCompletedTasks}
              total={stats.supplierTotalTasks}
              title="Questionnaire Progress"
            />
            <StatCard
              title="Open Tasks"
              value={stats.supplierOpenTasks}
              description="Questionnaires pending"
              icon={Clock}
            />
            <StatCard
              title="Completion Rate"
              value={`${supplierCompletionRate}%`}
              description={`${stats.supplierCompletedTasks} of ${stats.supplierTotalTasks} complete`}
              icon={TrendingUp}
            />
          </div>
        </section>

        {/* As Customer Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Supplier Compliance (As Customer)</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <ComplianceRing
              compliant={stats.customerCompliantProducts}
              total={stats.customerTotalProducts}
              title="Products Compliant"
              subtitle="Across all suppliers"
            />
            <ComplianceRing
              compliant={stats.customerVerifiedSuppliers}
              total={stats.customerTotalSuppliers}
              title="Suppliers Verified"
              subtitle="Full compliance"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.customerPendingReviews}
              description="Awaiting your review"
              icon={AlertCircle}
            />
            <StatCard
              title="Active Suppliers"
              value={stats.customerActiveSuppliers}
              description="With ongoing requests"
              icon={Building2}
            />
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent Sheets</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentSheets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentSheets.map((sheet) => (
                      <div key={sheet.id} className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sheet.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {sheet.companyName}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(sheet.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(sheet.modifiedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <a
                  href="/suppliers"
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">View Suppliers</p>
                    <p className="text-xs text-muted-foreground">Manage supplier questionnaires</p>
                  </div>
                </a>
                <button className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Request Product Data</p>
                    <p className="text-xs text-muted-foreground">Send questionnaire to supplier</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
