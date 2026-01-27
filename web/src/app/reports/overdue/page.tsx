'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Clock,
  AlertTriangle,
  Calendar,
  Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface OverdueSheet {
  id: string
  name: string
  companyName: string
  status: string
  modifiedAt: string
  daysOverdue: number
}

export default function OverdueSubmissionsReport() {
  const [overdueSheets, setOverdueSheets] = useState<OverdueSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get sheets that are still in draft/pending/in_progress status
      const { data: sheets } = await supabase
        .from('sheets')
        .select('id, name, assigned_to_company_id, new_status, modified_at, created_at')
        .in('new_status', ['draft', 'pending', 'in_progress'])
        .order('modified_at', { ascending: true })

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')

      const companyMap = new Map((companies || []).map(c => [c.id, c]))
      const now = new Date()

      // Calculate days since last modified
      const overdueData: OverdueSheet[] = (sheets || []).map(sheet => {
        const lastModified = new Date(sheet.modified_at || sheet.created_at)
        const diffTime = now.getTime() - lastModified.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const company = companyMap.get(sheet.assigned_to_company_id)

        return {
          id: sheet.id,
          name: sheet.name,
          companyName: company?.name || 'Unknown',
          status: sheet.new_status || 'draft',
          modifiedAt: sheet.modified_at || sheet.created_at,
          daysOverdue: diffDays,
        }
      })
        .filter(s => s.daysOverdue > 7) // Only show sheets older than 7 days
        .sort((a, b) => b.daysOverdue - a.daysOverdue)

      // Calculate stats
      const critical = overdueData.filter(s => s.daysOverdue > 30).length
      const warning = overdueData.filter(s => s.daysOverdue > 7 && s.daysOverdue <= 30).length

      setOverdueSheets(overdueData)
      setStats({
        total: overdueData.length,
        critical,
        warning,
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  const getUrgencyBadge = (days: number) => {
    if (days > 90) return <Badge className="bg-red-100 text-red-700">Critical ({days} days)</Badge>
    if (days > 30) return <Badge className="bg-amber-100 text-amber-700">Overdue ({days} days)</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700">Warning ({days} days)</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <AppLayout title="Overdue Submissions">
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
                <Clock className="h-6 w-6" />
                Overdue Submissions
              </h1>
              <p className="text-muted-foreground mt-1">
                Questionnaires that have not been updated in over 7 days
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Reminders
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Critical (30+ days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.warning}</p>
                  <p className="text-sm text-muted-foreground">Warning (7-30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Overdue Questionnaires</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : overdueSheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No overdue submissions found</p>
                <p className="text-sm">All questionnaires have been updated within the last 7 days</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-left py-3 px-4 font-medium">Supplier</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Last Modified</th>
                      <th className="text-center py-3 px-4 font-medium">Urgency</th>
                      <th className="text-center py-3 px-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueSheets.slice(0, 50).map((sheet, idx) => (
                      <tr key={sheet.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <td className="py-3 px-4">
                          <Link href={`/sheets/${sheet.id}`} className="text-blue-600 hover:underline">
                            {sheet.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{sheet.companyName}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{sheet.status}</Badge>
                        </td>
                        <td className="py-3 px-4">{formatDate(sheet.modifiedAt)}</td>
                        <td className="text-center py-3 px-4">
                          {getUrgencyBadge(sheet.daysOverdue)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {overdueSheets.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Showing first 50 of {overdueSheets.length} overdue submissions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
