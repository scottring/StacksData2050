'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  Package,
  Users,
  Activity,
  Search,
  Loader2,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Company {
  id: string
  name: string
  totalSheets: number
  activeSheets: number
  userCount: number
  lastActivity: Date | null
  activityRate: number
}

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: superAdminCheck } = await supabase.rpc('is_super_admin')
      const isSuper = superAdminCheck === true
      setIsSuperAdmin(isSuper)

      if (!isSuper) {
        router.push('/dashboard')
        return
      }

      const { data: allSheets } = await supabase
        .from('sheets')
        .select('id, company_id, modified_at')
        .limit(10000)

      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .limit(10000)

      const { data: allUsers } = await supabase
        .from('users')
        .select('id, company_id')
        .limit(10000)

      const sheets = allSheets || []
      const companiesData = allCompanies || []
      const users = allUsers || []

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

      const companiesWithMetrics: Company[] = companiesData.map(company => {
        const companySheets = sheets.filter(s => s.company_id === company.id)
        const activeSheets = companySheets.filter(s => {
          const modified = s.modified_at ? new Date(s.modified_at) : null
          return modified && modified >= ninetyDaysAgo
        })

        const userCount = users.filter(u => u.company_id === company.id).length

        const lastActivityDate = companySheets.reduce<Date | null>((latest, sheet) => {
          const modified = sheet.modified_at ? new Date(sheet.modified_at) : null
          if (!modified) return latest
          if (!latest) return modified
          return modified > latest ? modified : latest
        }, null)

        const activityRate = companySheets.length > 0
          ? Math.round((activeSheets.length / companySheets.length) * 100)
          : 0

        return {
          id: company.id,
          name: company.name,
          totalSheets: companySheets.length,
          activeSheets: activeSheets.length,
          userCount,
          lastActivity: lastActivityDate,
          activityRate
        }
      })

      const sorted = companiesWithMetrics.sort((a, b) => b.totalSheets - a.totalSheets)

      setCompanies(sorted)
      setFilteredCompanies(sorted)
      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    if (searchTerm) {
      const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredCompanies(filtered)
    } else {
      setFilteredCompanies(companies)
    }
  }, [searchTerm, companies])

  function formatDate(date: Date | null): string {
    if (!date) return 'Never'
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  const getActivityColor = (rate: number) => {
    if (rate >= 70) return 'text-emerald-600'
    if (rate >= 40) return 'text-amber-600'
    return 'text-slate-400'
  }

  if (loading) {
    return (
      <AppLayout title="Companies">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-rose-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-violet-600" />
            </div>
            <span className="text-sm font-medium">Loading companies...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  const totalSheets = companies.reduce((sum, c) => sum + c.totalSheets, 0)
  const totalUsers = companies.reduce((sum, c) => sum + c.userCount, 0)
  const activeCompanies = companies.filter(c => c.activityRate > 0).length

  return (
    <AppLayout title="Companies">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="All Companies"
          description={`${companies.length} companies · ${totalSheets} total sheets`}
        >
          <Badge className="bg-violet-50 text-violet-700 border-violet-200 rounded-full px-3 py-1">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Super Admin
          </Badge>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Companies" value={companies.length} icon={Building2} accentColor="violet" delay={100} />
          <StatCard title="Total Sheets" value={totalSheets} icon={Package} accentColor="sky" delay={150} />
          <StatCard title="Total Users" value={totalUsers} icon={Users} accentColor="emerald" delay={200} />
          <StatCard title="Active (90d)" value={activeCompanies} icon={Activity} accentColor="amber" delay={250} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200"
            />
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600">
            {filteredCompanies.length} companies
          </Badge>
        </div>

        {/* Companies List */}
        <div className="grid gap-3 opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          {filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer hover:bg-slate-50/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-slate-200/60 group"
              onClick={() => router.push(`/admin/companies/${company.id}`)}
            >
              <CardContent className="flex items-center gap-6 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 group-hover:scale-105 transition-transform">
                  <Building2 className="h-6 w-6 text-slate-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{company.name}</h3>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      <span>{company.totalSheets} sheets</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{company.userCount} users</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span>Last activity: {formatDate(company.lastActivity)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Activity (90d)</div>
                    <div className={cn("text-2xl font-bold", getActivityColor(company.activityRate))}>
                      {company.activityRate}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {company.activeSheets} / {company.totalSheets}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <span className="font-medium">No companies found matching &quot;{searchTerm}&quot;</span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
