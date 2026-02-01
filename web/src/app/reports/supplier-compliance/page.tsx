'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SupplierCompliance {
  id: string
  name: string
  totalSheets: number
  completedSheets: number
  pendingSheets: number
  completionRate: number
}

export default function SupplierComplianceReport() {
  const [suppliers, setSuppliers] = useState<SupplierCompliance[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    suppliers: 0,
    totalSheets: 0,
    completedSheets: 0,
    avgCompletion: 0,
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get current user and check access level
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const companyId = userData?.company_id

      // Get all companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      // Get sheets - filter by company access if not super admin
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

      // Calculate compliance for each supplier (company_id = supplier filling out the sheet)
      const supplierData: SupplierCompliance[] = (companies || []).map(company => {
        const companySheets = sheets.filter(s => s.company_id === company.id)
        // Legacy/draft/imported count as complete
        const completed = companySheets.filter(s =>
          s.status === 'approved' || s.status === 'completed' || s.status === 'draft' || s.status === 'imported' || !s.status
        ).length
        const pending = companySheets.filter(s =>
          s.status === 'in_progress' || s.status === 'pending'
        ).length

        return {
          id: company.id,
          name: company.name || 'Unknown',
          totalSheets: companySheets.length,
          completedSheets: completed,
          pendingSheets: pending,
          completionRate: companySheets.length > 0
            ? Math.round((completed / companySheets.length) * 100)
            : 0,
        }
      }).filter(s => s.totalSheets > 0) // Only show suppliers with sheets
        .sort((a, b) => b.totalSheets - a.totalSheets) // Sort by most sheets

      // Calculate totals
      const totalSheets = supplierData.reduce((sum, s) => sum + s.totalSheets, 0)
      const completedSheets = supplierData.reduce((sum, s) => sum + s.completedSheets, 0)
      const avgCompletion = supplierData.length > 0
        ? Math.round(supplierData.reduce((sum, s) => sum + s.completionRate, 0) / supplierData.length)
        : 0

      setSuppliers(supplierData)
      setTotals({
        suppliers: supplierData.length,
        totalSheets,
        completedSheets,
        avgCompletion,
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  const getStatusBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-100 text-green-700">Compliant</Badge>
    if (rate >= 50) return <Badge className="bg-amber-100 text-amber-700">In Progress</Badge>
    if (rate > 0) return <Badge className="bg-red-100 text-red-700">Action Required</Badge>
    return <Badge variant="outline">No Data</Badge>
  }

  const exportToCSV = () => {
    const headers = ['Supplier', 'Total Sheets', 'Completed', 'Pending', 'Completion Rate', 'Status']
    const getStatus = (rate: number) => {
      if (rate >= 80) return 'Compliant'
      if (rate >= 50) return 'In Progress'
      if (rate > 0) return 'Action Required'
      return 'No Data'
    }
    const rows = suppliers.map(s => [
      s.name,
      s.totalSheets,
      s.completedSheets,
      s.pendingSheets,
      `${s.completionRate}%`,
      getStatus(s.completionRate)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `supplier-compliance-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout title="Supplier Compliance Summary">
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
                <Shield className="h-6 w-6" />
                Supplier Compliance Summary
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time compliance status for all {totals.suppliers} active suppliers
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} disabled={loading || suppliers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{totals.suppliers}</p>
                  <p className="text-sm text-muted-foreground">Active Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{totals.completedSheets}</p>
                  <p className="text-sm text-muted-foreground">Completed Sheets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{totals.totalSheets - totals.completedSheets}</p>
                  <p className="text-sm text-muted-foreground">Pending Sheets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{totals.avgCompletion}%</p>
                  <p className="text-sm text-muted-foreground">Avg Completion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Table */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Supplier</th>
                      <th className="text-center py-3 px-4 font-medium">Total Sheets</th>
                      <th className="text-center py-3 px-4 font-medium">Completed</th>
                      <th className="text-center py-3 px-4 font-medium">Pending</th>
                      <th className="text-center py-3 px-4 font-medium">Completion Rate</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.slice(0, 50).map((supplier, idx) => (
                      <tr key={supplier.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <td className="py-3 px-4">
                          <Link href={`/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                            {supplier.name}
                          </Link>
                        </td>
                        <td className="text-center py-3 px-4">{supplier.totalSheets}</td>
                        <td className="text-center py-3 px-4 text-green-600">{supplier.completedSheets}</td>
                        <td className="text-center py-3 px-4 text-amber-600">{supplier.pendingSheets}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={supplier.completionRate} className="w-20 h-2" />
                            <span className="text-sm font-medium w-12">{supplier.completionRate}%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          {getStatusBadge(supplier.completionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {suppliers.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Showing top 50 of {suppliers.length} suppliers
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
