'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
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

      // Check super admin status
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin')
      const isSuper = superAdminCheck === true
      setIsSuperAdmin(isSuper)

      if (!isSuper) {
        router.push('/dashboard')
        return
      }

      // Fetch all sheets (increase limit for super admin - default is 1000)
      const { data: allSheets } = await supabase
        .from('sheets')
        .select('id, company_id, modified_at')
        .limit(10000)

      // Fetch all companies (increase limit for super admin - default is 1000)
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .limit(10000)

      // Fetch all users (increase limit for super admin - default is 1000)
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

      // Sort by total sheets
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

  if (loading) {
    return (
      <AppLayout title="Companies">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <AppLayout title="Companies">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">All Companies</h1>
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                <Shield className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {companies.length} companies • {companies.reduce((sum, c) => sum + c.totalSheets, 0)} total sheets
            </p>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/admin/companies/${company.id}`)}
            >
              <CardContent className="flex items-center gap-6 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{company.totalSheets} sheets</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{company.userCount} users</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Last activity: {formatDate(company.lastActivity)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Activity (90d)</div>
                    <div className="text-2xl font-bold">
                      {company.activityRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.activeSheets} / {company.totalSheets}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No companies found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
