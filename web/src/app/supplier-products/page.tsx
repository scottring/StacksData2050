'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Download,
  Search,
  Package,
  Building2,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Company {
  id: string
  name: string
  logo_url: string | null
}

interface SheetProduct {
  id: string
  name: string
  status: string | null
  company_id: string | null
  requesting_company_id: string | null
  created_at: string | null
  modified_at: string | null
  supplier: Company | null
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<SheetProduct[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

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

      const companyId = userProfile?.company_id || null
      setUserCompanyId(companyId)

      if (!companyId) {
        setLoading(false)
        return
      }

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .order('name')

      const companyMap = new Map((companiesData || []).map(c => [c.id, c]))

      const { data: sheetsData, error: sheetsError } = await supabase
        .from('sheets')
        .select('id, name, status, company_id, requesting_company_id, created_at, modified_at')
        .eq('requesting_company_id', companyId)
        .order('modified_at', { ascending: false })

      if (sheetsError) {
        console.error('Error fetching sheets:', sheetsError)
      }

      const sheetProducts: SheetProduct[] = (sheetsData || []).map(sheet => ({
        ...sheet,
        supplier: sheet.company_id ? companyMap.get(sheet.company_id) || null : null
      }))

      setProducts(sheetProducts)
      setCompanies(companiesData || [])
      setLoading(false)
    }

    fetchProducts()
  }, [])

  const suppliers = [...new Map(
    products
      .filter(p => p.supplier)
      .map(p => [p.supplier!.id, p.supplier!])
  ).values()]

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    if (filterStatus === 'completed') {
      matchesStatus = p.status === 'completed' || p.status === 'approved'
    } else if (filterStatus === 'in_progress') {
      matchesStatus = p.status === 'in_progress'
    } else if (filterStatus === 'pending') {
      matchesStatus = p.status === 'pending' || !p.status
    }

    const matchesSupplier = filterSupplier === 'all' ||
      p.company_id === filterSupplier

    return matchesSearch && matchesStatus && matchesSupplier
  })

  const getProductStatus = (product: SheetProduct) => {
    if (product.status === 'completed' || product.status === 'approved') {
      return { label: 'Complete', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50' }
    }
    if (product.status === 'in_progress') {
      return { label: 'In Progress', icon: Clock, className: 'bg-sky-50 text-sky-700 border-sky-200/50' }
    }
    if (product.status === 'pending') {
      return { label: 'Pending', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200/50' }
    }
    return { label: 'Draft', icon: AlertCircle, className: 'bg-slate-50 text-slate-600 border-slate-200/50' }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const stats = {
    total: products.length,
    completed: products.filter(p => p.status === 'completed' || p.status === 'approved').length,
    inProgress: products.filter(p => p.status === 'in_progress').length,
    pending: products.filter(p => p.status === 'pending' || !p.status).length
  }

  if (loading) {
    return (
      <AppLayout title="Products">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-emerald-600" />
            </div>
            <span className="text-sm font-medium">Loading products...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Products">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Supplier Products"
          description="Track product data requests from your suppliers"
        >
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Request Product Data
          </Button>
        </PageHeader>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Products" value={stats.total} icon={Package} accentColor="slate" delay={100} />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} accentColor="emerald" delay={150} />
          <StatCard title="In Progress" value={stats.inProgress} icon={Clock} accentColor="sky" delay={200} />
          <StatCard title="Pending" value={stats.pending} icon={Clock} accentColor="amber" delay={250} />
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4 opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus:border-emerald-300 focus:ring-emerald-200"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] rounded-xl border-slate-200">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-[200px] rounded-xl border-slate-200">
              <Building2 className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-slate-100 text-slate-600">
            {filteredProducts.length} products
          </Badge>
        </div>

        {/* Products table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="w-[300px] font-semibold text-slate-700">Product</TableHead>
                <TableHead className="w-[200px] font-semibold text-slate-700">Supplier</TableHead>
                <TableHead className="w-[120px] font-semibold text-slate-700">Status</TableHead>
                <TableHead className="w-[120px] font-semibold text-slate-700">Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                      <span className="font-medium">No products found</span>
                      <p className="text-sm text-slate-400">
                        {products.length === 0
                          ? "Start by requesting product data from your suppliers"
                          : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => {
                  const status = getProductStatus(product)
                  const StatusIcon = status.icon

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
                          <div>
                            <div className="font-medium text-slate-900">
                              {product.name || 'Unnamed Product'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.supplier ? (
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                              {product.supplier.logo_url ? (
                                <img
                                  src={product.supplier.logo_url}
                                  alt={product.supplier.name}
                                  className="h-6 w-6 object-contain"
                                />
                              ) : (
                                <Building2 className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <span className="text-slate-700">{product.supplier.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border font-medium", status.className)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(product.modified_at || product.created_at)}
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
