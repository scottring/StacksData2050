'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
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

interface Product {
  id: string
  product_name: string | null
  requestor_id: string | null
  requesting_from_id: string | null
  sheet_id: string | null
  processed: boolean | null
  manufacturer_marked_as_provided: boolean | null
  show_as_removed: boolean | null
  created_at: string | null
  modified_at: string | null
}

interface Company {
  id: string
  name: string
}

interface Sheet {
  id: string
  name: string
  status: string | null
}

interface ProductWithDetails extends Product {
  requestor: Company | null
  supplier: Company | null
  sheet: Sheet | null
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()

      // Get current user's company
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

      setUserCompanyId(userProfile?.company_id || null)

      // Fetch requests (products)
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('Error fetching requests:', requestsError)
      }

      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      // Fetch sheets
      const { data: sheetsData } = await supabase
        .from('sheets')
        .select('id, name, status')

      const companyMap = new Map((companiesData || []).map(c => [c.id, c]))
      const sheetMap = new Map((sheetsData || []).map(s => [s.id, s]))

      // Combine data
      const productsWithDetails: ProductWithDetails[] = (requestsData || []).map(req => ({
        ...req,
        requestor: req.requestor_id ? companyMap.get(req.requestor_id) || null : null,
        supplier: req.requesting_from_id ? companyMap.get(req.requesting_from_id) || null : null,
        sheet: req.sheet_id ? sheetMap.get(req.sheet_id) || null : null
      }))

      setProducts(productsWithDetails)
      setCompanies(companiesData || [])
      setLoading(false)
    }

    fetchProducts()
  }, [])

  // Get unique suppliers from products
  const suppliers = [...new Map(
    products
      .filter(p => p.supplier)
      .map(p => [p.supplier!.id, p.supplier!])
  ).values()]

  // Filter products
  const filteredProducts = products.filter(p => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      p.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.requestor?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    let matchesStatus = true
    if (filterStatus === 'completed') {
      matchesStatus = p.processed === true || p.manufacturer_marked_as_provided === true
    } else if (filterStatus === 'pending') {
      matchesStatus = !p.processed && !p.manufacturer_marked_as_provided && !p.show_as_removed
    } else if (filterStatus === 'removed') {
      matchesStatus = p.show_as_removed === true
    }

    // Supplier filter
    const matchesSupplier = filterSupplier === 'all' ||
      p.requesting_from_id === filterSupplier

    return matchesSearch && matchesStatus && matchesSupplier
  })

  // Get status info
  const getProductStatus = (product: ProductWithDetails) => {
    if (product.show_as_removed) {
      return { label: 'Removed', icon: AlertCircle, className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' }
    }
    if (product.processed || product.manufacturer_marked_as_provided) {
      return { label: 'Complete', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    }
    if (product.sheet?.status === 'in_progress') {
      return { label: 'In Progress', icon: Clock, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    }
    return { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  }

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate stats
  const stats = {
    total: products.length,
    completed: products.filter(p => p.processed || p.manufacturer_marked_as_provided).length,
    pending: products.filter(p => !p.processed && !p.manufacturer_marked_as_provided && !p.show_as_removed).length,
    removed: products.filter(p => p.show_as_removed).length
  }

  return (
    <AppLayout title="Products">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Supplier Products</h1>
            <p className="text-muted-foreground mt-1">
              Track product data requests from your suppliers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Request Product Data
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Products</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.completed}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.pending}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">Removed</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.removed}</p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="text-sm">
            {filteredProducts.length} products
          </Badge>
        </div>

        {/* Products table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead className="w-[200px]">Supplier</TableHead>
                <TableHead className="w-[200px]">Requested By</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading products...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-12 w-12 opacity-30" />
                      <span>No products found</span>
                      <p className="text-sm">
                        {products.length === 0
                          ? "Start by requesting product data from your suppliers"
                          : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const status = getProductStatus(product)
                  const StatusIcon = status.icon

                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (product.sheet_id) {
                          router.push(`/sheets/${product.sheet_id}`)
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {product.product_name || 'Unnamed Product'}
                            </div>
                            {product.sheet && (
                              <div className="text-sm text-muted-foreground">
                                {product.sheet.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.supplier ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{product.supplier.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.requestor ? (
                          <span>{product.requestor.name}</span>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(product.created_at)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
