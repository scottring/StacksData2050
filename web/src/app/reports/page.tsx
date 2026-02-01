'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Shield,
  Download,
  Clock,
  Loader2,
  Database,
  ArrowUpRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateReportDialog } from '@/components/reports/create-report-dialog'
import { cn } from '@/lib/utils'

interface Stats {
  totalSheets: number
  completedSheets: number
  activeSuppliers: number
  totalAnswers: number
  completionRate: number
  loading: boolean
  isSuperAdmin: boolean
}

const reportTypes = [
  {
    title: 'Supplier Compliance Summary',
    description: 'Overview of all supplier compliance statuses, completion rates, and outstanding items',
    icon: Shield,
    href: '/reports/supplier-compliance',
    color: 'emerald',
  },
  {
    title: 'Executive Dashboard',
    description: 'High-level metrics for leadership: risk exposure, regulatory compliance, supply chain health',
    icon: TrendingUp,
    href: '/reports/executive',
    color: 'sky',
  },
  {
    title: 'Chemical Inventory Report',
    description: 'Complete inventory of chemicals across all suppliers with regulatory flags (PFAS, REACH, Prop 65)',
    icon: FileText,
    href: '/reports/chemical-inventory',
    color: 'violet',
  },
  {
    title: 'Overdue Submissions',
    description: 'List of suppliers with overdue questionnaire submissions and SLA breaches',
    icon: Clock,
    href: '/reports/overdue',
    color: 'amber',
  },
  {
    title: 'Supplier Performance Trends',
    description: 'Historical analysis of supplier response times, revision rates, and data quality scores',
    icon: BarChart3,
    href: '/reports/trends',
    color: 'rose',
  },
]

const colorMap: Record<string, { bg: string; iconBg: string; icon: string; border: string }> = {
  emerald: {
    bg: 'from-emerald-500/5 to-emerald-500/10',
    iconBg: 'bg-emerald-100',
    icon: 'text-emerald-600',
    border: 'border-emerald-200/40 hover:border-emerald-300/60',
  },
  sky: {
    bg: 'from-sky-500/5 to-sky-500/10',
    iconBg: 'bg-sky-100',
    icon: 'text-sky-600',
    border: 'border-sky-200/40 hover:border-sky-300/60',
  },
  violet: {
    bg: 'from-violet-500/5 to-violet-500/10',
    iconBg: 'bg-violet-100',
    icon: 'text-violet-600',
    border: 'border-violet-200/40 hover:border-violet-300/60',
  },
  amber: {
    bg: 'from-amber-500/5 to-amber-500/10',
    iconBg: 'bg-amber-100',
    icon: 'text-amber-600',
    border: 'border-amber-200/40 hover:border-amber-300/60',
  },
  rose: {
    bg: 'from-rose-500/5 to-rose-500/10',
    iconBg: 'bg-rose-100',
    icon: 'text-rose-600',
    border: 'border-rose-200/40 hover:border-rose-300/60',
  },
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalSheets: 0,
    completedSheets: 0,
    activeSuppliers: 0,
    totalAnswers: 0,
    completionRate: 0,
    loading: true,
    isSuperAdmin: false,
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const companyId = userData?.company_id

      if (!isSuperAdmin && companyId) {
        const { data: sheets } = await supabase
          .from('sheets')
          .select('id, status, company_id, requesting_company_id')

        const filteredSheets = (sheets || []).filter(
          s => s.company_id === companyId || s.requesting_company_id === companyId
        )

        const relatedCompanyIds = new Set<string>()
        filteredSheets.forEach(s => {
          if (s.company_id) relatedCompanyIds.add(s.company_id)
          if (s.requesting_company_id) relatedCompanyIds.add(s.requesting_company_id)
        })

        const sheetIds = filteredSheets.map(s => s.id)
        const { count: answerCount } = await supabase
          .from('answers')
          .select('*', { count: 'exact', head: true })
          .in('sheet_id', sheetIds.length > 0 ? sheetIds : ['none'])

        const totalSheets = filteredSheets.length
        const completedSheets = filteredSheets.filter(
          s => s.status === 'approved' || s.status === 'completed' || s.status === 'draft' || s.status === 'imported' || !s.status
        ).length
        const completionRate = totalSheets > 0
          ? Math.round((completedSheets / totalSheets) * 100)
          : 0

        setStats({
          totalSheets,
          completedSheets,
          activeSuppliers: relatedCompanyIds.size,
          totalAnswers: answerCount || 0,
          completionRate,
          loading: false,
          isSuperAdmin: false,
        })
      } else {
        const [sheetsResult, companiesResult, answersResult] = await Promise.all([
          supabase.from('sheets').select('id, status'),
          supabase.from('companies').select('id'),
          supabase.from('answers').select('*', { count: 'exact', head: true }),
        ])

        const sheets = sheetsResult.data || []
        const companies = companiesResult.data || []
        const answerCount = answersResult.count || 0

        const totalSheets = sheets.length
        const completedSheets = sheets.filter(
          s => s.status === 'approved' || s.status === 'completed' || s.status === 'draft' || s.status === 'imported' || !s.status
        ).length
        const completionRate = totalSheets > 0
          ? Math.round((completedSheets / totalSheets) * 100)
          : 0

        setStats({
          totalSheets,
          completedSheets,
          activeSuppliers: companies.length,
          totalAnswers: answerCount,
          completionRate,
          loading: false,
          isSuperAdmin: true,
        })
      }
    }

    fetchStats()
  }, [])

  return (
    <AppLayout title="Reports">
      <div className="space-y-8 max-w-7xl mx-auto">
        <PageHeader
          title="Reports"
          description="Generate and download compliance reports for your organization"
        >
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Custom Report
          </Button>
        </PageHeader>

        <CreateReportDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Completion Rate"
            value={stats.loading ? 0 : stats.completionRate}
            subtitle={stats.loading ? 'Loading...' : `${stats.completionRate}% of sheets complete`}
            icon={Shield}
            accentColor="emerald"
            delay={100}
          />
          <StatCard
            title="Active Suppliers"
            value={stats.loading ? 0 : stats.activeSuppliers}
            icon={Users}
            accentColor="blue"
            delay={150}
          />
          <StatCard
            title="Total Sheets"
            value={stats.loading ? 0 : stats.totalSheets}
            icon={FileText}
            accentColor="amber"
            delay={200}
          />
          <StatCard
            title="Total Answers"
            value={stats.loading ? 0 : stats.totalAnswers}
            icon={Database}
            accentColor="violet"
            delay={250}
          />
        </div>

        {/* Report Types */}
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 mb-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
            Available Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report, index) => {
              const Icon = report.icon
              const colors = colorMap[report.color]
              return (
                <Link key={report.title} href={report.href}>
                  <Card
                    className={cn(
                      "group relative overflow-hidden h-full transition-all duration-200 cursor-pointer opacity-0 animate-fade-in-up",
                      "bg-gradient-to-br border",
                      colors.bg,
                      colors.border,
                      "hover:shadow-md hover:-translate-y-0.5"
                    )}
                    style={{ animationDelay: `${300 + index * 75}ms`, animationFillMode: 'forwards' }}
                  >
                    <CardHeader className="pb-3">
                      <div className={cn("p-2.5 rounded-xl w-fit shadow-sm", colors.iconBg)}>
                        <Icon className={cn("h-5 w-5", colors.icon)} />
                      </div>
                      <CardTitle className="text-base font-semibold text-slate-900 mt-3">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-500 leading-relaxed">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button size="sm" variant="outline" className="w-full rounded-xl border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-all">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        View Report
                        <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
