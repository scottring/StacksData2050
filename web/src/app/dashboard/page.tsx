'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Building2,
  Loader2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  Inbox,
  FlaskConical,
  Shield,
  AlertTriangle,
  FileCheck,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AssociationMetricsDashboard, type AssociationMetrics } from '@/components/dashboard/association-metrics-dashboard'
import { RequestSheetDialog } from '@/components/sheets/request-sheet-dialog'
import { cn } from '@/lib/utils'

interface DashboardStats {
  supplierOpenTasks: number
  supplierCompletedTasks: number
  supplierRejectedTasks: number
  supplierTotalTasks: number
  customerOpenProducts: number
  customerCompletedProducts: number
  customerRejectedProducts: number
  customerTotalProducts: number
  recentSheets: Array<{
    id: string
    name: string
    status: string | null
    companyName: string | null
    modifiedAt: string | null
    role: 'supplier' | 'customer'
  }>
  // Request tracking
  outgoingRequestsPending: number
  outgoingRequestsTotal: number
  incomingRequestsPending: number
  incomingRequestsTotal: number
}

interface ComplianceStats {
  totalChemicals: number
  pfasChemicals: number
  reachSvhcChemicals: number
  prop65Chemicals: number
  highRiskChemicals: number
}

type ViewMode = 'customer' | 'supplier'

interface StatusSegment {
  label: string
  value: number
  color: string
  gradientFrom: string
  gradientTo: string
  status: string
  icon: React.ComponentType<{ className?: string }>
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getStatusConfig(status: string | null, role?: 'supplier' | 'customer') {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'draft':
    case 'imported':
      return {
        label: 'Complete',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
        dotColor: 'bg-emerald-500',
      }
    case 'submitted':
      // Different labels based on perspective
      if (role === 'customer') {
        return {
          label: 'Ready for Review',
          className: 'bg-violet-50 text-violet-700 border-violet-200/50',
          dotColor: 'bg-violet-500',
        }
      }
      return {
        label: 'Awaiting Review',
        className: 'bg-sky-50 text-sky-700 border-sky-200/50',
        dotColor: 'bg-sky-500',
      }
    case 'in_progress':
      return {
        label: 'In Progress',
        className: 'bg-sky-50 text-sky-700 border-sky-200/50',
        dotColor: 'bg-sky-500',
      }
    case 'pending':
      return {
        label: 'Open',
        className: 'bg-amber-50 text-amber-700 border-amber-200/50',
        dotColor: 'bg-amber-500',
      }
    case 'rejected':
    case 'flagged':
      return {
        label: 'Rejected',
        className: 'bg-rose-50 text-rose-700 border-rose-200/50',
        dotColor: 'bg-rose-500',
      }
    default:
      return {
        label: status || 'Draft',
        className: 'bg-slate-50 text-slate-600 border-slate-200/50',
        dotColor: 'bg-slate-400',
      }
  }
}

// Animated counter component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (value - startValue) * easeOut)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{displayValue.toLocaleString()}</span>
}

// Mini sparkline chart component
function Sparkline({ data, color = 'emerald' }: { data: number[]; color?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 32
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const gradientId = `sparkline-gradient-${color}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#3b82f6'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#3b82f6'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#3b82f6'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-line"
      />
    </svg>
  )
}

// Elegant stat card with gradient accent
function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  accentColor = 'emerald',
  delay = 0,
  sparklineData,
  href,
  onClick,
}: {
  title: string
  value: number
  subtitle?: string
  trend?: number
  trendLabel?: string
  icon: React.ComponentType<{ className?: string }>
  accentColor?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate'
  delay?: number
  sparklineData?: number[]
  href?: string
  onClick?: () => void
}) {
  const colorMap = {
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-200/30',
      icon: 'text-emerald-600',
      accent: 'bg-emerald-500',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-200/30',
      icon: 'text-amber-600',
      accent: 'bg-amber-500',
    },
    sky: {
      bg: 'from-sky-500/10 to-sky-500/5',
      border: 'border-sky-200/30',
      icon: 'text-sky-600',
      accent: 'bg-sky-500',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-500/5',
      border: 'border-rose-200/30',
      icon: 'text-rose-600',
      accent: 'bg-rose-500',
    },
    slate: {
      bg: 'from-slate-500/10 to-slate-500/5',
      border: 'border-slate-200/30',
      icon: 'text-slate-600',
      accent: 'bg-slate-500',
    },
  }

  const colors = colorMap[accentColor]
  const isClickable = href || onClick
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 opacity-0 animate-fade-in-up",
        colors.bg,
        colors.border,
        isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Subtle shine overlay */}
      <div className="absolute inset-0 gradient-card-shine pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">
              <AnimatedNumber value={value} duration={800 + delay} />
            </span>
            {trend !== undefined && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
          {trendLabel && (
            <p className="text-xs text-slate-400">{trendLabel}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn("rounded-xl p-2.5 bg-white/60 shadow-sm", colors.border)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          {sparklineData && (
            <Sparkline data={sparklineData} color={accentColor} />
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", colors.accent, "opacity-40")} />
    </div>
  )
}

// Refined donut chart with beautiful animations
function RefinedDonutChart({
  segments,
  total,
  onSegmentClick,
}: {
  segments: StatusSegment[]
  total: number
  onSegmentClick: (status: string) => void
}) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const radius = 90
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius
  const center = 110

  const currentOffset = circumference * 0.25 // Start from top

  const segmentPaths = useMemo(() => {
    let offset = circumference * 0.25
    return segments.map(segment => {
      const percent = total > 0 ? (segment.value / total) * 100 : 0
      const strokeDasharray = (percent / 100) * circumference
      const path = {
        ...segment,
        percent,
        strokeDasharray,
        strokeDashoffset: offset,
      }
      offset -= strokeDasharray
      return path
    })
  }, [segments, total, circumference])

  return (
    <div className="flex flex-col lg:flex-row items-center gap-10 justify-center">
      {/* Chart */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-br from-emerald-400 via-sky-400 to-amber-400 rounded-full" />

        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="relative drop-shadow-lg"
        >
          <defs>
            {segmentPaths.map(segment => (
              <linearGradient
                key={`gradient-${segment.status}`}
                id={`donut-gradient-${segment.status}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={segment.gradientFrom} />
                <stop offset="100%" stopColor={segment.gradientTo} />
              </linearGradient>
            ))}
          </defs>

          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
          />

          {/* Segments */}
          {segmentPaths.map((segment, index) => (
            <circle
              key={segment.status}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#donut-gradient-${segment.status})`}
              strokeWidth={hoveredSegment === segment.status ? strokeWidth + 6 : strokeWidth}
              strokeLinecap="round"
              strokeDasharray={isAnimated ? `${segment.strokeDasharray} ${circumference}` : `0 ${circumference}`}
              strokeDashoffset={segment.strokeDashoffset}
              className="transition-all duration-500 ease-out cursor-pointer origin-center"
              style={{
                filter: hoveredSegment === segment.status ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none',
                transitionDelay: isAnimated ? `${index * 150}ms` : '0ms',
              }}
              onMouseEnter={() => setHoveredSegment(segment.status)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => onSegmentClick(segment.status)}
            />
          ))}

          {/* Inner white circle for cleaner look */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2 - 8}
            fill="white"
            className="drop-shadow-sm"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-semibold text-slate-900 tracking-tight">
            <AnimatedNumber value={total} duration={1200} />
          </span>
          <span className="text-sm font-medium text-slate-500 mt-1">Total Sheets</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-2.5 w-full max-w-xs">
        {segmentPaths.map((segment, index) => {
          const Icon = segment.icon
          return (
            <button
              key={segment.status}
              onClick={() => onSegmentClick(segment.status)}
              onMouseEnter={() => setHoveredSegment(segment.status)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={cn(
                "group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left opacity-0 animate-fade-in-up",
                hoveredSegment === segment.status
                  ? "bg-white border-slate-200 shadow-md scale-[1.02]"
                  : "bg-white/60 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm"
              )}
              style={{ animationDelay: `${400 + index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${segment.gradientFrom}, ${segment.gradientTo})` }}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900">{segment.label}</div>
                <div className="text-sm text-slate-500">
                  {segment.value} sheet{segment.value !== 1 ? 's' : ''}
                  <span className="text-slate-400 ml-1">
                    ({Math.round(segment.percent)}%)
                  </span>
                </div>
              </div>
              <ArrowUpRight className={cn(
                "h-4 w-4 text-slate-400 transition-all",
                hoveredSegment === segment.status && "text-slate-600 translate-x-0.5 -translate-y-0.5"
              )} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Activity timeline component
function ActivityTimeline({
  sheets,
  onSheetClick,
}: {
  sheets: DashboardStats['recentSheets']
  onSheetClick: (sheet: DashboardStats['recentSheets'][0]) => void
}) {
  if (sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium">No recent activity</p>
        <p className="text-sm text-slate-400 mt-1">Your sheet activity will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {sheets.map((sheet, index) => {
        const statusConfig = getStatusConfig(sheet.status, sheet.role)
        return (
          <button
            key={sheet.id}
            onClick={() => onSheetClick(sheet)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all opacity-0 animate-fade-in-up",
              "hover:bg-slate-50 group"
            )}
            style={{ animationDelay: `${500 + index * 75}ms`, animationFillMode: 'forwards' }}
          >
            {/* Icon */}
            <div className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 transition-all",
              "bg-gradient-to-br",
              sheet.role === 'supplier'
                ? "from-violet-100 to-violet-50 text-violet-600"
                : "from-sky-100 to-sky-50 text-sky-600",
              "group-hover:scale-105 group-hover:shadow-sm"
            )}>
              {sheet.role === 'supplier' ? (
                <Package className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                {sheet.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="truncate">{sheet.companyName}</span>
                <span className="text-slate-300">•</span>
                <span className="flex-shrink-0 text-slate-400">
                  {sheet.role === 'supplier' ? 'You supply' : 'You requested'}
                </span>
              </div>
            </div>

            {/* Status & Time */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <Badge className={cn("border font-medium text-xs px-2.5 py-0.5", statusConfig.className)}>
                <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.dotColor)} />
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-slate-400">
                {formatTimeAgo(sheet.modifiedAt)}
              </span>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0 transition-all group-hover:text-slate-500 group-hover:translate-x-0.5" />
          </button>
        )
      })}
    </div>
  )
}


export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null)
  const [associationMetrics, setAssociationMetrics] = useState<AssociationMetrics | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('customer')
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  async function fetchAssociationMetrics(supabase: ReturnType<typeof createClient>) {
    const response = await fetch('/api/admin/association-metrics')

    if (!response.ok) {
      console.error('Failed to fetch association metrics:', await response.text())
      return null
    }

    const { sheets: rawSheets, companies, users } = await response.json()

    const stacksDataCompany = companies.find((c: { name: string }) => c.name === 'Stacks Data')
    const sheets = rawSheets.filter((s: { company_id: string; requesting_company_id: string; name: string }) => {
      if (stacksDataCompany && (s.company_id === stacksDataCompany.id || s.requesting_company_id === stacksDataCompany.id)) {
        return false
      }
      if (s.name && s.name.toLowerCase().includes('test')) {
        return false
      }
      return true
    })

    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const activeSheets90d = sheets.filter((s: { modified_at: string }) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= ninetyDaysAgo
    })

    const activeSheets30d = sheets.filter((s: { modified_at: string }) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= thirtyDaysAgo
    })

    const activeSheetsCount = activeSheets90d.length
    const recentSheetsCount = activeSheets30d.length
    const fulfilledSheetsCount = sheets.length - activeSheets90d.length

    const overallCompletionRate = sheets.length > 0
      ? Math.round((activeSheets90d.length / sheets.length) * 100)
      : 0

    const dppReadiness = sheets.length > 0
      ? Math.max(0, Math.round((activeSheets30d.length / sheets.length) * 100 * 0.65))
      : 0

    const sheetsCreated7d = sheets.filter((s: { created_at: string }) => {
      const created = s.created_at ? new Date(s.created_at) : null
      return created && created >= sevenDaysAgo
    }).length

    const sheetsModified7d = sheets.filter((s: { modified_at: string }) => {
      const modified = s.modified_at ? new Date(s.modified_at) : null
      return modified && modified >= sevenDaysAgo
    }).length

    const activeUsers30d = users.filter((u: { last_sign_in_at: string }) => {
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
      return lastSignIn && lastSignIn >= thirtyDaysAgo
    }).length

    const companyMetrics = companies.map((company: { id: string; name: string }) => {
      const companySheets = sheets.filter((s: { company_id: string }) => s.company_id === company.id)

      const sheetsByName = new Map()
      companySheets.forEach((sheet: { name: string; modified_at: string; created_at: string }) => {
        const existing = sheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          sheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueCompanySheets = Array.from(sheetsByName.values())

      const companyActive = uniqueCompanySheets.filter((s: { modified_at: string }) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= ninetyDaysAgo
      }).length

      const completionRate = uniqueCompanySheets.length > 0
        ? Math.round((companyActive / uniqueCompanySheets.length) * 100)
        : 0

      const hasRecentActivity = uniqueCompanySheets.some((s: { modified_at: string }) => {
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

    const topCompanies = companyMetrics
      .filter((c: { totalSheets: number }) => c.totalSheets > 0)
      .sort((a: { totalSheets: number; completionRate: number }, b: { totalSheets: number; completionRate: number }) => {
        if (b.totalSheets !== a.totalSheets) {
          return b.totalSheets - a.totalSheets
        }
        return b.completionRate - a.completionRate
      })

    const activeCompanies = companies.filter((c: { id: string }) => {
      const companySheets = sheets.filter((s: { company_id: string }) => s.company_id === c.id)
      return companySheets.some((s: { modified_at: string }) => {
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: superAdminCheck } = await supabase.rpc('is_super_admin')

      const isSuper = superAdminCheck === true
      setIsSuperAdmin(isSuper)

      if (isSuper) {
        await fetchAssociationMetrics(supabase)
        setLoading(false)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const companyId = userProfile?.company_id

      if (!companyId) {
        setLoading(false)
        return
      }

      const { count: totalCount } = await supabase
        .from('sheets')
        .select('*', { count: 'exact', head: true })

      const batchSize = 1000
      const totalBatches = Math.ceil((totalCount || 0) / batchSize)
      let allSheets: { id: string; name: string; status: string | null; company_id: string; requesting_company_id: string; modified_at: string; created_at: string }[] = []

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

      const rawSupplierSheets = allSheets.filter(s => s.company_id === companyId)

      const supplierSheetsByName = new Map<string, typeof allSheets[0]>()
      rawSupplierSheets.forEach(sheet => {
        const existing = supplierSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          supplierSheetsByName.set(sheet.name, sheet)
        }
      })
      const supplierSheets = Array.from(supplierSheetsByName.values())

      const rawCustomerSheets = allSheets.filter(s => s.requesting_company_id === companyId)

      const customerSheetsByName = new Map<string, typeof allSheets[0]>()
      rawCustomerSheets.forEach(sheet => {
        const existing = customerSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          customerSheetsByName.set(sheet.name, sheet)
        }
      })
      const customerSheets = Array.from(customerSheetsByName.values())

      const supplierCompletedTasks = supplierSheets.filter(s =>
        !s.status || s.status === 'completed' || s.status === 'approved' || s.status === 'draft' || s.status === 'imported'
      ).length

      const supplierOpenTasks = supplierSheets.filter(s =>
        s.status === 'in_progress' || s.status === 'pending'
      ).length

      const supplierRejectedTasks = supplierSheets.filter(s =>
        s.status === 'rejected' || s.status === 'flagged'
      ).length

      const customerCompletedProducts = customerSheets.filter(s =>
        !s.status || s.status === 'completed' || s.status === 'approved' || s.status === 'draft' || s.status === 'imported'
      ).length

      const customerOpenProducts = customerSheets.filter(s =>
        s.status === 'in_progress' || s.status === 'pending'
      ).length

      const customerRejectedProducts = customerSheets.filter(s =>
        s.status === 'rejected' || s.status === 'flagged'
      ).length

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')

      const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

      const allRelevantSheets = [
        ...supplierSheets.map(s => ({ ...s, role: 'supplier' as const })),
        ...customerSheets.map(s => ({ ...s, role: 'customer' as const }))
      ]
      const uniqueSheets = Array.from(new Map(allRelevantSheets.map(s => [s.id, s])).values())
      const recentSheets = uniqueSheets
        .sort((a, b) => {
          const dateA = a.modified_at ? new Date(a.modified_at).getTime() : 0
          const dateB = b.modified_at ? new Date(b.modified_at).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 8)
        .map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          companyName: companyMap.get(s.company_id === companyId ? s.requesting_company_id : s.company_id) || 'Unknown',
          modifiedAt: s.modified_at,
          role: s.role
        }))

      // Fetch request data
      const { data: outgoingRequests } = await supabase
        .from('requests')
        .select('id, processed')
        .eq('requestor_id', companyId)

      const { data: incomingRequests } = await supabase
        .from('requests')
        .select('id, processed')
        .eq('requesting_from_id', companyId)

      const outgoingPending = (outgoingRequests || []).filter(r => !r.processed).length
      const incomingPending = (incomingRequests || []).filter(r => !r.processed).length

      setStats({
        supplierOpenTasks,
        supplierCompletedTasks,
        supplierRejectedTasks,
        supplierTotalTasks: supplierSheets.length,
        customerOpenProducts,
        customerCompletedProducts,
        customerRejectedProducts,
        customerTotalProducts: customerSheets.length,
        recentSheets,
        outgoingRequestsPending: outgoingPending,
        outgoingRequestsTotal: outgoingRequests?.length || 0,
        incomingRequestsPending: incomingPending,
        incomingRequestsTotal: incomingRequests?.length || 0,
      })

      // Fetch compliance data (chemicals from user's sheets)
      const allSheetIds = [...supplierSheets, ...customerSheets].map(s => s.id)
      if (allSheetIds.length > 0) {
        const { data: chemicals } = await supabase
          .from('sheet_chemicals')
          .select(`
            chemical_id,
            chemical_inventory (
              id,
              is_pfas,
              is_reach_svhc,
              is_prop65,
              risk_level
            )
          `)
          .in('sheet_id', allSheetIds.slice(0, 100)) // Limit to avoid too large queries

        if (chemicals) {
          const uniqueChemicals = new Map()
          chemicals.forEach((c: any) => {
            if (c.chemical_inventory) {
              uniqueChemicals.set(c.chemical_id, c.chemical_inventory)
            }
          })
          const chemicalList = Array.from(uniqueChemicals.values())

          setComplianceStats({
            totalChemicals: chemicalList.length,
            pfasChemicals: chemicalList.filter((c: any) => c.is_pfas).length,
            reachSvhcChemicals: chemicalList.filter((c: any) => c.is_reach_svhc).length,
            prop65Chemicals: chemicalList.filter((c: any) => c.is_prop65).length,
            highRiskChemicals: chemicalList.filter((c: any) => c.risk_level === 'high').length,
          })
        }
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const handleSegmentClick = (status: string) => {
    router.push(`/sheets?status=${status}`)
  }

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-emerald-600" />
            </div>
            <span className="text-sm font-medium">Loading your dashboard...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

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
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Unable to load dashboard data</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const customerSegments: StatusSegment[] = [
    {
      label: 'Completed',
      value: stats.customerCompletedProducts,
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      status: 'completed',
      icon: CheckCircle2,
    },
    {
      label: 'Open',
      value: stats.customerOpenProducts,
      color: '#f59e0b',
      gradientFrom: '#f59e0b',
      gradientTo: '#d97706',
      status: 'pending',
      icon: Clock,
    },
    {
      label: 'Rejected',
      value: stats.customerRejectedProducts,
      color: '#ef4444',
      gradientFrom: '#f43f5e',
      gradientTo: '#e11d48',
      status: 'rejected',
      icon: XCircle,
    },
  ]

  const supplierSegments: StatusSegment[] = [
    {
      label: 'Completed',
      value: stats.supplierCompletedTasks,
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#059669',
      status: 'completed',
      icon: CheckCircle2,
    },
    {
      label: 'Open',
      value: stats.supplierOpenTasks,
      color: '#f59e0b',
      gradientFrom: '#f59e0b',
      gradientTo: '#d97706',
      status: 'pending',
      icon: Clock,
    },
    {
      label: 'Rejected',
      value: stats.supplierRejectedTasks,
      color: '#ef4444',
      gradientFrom: '#f43f5e',
      gradientTo: '#e11d48',
      status: 'rejected',
      icon: XCircle,
    },
  ]

  const currentSegments = viewMode === 'customer' ? customerSegments : supplierSegments
  const currentTotal = viewMode === 'customer' ? stats.customerTotalProducts : stats.supplierTotalTasks

  // Mock sparkline data (you can replace with real historical data)
  const mockSparklineCompleted = [12, 15, 14, 18, 22, 25, 28]
  const mockSparklineOpen = [8, 6, 9, 7, 5, 4, 3]
  const mockSparklineTotal = [20, 21, 23, 25, 27, 29, 31]

  const currentStats = viewMode === 'customer'
    ? {
        completed: stats.customerCompletedProducts,
        open: stats.customerOpenProducts,
        rejected: stats.customerRejectedProducts,
        total: stats.customerTotalProducts,
      }
    : {
        completed: stats.supplierCompletedTasks,
        open: stats.supplierOpenTasks,
        rejected: stats.supplierRejectedTasks,
        total: stats.supplierTotalTasks,
      }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
          <h1 className="font-display text-3xl font-semibold text-slate-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s an overview of your supply chain compliance data
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-3 opacity-0 animate-fade-in-up animation-delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex rounded-xl bg-slate-100/80 p-1">
            <button
              onClick={() => setViewMode('customer')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                viewMode === 'customer'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Building2 className="h-4 w-4" />
              As Customer
            </button>
            <button
              onClick={() => setViewMode('supplier')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                viewMode === 'supplier'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Package className="h-4 w-4" />
              As Supplier
            </button>
          </div>
          <span className="text-sm text-slate-400">
            {viewMode === 'customer'
              ? 'Products you have requested from suppliers'
              : 'Questionnaires you need to complete for customers'
            }
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Sheets"
            value={currentStats.total}
            subtitle="All time"
            icon={Package}
            accentColor="slate"
            delay={150}
            sparklineData={mockSparklineTotal}
            href="/sheets"
          />
          <StatCard
            title="Completed"
            value={currentStats.completed}
            subtitle={`${currentStats.total > 0 ? Math.round((currentStats.completed / currentStats.total) * 100) : 0}% completion rate`}
            trend={12}
            icon={CheckCircle2}
            accentColor="emerald"
            delay={200}
            sparklineData={mockSparklineCompleted}
            href="/sheets?status=completed"
          />
          <StatCard
            title="Open"
            value={currentStats.open}
            subtitle="Awaiting action"
            trend={-8}
            icon={Clock}
            accentColor="amber"
            delay={250}
            sparklineData={mockSparklineOpen}
            href="/sheets?status=pending"
          />
          <StatCard
            title="Rejected"
            value={currentStats.rejected}
            subtitle="Needs attention"
            icon={XCircle}
            accentColor="rose"
            delay={300}
            href="/sheets?status=flagged"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Chart Section */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-slate-200/60 shadow-sm opacity-0 animate-scale-in animation-delay-200" style={{ animationFillMode: 'forwards' }}>
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Sheet Status</CardTitle>
                    <p className="text-sm text-slate-500 mt-0.5">Distribution by completion status</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 pb-8 px-8">
                {currentTotal === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
                      {viewMode === 'customer' ? (
                        <Building2 className="h-10 w-10 text-slate-400" />
                      ) : (
                        <Package className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">No sheets yet</h3>
                    <p className="text-slate-500 max-w-sm">
                      {viewMode === 'customer'
                        ? "You haven't requested any product data sheets from suppliers yet."
                        : "You don't have any questionnaires to complete."
                      }
                    </p>
                    {viewMode === 'customer' && (
                      <button
                        onClick={() => setRequestDialogOpen(true)}
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium shadow-sm hover:shadow-md hover:from-emerald-500 hover:to-emerald-400 transition-all"
                      >
                        <Sparkles className="h-4 w-4" />
                        Request Product Data
                      </button>
                    )}
                  </div>
                ) : (
                  <RefinedDonutChart
                    segments={currentSegments}
                    total={currentTotal}
                    onSegmentClick={handleSegmentClick}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="h-full border-slate-200/60 shadow-sm opacity-0 animate-scale-in animation-delay-300" style={{ animationFillMode: 'forwards' }}>
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
                    <p className="text-sm text-slate-500 mt-0.5">Latest updates on your sheets</p>
                  </div>
                  <a
                    href="/sheets"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <ActivityTimeline
                  sheets={stats.recentSheets}
                  onSheetClick={(sheet) => {
                    // Navigate to review page for customers viewing submitted sheets
                    if (sheet.role === 'customer' && sheet.status === 'submitted') {
                      router.push(`/sheets/${sheet.id}/review`)
                    } else if (sheet.role === 'supplier' && (sheet.status === 'flagged' || sheet.status === 'in_progress' || sheet.status === 'pending')) {
                      // Suppliers should edit flagged/in-progress/pending sheets
                      router.push(`/sheets/${sheet.id}/edit`)
                    } else {
                      router.push(`/sheets/${sheet.id}`)
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Request Tracking & Compliance Intelligence */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Request Tracking */}
          <Card className="border-slate-200/60 shadow-sm opacity-0 animate-scale-in animation-delay-400" style={{ animationFillMode: 'forwards' }}>
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">Request Tracking</CardTitle>
                  <p className="text-sm text-slate-500 mt-0.5">Incoming and outgoing product data requests</p>
                </div>
                <Link
                  href="/requests/outgoing"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 grid-cols-2">
                <Link href="/requests/outgoing" className="group">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200/50 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center">
                        <Send className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-slate-900">
                          {stats?.outgoingRequestsPending || 0}
                        </p>
                        <p className="text-xs text-slate-500">Outgoing Pending</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {stats?.outgoingRequestsTotal || 0} total requests sent
                    </p>
                  </div>
                </Link>
                <Link href="/requests/incoming" className="group">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/50 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                        <Inbox className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-slate-900">
                          {stats?.incomingRequestsPending || 0}
                        </p>
                        <p className="text-xs text-slate-500">Incoming Pending</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {stats?.incomingRequestsTotal || 0} total requests received
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Intelligence */}
          <Card className="border-slate-200/60 shadow-sm opacity-0 animate-scale-in animation-delay-500" style={{ animationFillMode: 'forwards' }}>
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">Compliance Intelligence</CardTitle>
                  <p className="text-sm text-slate-500 mt-0.5">Chemical regulatory monitoring</p>
                </div>
                <Link
                  href="/compliance/supplier"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  View details
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {complianceStats && complianceStats.totalChemicals > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="h-5 w-5 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">Total Chemicals Tracked</span>
                    </div>
                    <span className="text-lg font-semibold text-slate-900">{complianceStats.totalChemicals}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/compliance/supplier?filter=pfas" className="p-3 rounded-lg bg-amber-50 border border-amber-200/50 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">PFAS</span>
                      </div>
                      <p className="text-xl font-semibold text-amber-900 mt-1">{complianceStats.pfasChemicals}</p>
                    </Link>
                    <Link href="/compliance/supplier?filter=reach" className="p-3 rounded-lg bg-rose-50 border border-rose-200/50 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-rose-600" />
                        <span className="text-xs font-medium text-rose-700">REACH SVHC</span>
                      </div>
                      <p className="text-xl font-semibold text-rose-900 mt-1">{complianceStats.reachSvhcChemicals}</p>
                    </Link>
                    <Link href="/compliance/supplier?filter=prop65" className="p-3 rounded-lg bg-orange-50 border border-orange-200/50 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">Prop 65</span>
                      </div>
                      <p className="text-xl font-semibold text-orange-900 mt-1">{complianceStats.prop65Chemicals}</p>
                    </Link>
                    <Link href="/compliance/supplier?filter=high-risk" className="p-3 rounded-lg bg-red-50 border border-red-200/50 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-700">High Risk</span>
                      </div>
                      <p className="text-xl font-semibold text-red-900 mt-1">{complianceStats.highRiskChemicals}</p>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <FlaskConical className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No chemical data yet</p>
                  <p className="text-xs text-slate-400 mt-1">Chemical compliance data will appear here</p>
                  <Link
                    href="/compliance/supplier"
                    className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    View compliance dashboard
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RequestSheetDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
      />
    </AppLayout>
  )
}
