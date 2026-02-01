'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Package,
  Building2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Sheet {
  id: string
  name: string
  status: string | null
  modified_at: string | null
  company_id: string | null
  requesting_company_id: string | null
}

interface Company {
  id: string
  name: string
}

interface ProductWithCustomer extends Sheet {
  customer: Company | null
}

export default function CustomerProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userProfile?.company_id) {
        setLoading(false)
        return
      }

      const myCompanyId = userProfile.company_id

      const { data: sheetsData } = await supabase
        .from('sheets')
        .select('*')
        .eq('requesting_company_id', myCompanyId)

      if (!sheetsData || sheetsData.length === 0) {
        setLoading(false)
        return
      }

      const sheetsByName = new Map<string, typeof sheetsData[0]>()
      sheetsData.forEach(sheet => {
        const existing = sheetsByName.get(sheet.name)
        if (!existing ||
            new Date(sheet.modified_at || sheet.created_at || 0) >
            new Date(existing.modified_at || existing.created_at || 0)) {
          sheetsByName.set(sheet.name, sheet)
        }
      })
      const uniqueSheets = Array.from(sheetsByName.values())

      const customerIds = [...new Set(uniqueSheets.map(s => s.company_id).filter(Boolean) as string[])]

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', customerIds)

      const companyMap = new Map((companiesData || []).map(c => [c.id, c]))

      const productsWithCustomers: ProductWithCustomer[] = uniqueSheets.map(sheet => ({
        ...sheet,
        customer: sheet.company_id ? companyMap.get(sheet.company_id) || null : null
      }))

      setProducts(productsWithCustomers)
      setLoading(false)
    }

    fetchProducts()
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return {
          label: 'Approved',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
          dotColor: 'bg-emerald-500',
        }
      case 'submitted':
        return {
          label: 'Submitted',
          className: 'bg-sky-50 text-sky-700 border-sky-200/50',
          dotColor: 'bg-sky-500',
        }
      case 'in_progress':
        return {
          label: 'In Progress',
          className: 'bg-violet-50 text-violet-700 border-violet-200/50',
          dotColor: 'bg-violet-500',
        }
      case 'flagged':
        return {
          label: 'Needs Revision',
          className: 'bg-amber-50 text-amber-700 border-amber-200/50',
          dotColor: 'bg-amber-500',
        }
      default:
        return {
          label: 'Draft',
          className: 'bg-slate-50 text-slate-600 border-slate-200/50',
          dotColor: 'bg-slate-400',
        }
    }
  }

  const formatTimeAgo = (dateStr: string | null): string => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const stats = {
    total: products.length,
    approved: products.filter(p => p.status === 'approved' || p.status === 'completed').length,
    inProgress: products.filter(p => p.status === 'in_progress').length,
    pending: products.filter(p => !p.status || p.status === 'pending').length
  }

  if (loading) {
    return (
      <AppLayout title="Products Sold">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-violet-600" />
            </div>
            <span className="text-sm font-medium">Loading products...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Products Sold">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Products Sold"
          description="Products you supply to your customers with their compliance status"
        >
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </PageHeader>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Products" value={stats.total} icon={Package} accentColor="blue" delay={100} />
          <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} accentColor="emerald" delay={150} />
          <StatCard title="In Progress" value={stats.inProgress} icon={Clock} accentColor="violet" delay={200} />
          <StatCard title="Pending" value={stats.pending} icon={Package} accentColor="slate" delay={250} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
            />
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600">
            {filteredProducts.length} products
          </Badge>
        </div>

        {/* Products Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="font-semibold text-slate-700">Product</TableHead>
                <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                <TableHead className="font-semibold text-slate-700">Sheet Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Last Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                      <span className="font-medium">
                        {searchQuery ? 'No products found matching your search' : 'No products found'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const statusConfig = getStatusConfig(product.status)
                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                      onClick={() => router.push(`/sheets/${product.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Package className="h-5 w-5 text-slate-500" />
                          </div>
                          <span className="font-medium text-slate-900">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {product.customer?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border font-medium", statusConfig.className)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.dotColor)} />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatTimeAgo(product.modified_at)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
