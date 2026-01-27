'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  Package,
  Users,
  ArrowLeft,
  Mail,
  Calendar,
  Loader2,
  Shield,
  TrendingUp,
} from 'lucide-react'

interface CompanyDetails {
  id: string
  name: string
  totalSheets: number
  activeSheets90d: number
  activeSheets30d: number
  users: Array<{
    id: string
    email: string
    fullName: string | null
    lastSignIn: Date | null
  }>
  asCustomer: {
    totalSheets: number
    suppliers: Array<{
      id: string
      name: string
      sheetCount: number
    }>
  }
  asSupplier: {
    totalSheets: number
    customers: Array<{
      id: string
      name: string
      sheetCount: number
    }>
  }
  recentSheets: Array<{
    id: string
    name: string
    modifiedAt: Date | null
    isCustomer: boolean
    partnerName: string | null
  }>
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const companyId = params?.id as string

  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    async function fetchCompanyDetails() {
      const supabase = createClient()

      // Check super admin
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin')
      const isSuper = superAdminCheck === true
      setIsSuperAdmin(isSuper)

      if (!isSuper) {
        router.push('/dashboard')
        return
      }

      // Fetch company
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .single()

      if (!companyData) {
        router.push('/admin/companies')
        return
      }

      // Fetch all data via admin API to bypass RLS and limits
      const response = await fetch('/api/admin/association-metrics')
      if (!response.ok) {
        console.error('Failed to fetch data')
        router.push('/admin/companies')
        return
      }

      const { sheets: rawSheets, companies: allCompanies } = await response.json()

      // Filter out test sheets and sheets from Stacks Data company
      const stacksDataCompany = allCompanies.find((c: any) => c.name === 'Stacks Data')
      const sheets = (rawSheets || []).filter((s: any) => {
        // Exclude Stacks Data company sheets
        if (stacksDataCompany && (s.company_id === stacksDataCompany.id || s.assigned_to_company_id === stacksDataCompany.id)) {
          return false
        }
        // Exclude sheets with "test" in the name (case insensitive)
        if (s.name && s.name.toLowerCase().includes('test')) {
          return false
        }
        return true
      })

      // Fetch users for this company
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name, last_sign_in_at')
        .eq('company_id', companyId)

      const companies = allCompanies || []
      const users = usersData || []

      const companyMap = new Map(companies.map((c: any) => [c.id, c.name]))

      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // As customer: sheets created BY this company
      const customerSheets = sheets.filter((s: any) => s.company_id === companyId)

      // As supplier: sheets assigned TO this company
      const supplierSheets = sheets.filter((s: any) => s.assigned_to_company_id === companyId)

      const allCompanySheets = [...customerSheets, ...supplierSheets]

      // Deduplicate by name, keeping only the most recent version of each product
      const sheetsByName = new Map<string, typeof allCompanySheets[0]>()
      allCompanySheets.forEach(sheet => {
        const existing = sheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          sheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueSheets = Array.from(sheetsByName.values())

      const activeSheets90d = uniqueSheets.filter((s: any) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= ninetyDaysAgo
      }).length

      const activeSheets30d = uniqueSheets.filter((s: any) => {
        const modified = s.modified_at ? new Date(s.modified_at) : null
        return modified && modified >= thirtyDaysAgo
      }).length

      // Deduplicate customer sheets by name (latest version only)
      const customerSheetsByName = new Map<string, typeof customerSheets[0]>()
      customerSheets.forEach((sheet: any) => {
        const existing = customerSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          customerSheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueCustomerSheets = Array.from(customerSheetsByName.values())

      // Deduplicate supplier sheets by name (latest version only)
      const supplierSheetsByName = new Map<string, typeof supplierSheets[0]>()
      supplierSheets.forEach((sheet: any) => {
        const existing = supplierSheetsByName.get(sheet.name)
        if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
          supplierSheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueSupplierSheets = Array.from(supplierSheetsByName.values())

      // Get suppliers (unique assigned_to companies) with deduplicated counts
      const supplierIds = new Set(uniqueCustomerSheets.map((s: any) => s.assigned_to_company_id).filter(Boolean))
      const suppliers = Array.from(supplierIds).map(id => ({
        id: id as string,
        name: (companyMap.get(id as string) || 'Unknown') as string,
        sheetCount: uniqueCustomerSheets.filter((s: any) => s.assigned_to_company_id === id).length
      })).sort((a, b) => b.sheetCount - a.sheetCount)

      // Get customers (unique company_ids where this company is supplier) with deduplicated counts
      const customerIds = new Set(uniqueSupplierSheets.map((s: any) => s.company_id).filter(Boolean))
      const customers = Array.from(customerIds).map(id => ({
        id: id as string,
        name: (companyMap.get(id as string) || 'Unknown') as string,
        sheetCount: uniqueSupplierSheets.filter((s: any) => s.company_id === id).length
      })).sort((a, b) => b.sheetCount - a.sheetCount)

      // Recent sheets
      const recentSheets = uniqueSheets
        .sort((a: any, b: any) => {
          const dateA = a.modified_at ? new Date(a.modified_at).getTime() : 0
          const dateB = b.modified_at ? new Date(b.modified_at).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 10)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          modifiedAt: s.modified_at ? new Date(s.modified_at) : null,
          isCustomer: s.company_id === companyId,
          partnerName: (s.company_id === companyId
            ? companyMap.get(s.assigned_to_company_id) || null
            : companyMap.get(s.company_id) || null) as string | null
        }))

      setCompany({
        id: companyData.id,
        name: companyData.name,
        totalSheets: uniqueSheets.length,
        activeSheets90d,
        activeSheets30d,
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          lastSignIn: u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
        })),
        asCustomer: {
          totalSheets: uniqueCustomerSheets.length,
          suppliers
        },
        asSupplier: {
          totalSheets: uniqueSupplierSheets.length,
          customers
        },
        recentSheets
      })

      setLoading(false)
    }

    if (companyId) {
      fetchCompanyDetails()
    }
  }, [companyId, router])

  function formatDate(date: Date | null): string {
    if (!date) return 'Never'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never'
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(date)
  }

  if (loading) {
    return (
      <AppLayout title="Company Details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (!isSuperAdmin || !company) {
    return null
  }

  const activityRate90d = company.totalSheets > 0
    ? Math.round((company.activeSheets90d / company.totalSheets) * 100)
    : 0

  return (
    <AppLayout title={company.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/companies')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{company.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Super Admin View
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{company.totalSheets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {company.asCustomer.totalSheets} as customer, {company.asSupplier.totalSheets} as supplier
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activity Rate (90d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityRate90d}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {company.activeSheets90d} active sheets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Activity (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{company.activeSheets30d}</div>
              <p className="text-xs text-muted-foreground mt-1">
                sheets modified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{company.users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                registered users
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* As Customer */}
          <Card>
            <CardHeader>
              <CardTitle>As Customer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sheets created by this company ({company.asCustomer.totalSheets})
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium">Suppliers ({company.asCustomer.suppliers.length})</div>
                {company.asCustomer.suppliers.length > 0 ? (
                  <div className="space-y-2">
                    {company.asCustomer.suppliers.slice(0, 10).map(supplier => (
                      <div
                        key={supplier.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => router.push(`/admin/companies/${supplier.id}`)}
                      >
                        <span className="text-sm">{supplier.name}</span>
                        <Badge variant="outline">{supplier.sheetCount} sheets</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No suppliers</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* As Supplier */}
          <Card>
            <CardHeader>
              <CardTitle>As Supplier</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sheets assigned to this company ({company.asSupplier.totalSheets})
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium">Customers ({company.asSupplier.customers.length})</div>
                {company.asSupplier.customers.length > 0 ? (
                  <div className="space-y-2">
                    {company.asSupplier.customers.slice(0, 10).map(customer => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => router.push(`/admin/companies/${customer.id}`)}
                      >
                        <span className="text-sm">{customer.name}</span>
                        <Badge variant="outline">{customer.sheetCount} sheets</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No customers</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({company.users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {company.users.length > 0 ? (
              <div className="space-y-2">
                {company.users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{user.email}</div>
                        {user.fullName && (
                          <div className="text-xs text-muted-foreground">{user.fullName}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Last sign in: {formatRelativeTime(user.lastSignIn)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No users registered</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sheets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sheet Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {company.recentSheets.length > 0 ? (
              <div className="space-y-2">
                {company.recentSheets.map(sheet => (
                  <div
                    key={sheet.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => router.push(`/sheets/${sheet.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{sheet.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {sheet.isCustomer ? 'Customer' : 'Supplier'} • {sheet.partnerName || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeTime(sheet.modifiedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
