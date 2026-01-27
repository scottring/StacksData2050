'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Shield,
  Download,
  Calendar,
  Clock,
  Loader2,
  Database,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalSheets: number
  completedSheets: number
  activeSuppliers: number
  totalAnswers: number
  completionRate: number
  loading: boolean
}

const reportTypes = [
  {
    title: 'Supplier Compliance Summary',
    description: 'Overview of all supplier compliance statuses, completion rates, and outstanding items',
    icon: Shield,
    status: 'ready',
    lastGenerated: '2 hours ago',
    href: '/reports/supplier-compliance',
  },
  {
    title: 'Executive Dashboard',
    description: 'High-level metrics for leadership: risk exposure, regulatory compliance, supply chain health',
    icon: TrendingUp,
    status: 'ready',
    lastGenerated: '1 day ago',
    href: '/reports/executive',
  },
  {
    title: 'Chemical Inventory Report',
    description: 'Complete inventory of chemicals across all suppliers with regulatory flags (PFAS, REACH, Prop 65)',
    icon: FileText,
    status: 'ready',
    lastGenerated: '3 hours ago',
    href: '/reports/chemical-inventory',
  },
  {
    title: 'Overdue Submissions',
    description: 'List of suppliers with overdue questionnaire submissions and SLA breaches',
    icon: Clock,
    status: 'ready',
    lastGenerated: '1 hour ago',
    href: '/reports/overdue',
  },
  {
    title: 'Supplier Performance Trends',
    description: 'Historical analysis of supplier response times, revision rates, and data quality scores',
    icon: BarChart3,
    status: 'ready',
    lastGenerated: '30 minutes ago',
    href: '/reports/trends',
  },
  {
    title: 'Regulatory Change Impact',
    description: 'Analysis of upcoming regulatory changes and affected products/suppliers',
    icon: Calendar,
    status: 'ready',
    lastGenerated: '1 hour ago',
    href: '/reports/regulatory',
  },
]

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalSheets: 0,
    completedSheets: 0,
    activeSuppliers: 0,
    totalAnswers: 0,
    completionRate: 0,
    loading: true,
  })

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      // Fetch all stats in parallel
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
        s => s.status === 'approved' || s.status === 'completed'
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
      })
    }

    fetchStats()
  }, [])

  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and download compliance reports for your organization
            </p>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Create Custom Report
          </Button>
        </div>

        {/* Quick Stats - Real Data from Supabase */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  {stats.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.completionRate}%</p>
                  )}
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  {stats.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeSuppliers.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Active Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  {stats.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalSheets.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Total Sheets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                  <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  {stats.loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalAnswers.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Total Answers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <Link key={report.title} href={report.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Ready
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Last generated: {report.lastGenerated}
                      </span>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
