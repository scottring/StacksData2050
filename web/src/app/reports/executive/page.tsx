'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalSuppliers: number
  totalSheets: number
  totalAnswers: number
  completionRate: number
  submittedSheets: number
  approvedSheets: number
  draftSheets: number
  flaggedSheets: number
  loading: boolean
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSuppliers: 0,
    totalSheets: 0,
    totalAnswers: 0,
    completionRate: 0,
    submittedSheets: 0,
    approvedSheets: 0,
    draftSheets: 0,
    flaggedSheets: 0,
    loading: true,
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get current user and check access level
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

      // Get all sheets
      const { data: allSheets } = await supabase
        .from('sheets')
        .select('id, company_id, requesting_company_id, status')

      // Filter sheets based on access level
      let sheets = allSheets || []
      if (!isSuperAdmin && companyId) {
        sheets = sheets.filter(
          s => s.company_id === companyId || s.requesting_company_id === companyId
        )
      }

      // Get related company count
      const relatedCompanyIds = new Set<string>()
      sheets.forEach(s => {
        if (s.company_id) relatedCompanyIds.add(s.company_id)
        if (s.requesting_company_id) relatedCompanyIds.add(s.requesting_company_id)
      })

      // Get answer count for relevant sheets
      const sheetIds = sheets.map(s => s.id)
      const { count: answerCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .in('sheet_id', sheetIds.length > 0 ? sheetIds : ['none'])

      // Legacy/draft/imported count as approved
      const approved = sheets.filter(s =>
        s.status === 'approved' || s.status === 'completed' || s.status === 'draft' || s.status === 'imported' || !s.status
      ).length
      const submitted = sheets.filter(s => s.status === 'submitted').length
      const draft = sheets.filter(s => s.status === 'in_progress' || s.status === 'pending').length
      const flagged = sheets.filter(s => s.status === 'flagged' || s.status === 'rejected').length

      setStats({
        totalSuppliers: isSuperAdmin
          ? (await supabase.from('companies').select('id', { count: 'exact', head: true })).count || 0
          : relatedCompanyIds.size,
        totalSheets: sheets.length,
        totalAnswers: answerCount || 0,
        completionRate: sheets.length > 0 ? Math.round((approved / sheets.length) * 100) : 0,
        submittedSheets: submitted,
        approvedSheets: approved,
        draftSheets: draft,
        flaggedSheets: flagged,
        loading: false,
      })
    }

    fetchData()
  }, [])

  const exportToCSV = () => {
    const csvContent = `Executive Dashboard Report - ${new Date().toISOString().split('T')[0]}

SUMMARY METRICS
Metric,Value
Total Suppliers,${stats.totalSuppliers}
Total Sheets,${stats.totalSheets}
Completion Rate,${stats.completionRate}%
Total Data Points,${stats.totalAnswers}

STATUS BREAKDOWN
Status,Count,Percentage
Approved/Completed,${stats.approvedSheets},${stats.totalSheets > 0 ? Math.round((stats.approvedSheets / stats.totalSheets) * 100) : 0}%
Submitted,${stats.submittedSheets},${stats.totalSheets > 0 ? Math.round((stats.submittedSheets / stats.totalSheets) * 100) : 0}%
Draft/In Progress,${stats.draftSheets},${stats.totalSheets > 0 ? Math.round((stats.draftSheets / stats.totalSheets) * 100) : 0}%
Flagged/Rejected,${stats.flaggedSheets},${stats.totalSheets > 0 ? Math.round((stats.flaggedSheets / stats.totalSheets) * 100) : 0}%
`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `executive-dashboard-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout title="Executive Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Executive Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                High-level compliance metrics and supply chain health
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} disabled={stats.loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Suppliers</p>
                  <p className="text-3xl font-bold">{stats.loading ? '...' : stats.totalSuppliers}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold">{stats.loading ? '...' : `${stats.completionRate}%`}</p>
                </div>
                <Target className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sheets</p>
                  <p className="text-3xl font-bold">{stats.loading ? '...' : stats.totalSheets.toLocaleString()}</p>
                </div>
                <FileText className="h-10 w-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Data Points</p>
                  <p className="text-3xl font-bold">{stats.loading ? '...' : stats.totalAnswers.toLocaleString()}</p>
                </div>
                <Shield className="h-10 w-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Status Breakdown</CardTitle>
              <CardDescription>Current status of all supplier questionnaires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Approved/Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.approvedSheets}</span>
                  <Badge className="bg-green-100 text-green-700">{stats.totalSheets > 0 ? Math.round((stats.approvedSheets / stats.totalSheets) * 100) : 0}%</Badge>
                </div>
              </div>
              <Progress value={stats.totalSheets > 0 ? (stats.approvedSheets / stats.totalSheets) * 100 : 0} className="h-2 bg-green-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>Submitted (Pending Review)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.submittedSheets}</span>
                  <Badge className="bg-blue-100 text-blue-700">{stats.totalSheets > 0 ? Math.round((stats.submittedSheets / stats.totalSheets) * 100) : 0}%</Badge>
                </div>
              </div>
              <Progress value={stats.totalSheets > 0 ? (stats.submittedSheets / stats.totalSheets) * 100 : 0} className="h-2 bg-blue-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <span>Draft/In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.draftSheets}</span>
                  <Badge className="bg-amber-100 text-amber-700">{stats.totalSheets > 0 ? Math.round((stats.draftSheets / stats.totalSheets) * 100) : 0}%</Badge>
                </div>
              </div>
              <Progress value={stats.totalSheets > 0 ? (stats.draftSheets / stats.totalSheets) * 100 : 0} className="h-2 bg-amber-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Flagged/Needs Revision</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.flaggedSheets}</span>
                  <Badge className="bg-red-100 text-red-700">{stats.totalSheets > 0 ? Math.round((stats.flaggedSheets / stats.totalSheets) * 100) : 0}%</Badge>
                </div>
              </div>
              <Progress value={stats.totalSheets > 0 ? (stats.flaggedSheets / stats.totalSheets) * 100 : 0} className="h-2 bg-red-100" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Health Score</CardTitle>
              <CardDescription>Overall supply chain compliance assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <svg className="w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={stats.completionRate >= 80 ? '#22c55e' : stats.completionRate >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${(stats.completionRate / 100) * 440} 440`}
                      transform="rotate(-90 80 80)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{stats.completionRate}%</span>
                    <span className="text-sm text-muted-foreground">Health Score</span>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  {stats.completionRate >= 80 ? (
                    <Badge className="bg-green-100 text-green-700 text-lg px-4 py-1">Excellent</Badge>
                  ) : stats.completionRate >= 50 ? (
                    <Badge className="bg-amber-100 text-amber-700 text-lg px-4 py-1">Good - Room for Improvement</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 text-lg px-4 py-1">Needs Attention</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Review Pending</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.submittedSheets}</p>
                <p className="text-sm text-muted-foreground">questionnaires awaiting review</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Flagged Items</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.flaggedSheets}</p>
                <p className="text-sm text-muted-foreground">require supplier attention</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Incomplete</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.draftSheets}</p>
                <p className="text-sm text-muted-foreground">still in progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
