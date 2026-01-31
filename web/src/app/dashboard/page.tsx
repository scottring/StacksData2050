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
  Inbox,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ComplianceStatusDashboard, type ComplianceStats, type ComplianceAlert, type RegulatoryGap } from '@/components/dashboard/compliance-status-dashboard'
import { AssociationMetricsDashboard, type AssociationMetrics } from '@/components/dashboard/association-metrics-dashboard'
import { RequestSheetDialog } from '@/components/sheets/request-sheet-dialog'

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
  // Request tracking
  pendingIncomingRequests?: number
  pendingOutgoingRequests?: number
  totalIncomingRequests?: number
  totalOutgoingRequests?: number
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

function calculateComplianceStats(
  customerSheets: Array<{
    id: string
    name: string
    status: string | null
    modified_at: string | null
    created_at?: string | null
  }>
): ComplianceStats {
  // CRITICAL: Deduplicate by name, keeping only the most recent version
  const sheetsByName = new Map<string, typeof customerSheets[0]>()
  customerSheets.forEach(sheet => {
    const existing = sheetsByName.get(sheet.name)
    if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
      sheetsByName.set(sheet.name, sheet)
    }
  })
  const uniqueSheets = Array.from(sheetsByName.values())

  const totalSheets = uniqueSheets.length
  const completeSheets = uniqueSheets.filter(s =>
    s.status === 'completed' || s.status === 'approved'
  ).length
  const incompleteSheets = uniqueSheets.filter(s =>
    s.status === 'in_progress' || s.status === 'pending' || !s.status
  ).length

  // Calculate overdue sheets (created > 30 days ago, not complete) - use uniqueSheets
  const now = new Date()
  const overdueSheets = uniqueSheets.filter(s => {
    if (s.status === 'completed' || s.status === 'approved') return false
    const createdDate = s.created_at ? new Date(s.created_at) : new Date(s.modified_at || '')
    const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysOld > 30
  }).length

  // Calculate data completeness (simplified - based on status)
  const dataCompleteness = totalSheets > 0
    ? Math.round((completeSheets / totalSheets) * 100)
    : 0

  // Calculate DPP readiness (estimate based on completion + buffer for missing fields)
  const dppReadiness = totalSheets > 0
    ? Math.max(0, Math.round((completeSheets / totalSheets) * 100 * 0.9)) // 90% of completion
    : 0

  // Generate alerts from real data
  const recentAlerts: ComplianceAlert[] = []

  if (overdueSheets > 0) {
    recentAlerts.push({
      id: 'overdue-sheets',
      type: 'warning',
      title: 'Overdue Product Data Sheets',
      description: `${overdueSheets} product data sheets have been pending for more than 30 days. Request completion from suppliers to maintain compliance.`,
      affectedSheets: overdueSheets,
      date: new Date().toISOString().split('T')[0],
    })
  }

  if (incompleteSheets > totalSheets * 0.3) {
    recentAlerts.push({
      id: 'incomplete-data',
      type: 'info',
      title: 'Incomplete Supplier Data',
      description: `${incompleteSheets} sheets are still in progress. Complete data collection ensures regulatory readiness.`,
      affectedSheets: incompleteSheets,
      date: new Date().toISOString().split('T')[0],
    })
  }

  // Add realistic regulatory alerts
  recentAlerts.push({
    id: 'eu-pfas-2026',
    type: 'warning',
    title: 'EU PFAS Restrictions - January 2026',
    description: 'New restrictions on per- and polyfluoroalkyl substances (PFAS) in food contact materials will take effect. Review products containing fluoropolymers.',
    affectedSheets: Math.floor(totalSheets * 0.1), // Estimate 10% affected
    date: '2025-12-15',
  })

  if (dppReadiness < 90) {
    recentAlerts.push({
      id: 'dpp-readiness',
      type: 'info',
      title: 'Digital Product Passport Preparation',
      description: 'EU DPP requirements take effect in 2027. Ensure all product composition data, carbon footprint, and supplier information is complete.',
      affectedSheets: incompleteSheets,
      date: '2025-12-10',
    })
  }

  // Generate regulatory gaps
  const regulatoryGaps: RegulatoryGap[] = []

  if (incompleteSheets > 0) {
    regulatoryGaps.push({
      id: 'missing-data',
      regulation: 'Supplier Documentation Gaps',
      description: 'Product sheets require complete composition data, regulatory declarations, and test results for full compliance.',
      sheetCount: incompleteSheets,
      severity: incompleteSheets > totalSheets * 0.5 ? 'high' : 'medium',
    })
  }

  if (dppReadiness < 90) {
    regulatoryGaps.push({
      id: 'dpp-gaps',
      regulation: 'Digital Product Passport Data Fields',
      description: 'Complete product composition data, carbon footprint, and supplier information needed for DPP compliance by 2027.',
      sheetCount: Math.ceil(totalSheets * (1 - dppReadiness / 100)),
      severity: 'medium',
    })
  }

  return {
    totalSheets,
    completeSheets,
    incompleteSheets,
    overdueSheets,
    dataCompleteness,
    dppReadiness,
    recentAlerts: recentAlerts.slice(0, 3), // Top 3 alerts
    regulatoryGaps: regulatoryGaps.slice(0, 3), // Top 3 gaps
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null)
  const [associationMetrics, setAssociationMetrics] = useState<AssociationMetrics | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [chemicalStats, setChemicalStats] = useState<{
    totalChemicals: number
    pfasCount: number
    reachCount: number
    prop65Count: number
    sheetsWithChemicals: number
  } | null>(null)

  async function fetchAssociationMetrics(supabase: ReturnType<typeof createClient>) {
    // Use server-side API route to bypass RLS with service role
    const response = await fetch('/api/admin/association-metrics')

    if (!response.ok) {
      console.error('Failed to fetch association metrics:', await response.text())
      return null
    }

    const { sheets: rawSheets, companies, users } = await response.json()

    // Filter out test sheets and sheets from Stacks Data company
    const stacksDataCompany = companies.find((c: any) => c.name === 'Stacks Data')
    const sheets = rawSheets.filter((s: any) => {
      // Exclude Stacks Data company sheets
      if (stacksDataCompany && (s.company_id === stacksDataCompany.id || s.requesting_company_id === stacksDataCompany.id)) {
        return false
      }
      // Exclude sheets with "test" in the name (case insensitive)
      if (s.name && s.name.toLowerCase().includes('test')) {
        return false
      }
      return true
    })

    console.log('📊 Dashboard Data:', {
      totalRawSheets: rawSheets.length,
      totalFilteredSheets: sheets.length,
      totalCompanies: companies.length,
      sampleStatuses: sheets.slice(0, 5).map((s: any) => s.status)
    })

    // NOTE: All sheets from Bubble migration have NULL status
    // Using activity-based metrics instead
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Active = modified in last 90 days (proxy for "being worked on")
    const activeSheets90d = sheets.filter((s: any) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= ninetyDaysAgo
    })

    const activeSheets30d = sheets.filter((s: any) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= thirtyDaysAgo
    })

    // Sheet status categories based on activity
    const activeSheetsCount = activeSheets90d.length  // Modified in last 90 days
    const recentSheetsCount = activeSheets30d.length  // Modified in last 30 days
    const fulfilledSheetsCount = sheets.length - activeSheets90d.length  // Not modified in 90 days

    const overallCompletionRate = sheets.length > 0
      ? Math.round((activeSheets90d.length / sheets.length) * 100)
      : 0

    // DPP readiness: based on recent activity (30d) as proxy for data quality
    const dppReadiness = sheets.length > 0
      ? Math.max(0, Math.round((activeSheets30d.length / sheets.length) * 100 * 0.65))
      : 0

    const sheetsCreated7d = sheets.filter((s: any) => {
      const created = s.created_at ? new Date(s.created_at) : null
      return created && created >= sevenDaysAgo
    }).length

    const sheetsModified7d = sheets.filter((s: any) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= sevenDaysAgo
    }).length

    // Calculate active users based on last_sign_in_at (now included from auth.users)
    const activeUsers30d = users.filter((u: any) => {
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
      return lastSignIn && lastSignIn >= thirtyDaysAgo
    }).length

    // Calculate per-company metrics using activity instead of status
    const companyMetrics = companies.map((company: any) => {
      const companySheets = sheets.filter((s: any) => s.company_id === company.id)

      // Deduplicate by name, keeping only the most recent version of each product
      const sheetsByName = new Map()
      companySheets.forEach((sheet: any) => {
        const existing = sheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          sheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueCompanySheets = Array.from(sheetsByName.values())

      // Debug: log first few companies
      if (company.name === 'UPM' || company.name === 'Sappi') {
        console.log(`${company.name}: ${companySheets.length} total, ${uniqueCompanySheets.length} unique`)
      }

      // Activity rate = sheets modified in last 90 days
      const companyActive = uniqueCompanySheets.filter((s: any) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= ninetyDaysAgo
      }).length

      const completionRate = uniqueCompanySheets.length > 0
        ? Math.round((companyActive / uniqueCompanySheets.length) * 100)
        : 0

      const hasRecentActivity = uniqueCompanySheets.some((s: any) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= thirtyDaysAgo
      })

      return {
        id: company.id,
        name: company.name,
        totalSheets: uniqueCompanySheets.length,
        completionRate,
        isActive: hasRecentActivity
      }
    })

    // Sort by total sheets first (most important), then activity rate
    const topCompanies = companyMetrics
      .filter((c: any) => c.totalSheets > 0)
      .sort((a: any, b: any) => {
        // First by total sheets (volume matters)
        if (b.totalSheets !== a.totalSheets) {
          return b.totalSheets - a.totalSheets
        }
        // Then by activity rate
        return b.completionRate - a.completionRate
      })

    const activeCompanies = companies.filter((c: any) => {
      const companySheets = sheets.filter((s: any) => s.company_id === c.id)
      return companySheets.some((s: any) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= thirtyDaysAgo
      })
    }).length

    setAssociationMetrics({
      totalCompanies: companies.length,
      activeCompanies: activeCompanies,
      totalSheets: sheets.length,
      activeSheetsCount,
      recentSheetsCount,
      fulfilledSheetsCount,
      totalUsers: users.length,
      activeUsers30d,
      overallCompletionRate,
      sheetsCreated7d,
      sheetsModified7d,
      dppReadiness,
      topCompanies
    })
  }

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()

      // Get current user's company and super admin status
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check if user is super admin by calling the helper function
      const { data: superAdminCheck, error: superAdminError } = await supabase.rpc('is_super_admin')
      console.log('🔐 Super Admin Check:', {
        result: superAdminCheck,
        error: superAdminError,
        userId: user.id,
        email: user.email
      })

      const isSuper = superAdminCheck === true
      setIsSuperAdmin(isSuper)

      // If super admin, fetch association-wide metrics
      if (isSuper) {
        console.log('✅ Fetching association-wide metrics as super admin')
        await fetchAssociationMetrics(supabase)
        setLoading(false)
        return
      } else {
        console.log('❌ Not super admin, showing company view')
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

      // Fetch all sheets for stats calculation in batches (Supabase caps at 1000 per request)
      const { count: totalCount } = await supabase
        .from('sheets')
        .select('*', { count: 'exact', head: true })

      const batchSize = 1000
      const totalBatches = Math.ceil((totalCount || 0) / batchSize)
      let allSheets: any[] = []

      // Fetch in batches
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = start + batchSize - 1
        const { data: batch } = await supabase
          .from('sheets')
          .select('id, name, status, company_id, requesting_company_id, modified_at, created_at')
          .range(start, end)

        if (batch) {
          allSheets = allSheets.concat(batch)
        }
      }

      console.log(`✓ Dashboard fetched ${allSheets.length} sheets in ${totalBatches} batch(es)`)

      // As Supplier: sheets assigned TO my company
      const rawSupplierSheets = (allSheets || []).filter(s => s.requesting_company_id === companyId)

      // CRITICAL: Deduplicate supplier sheets by name, keeping most recent
      const supplierSheetsByName = new Map<string, any>()
      rawSupplierSheets.forEach(sheet => {
        const existing = supplierSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          supplierSheetsByName.set(sheet.name, sheet)
        }
      })
      const supplierSheets = Array.from(supplierSheetsByName.values())

      // As Customer: sheets created BY my company
      const rawCustomerSheets = (allSheets || []).filter(s => s.company_id === companyId)

      // CRITICAL: Deduplicate customer sheets by name, keeping most recent
      const customerSheetsByName = new Map<string, any>()
      rawCustomerSheets.forEach(sheet => {
        const existing = customerSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          customerSheetsByName.set(sheet.name, sheet)
        }
      })
      const customerSheets = Array.from(customerSheetsByName.values())

      // Calculate time windows for activity-based metrics (used for both supplier and customer views)
      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Supplier metrics: Use activity-based calculations
      // Completed = sheets with completed/approved status OR maintained in last 90 days
      const supplierCompletedTasks = supplierSheets.filter(s => {
        const isStatusComplete = s.status === 'completed' || s.status === 'approved'
        const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo
        return isStatusComplete || isActivelyMaintained
      }).length

      // Open tasks = sheets with in_progress/pending status OR modified in last 30 days but not in 90
      const supplierOpenTasks = supplierSheets.filter(s => {
        const isInProgress = s.status === 'in_progress' || s.status === 'pending'
        const isRecentlyModified = s.modified_at && new Date(s.modified_at) >= thirtyDaysAgo
        const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo
        // Count as "open" if recently modified but not yet in the 90-day "completed" window
        return isInProgress || (isRecentlyModified && !isActivelyMaintained)
      }).length

      // Customer metrics: Calculate compliant products based on activity

      // Products are "compliant" if they've been actively maintained (modified in last 90 days)
      // OR if they have completed/approved status
      const customerCompliantProducts = customerSheets.filter(s => {
        const isStatusComplete = s.status === 'completed' || s.status === 'approved'
        const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo
        return isStatusComplete || isActivelyMaintained
      }).length

      // Pending reviews = sheets with in_progress status OR modified in last 30 days (actively being worked)
      const customerPendingReviews = customerSheets.filter(s => {
        const isInProgress = s.status === 'in_progress'
        const isRecentlyModified = s.modified_at && new Date(s.modified_at) >= thirtyDaysAgo
        return isInProgress || isRecentlyModified
      }).length

      // Count unique suppliers (requesting_company_id)
      const supplierIds = new Set(customerSheets.map(s => s.requesting_company_id).filter(Boolean))
      const customerTotalSuppliers = supplierIds.size

      // Count verified suppliers (all their sheets are actively maintained OR have completed status)
      let verifiedCount = 0
      supplierIds.forEach(supplierId => {
        const supplierCustomerSheets = customerSheets.filter(s => s.requesting_company_id === supplierId)
        const allCompliant = supplierCustomerSheets.every(s => {
          const isStatusComplete = s.status === 'completed' || s.status === 'approved'
          const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo
          return isStatusComplete || isActivelyMaintained
        })
        if (allCompliant && supplierCustomerSheets.length > 0) verifiedCount++
      })

      // Active suppliers (have at least one sheet modified in last 30 days OR with in_progress/pending status)
      let activeCount = 0
      supplierIds.forEach(supplierId => {
        const hasActive = customerSheets.some(s => {
          if (s.requesting_company_id !== supplierId) return false
          const isInProgress = s.status === 'in_progress' || s.status === 'pending'
          const isRecentlyModified = s.modified_at && new Date(s.modified_at) >= thirtyDaysAgo
          return isInProgress || isRecentlyModified
        })
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
          status: s.status,
          companyName: companyMap.get(s.company_id === companyId ? s.requesting_company_id : s.company_id) || 'Unknown',
          modifiedAt: s.modified_at
        }))

      // Fetch request metrics (table may not exist yet)
      let pendingIncoming = 0
      let pendingOutgoing = 0
      let incomingTotal = 0
      let outgoingTotal = 0

      const { data: incomingRequests, error: reqError } = await supabase
        .from('requests')
        .select('id, status')
        .eq('reader_company_id', companyId)

      if (!reqError) {
        const { data: outgoingRequests } = await supabase
          .from('requests')
          .select('id, status')
          .eq('owner_company_id', companyId)

        pendingIncoming = incomingRequests?.filter(r =>
          r.status === 'created' || r.status === 'reviewed'
        ).length || 0

        pendingOutgoing = outgoingRequests?.filter(r =>
          r.status === 'created' || r.status === 'reviewed'
        ).length || 0

        incomingTotal = incomingRequests?.length || 0
        outgoingTotal = outgoingRequests?.length || 0

        console.log('📬 Request Metrics:', {
          incomingTotal,
          pendingIncoming,
          outgoingTotal,
          pendingOutgoing
        })
      }

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
        recentSheets,
        pendingIncomingRequests: pendingIncoming,
        pendingOutgoingRequests: pendingOutgoing,
        totalIncomingRequests: incomingTotal,
        totalOutgoingRequests: outgoingTotal
      })

      // Calculate compliance stats from customer sheets
      const compliance = calculateComplianceStats(customerSheets)
      setComplianceStats(compliance)

      // Fetch chemical compliance stats (tables may not exist yet)
      try {
        const { count: totalChemicals, error: invError } = await supabase
          .from('chemical_inventory')
          .select('*', { count: 'exact', head: true })

        // Only proceed if the table exists (no error)
        if (!invError) {
          const { count: pfasCount } = await supabase
            .from('chemical_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('is_pfas', true)

          const { count: reachCount } = await supabase
            .from('chemical_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('is_reach_svhc', true)

          const { count: prop65Count } = await supabase
            .from('chemical_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('is_prop65', true)

          // Get sheet_chemicals and filter to only this company's sheets
          const customerSheetIds = new Set(customerSheets.map(s => s.id))

          const { data: sheetChemicals } = await supabase
            .from('sheet_chemicals')
            .select('sheet_id')

          // Only count sheets that belong to this company
          const sheetsWithChemicals = new Set(
            sheetChemicals
              ?.filter(sc => customerSheetIds.has(sc.sheet_id))
              .map(sc => sc.sheet_id) || []
          ).size

          setChemicalStats({
            totalChemicals: totalChemicals || 0,
            pfasCount: pfasCount || 0,
            reachCount: reachCount || 0,
            prop65Count: prop65Count || 0,
            sheetsWithChemicals
          })
        }
      } catch {
        // Chemical tables don't exist yet - skip this section
        console.log('Chemical compliance tables not available')
      }

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

  // Show association-wide dashboard for super admins
  if (isSuperAdmin && associationMetrics) {
    return (
      <AppLayout title="Dashboard">
        <AssociationMetricsDashboard metrics={associationMetrics} />
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

        {/* Request Tracking Section */}
        {(stats.totalIncomingRequests || 0) > 0 || (stats.totalOutgoingRequests || 0) > 0 ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Request Tracking</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Product data requests sent and received
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Incoming Requests"
                value={stats.totalIncomingRequests || 0}
                description={`${stats.pendingIncomingRequests || 0} pending response`}
                icon={Inbox}
              />
              <StatCard
                title="Pending Incoming"
                value={stats.pendingIncomingRequests || 0}
                description="Awaiting your response"
                icon={Clock}
              />
              <StatCard
                title="Outgoing Requests"
                value={stats.totalOutgoingRequests || 0}
                description={`${stats.pendingOutgoingRequests || 0} pending`}
                icon={Send}
              />
              <StatCard
                title="Pending Outgoing"
                value={stats.pendingOutgoingRequests || 0}
                description="Awaiting supplier response"
                icon={Clock}
              />
            </div>
          </section>
        ) : null}

        {/* As Customer Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Supplier Compliance (As Customer)</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <ComplianceRing
              compliant={stats.customerCompliantProducts}
              total={stats.customerTotalProducts}
              title="Products Active"
              subtitle="Maintained within 90 days"
            />
            <ComplianceRing
              compliant={stats.customerVerifiedSuppliers}
              total={stats.customerTotalSuppliers}
              title="Suppliers Current"
              subtitle="All products maintained"
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

        {/* Chemical Compliance Section */}
        {chemicalStats && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Chemical Compliance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Chemical inventory and regulatory substance tracking
                </p>
              </div>
              <a
                href="/compliance/supplier"
                className="text-sm text-primary hover:underline"
              >
                View chemical inventory →
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard
                title="Chemical Inventory"
                value={chemicalStats.totalChemicals}
                description="Unique substances tracked"
                icon={Package}
              />
              <StatCard
                title="Sheets with Chemicals"
                value={chemicalStats.sheetsWithChemicals}
                description="Product data sheets"
                icon={Building2}
              />
              <Card className={chemicalStats.pfasCount > 0 ? 'border-red-200 bg-red-50' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    PFAS Substances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {chemicalStats.pfasCount}
                  </div>
                  <p className="text-xs text-muted-foreground">EU restriction pending</p>
                </CardContent>
              </Card>
              <Card className={chemicalStats.reachCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    REACH SVHC
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {chemicalStats.reachCount}
                  </div>
                  <p className="text-xs text-muted-foreground">High concern substances</p>
                </CardContent>
              </Card>
              <Card className={chemicalStats.prop65Count > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Prop 65
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {chemicalStats.prop65Count}
                  </div>
                  <p className="text-xs text-muted-foreground">California listed</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Compliance Intelligence Section */}
        {complianceStats && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compliance Intelligence</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time regulatory monitoring and EU Digital Product Passport readiness
                </p>
              </div>
              <a
                href="/demo/compliance"
                className="text-sm text-primary hover:underline"
              >
                View full compliance dashboard →
              </a>
            </div>
            <ComplianceStatusDashboard stats={complianceStats} />
          </section>
        )}

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
                      <a
                        key={sheet.id}
                        href={`/sheets/${sheet.id}`}
                        className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      >
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
                      </a>
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
                <button
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  onClick={() => setRequestDialogOpen(true)}
                >
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

      {/* Request Product Data Dialog */}
      <RequestSheetDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
      />
    </AppLayout>
  )
}
