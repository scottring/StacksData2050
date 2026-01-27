'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
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

interface Sheet {
  id: string
  name: string
  new_status: string | null
  modified_at: string | null
  company_id: string | null
  assigned_to_company_id: string | null
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

      if (!userProfile?.company_id) {
        setLoading(false)
        return
      }

      const myCompanyId = userProfile.company_id

      // Fetch sheets where I am the SUPPLIER (assigned_to_company_id = my company)
      // These are products I provide TO customers
      const { data: sheetsData } = await supabase
        .from('sheets')
        .select('*')
        .eq('assigned_to_company_id', myCompanyId)

      if (!sheetsData || sheetsData.length === 0) {
        setLoading(false)
        return
      }

      // Deduplicate sheets by name, keeping most recent
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

      // Get unique customer IDs
      const customerIds = [...new Set(uniqueSheets.map(s => s.company_id).filter(Boolean) as string[])]

      console.log('Customer Products - Customer IDs:', {
        myCompanyId,
        customerIds,
        sampleSheets: uniqueSheets.slice(0, 5).map(s => ({
          name: s.name,
          company_id: s.company_id,
          assigned_to: s.assigned_to_company_id
        }))
      })

      // Fetch customer companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', customerIds)

      console.log('Customer Products - Companies fetched:', {
        companiesCount: companiesData?.length,
        companies: companiesData?.map(c => ({ id: c.id, name: c.name }))
      })

      const companyMap = new Map((companiesData || []).map(c => [c.id, c]))

      // Combine data
      const productsWithCustomers: ProductWithCustomer[] = uniqueSheets.map(sheet => ({
        ...sheet,
        customer: sheet.company_id ? companyMap.get(sheet.company_id) || null : null
      }))

      console.log('Customer Products - Final products:', {
        totalProducts: productsWithCustomers.length,
        sampleProducts: productsWithCustomers.slice(0, 5).map(p => ({
          name: p.name,
          sheet_company_id: p.company_id,
          customer_id: p.customer?.id,
          customer_name: p.customer?.name
        }))
      })

      setProducts(productsWithCustomers)
      setLoading(false)
    }

    fetchProducts()
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Submitted
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'flagged':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Needs Revision
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
            Draft
          </Badge>
        )
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

  // Calculate stats
  const stats = {
    total: products.length,
    approved: products.filter(p => p.new_status === 'approved' || p.new_status === 'completed').length,
    inProgress: products.filter(p => p.new_status === 'in_progress').length,
    pending: products.filter(p => !p.new_status || p.new_status === 'pending').length
  }

  return (
    <AppLayout title="Products Sold">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Products Sold</h1>
            <p className="text-muted-foreground mt-1">
              Products you supply to your customers with their compliance status
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg dark:bg-gray-900/30">
                  <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{filteredProducts.length} products</Badge>
        </div>

        {/* Products Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Sheet Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading products...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-12 w-12 opacity-30" />
                      <span>
                        {searchQuery ? 'No products found matching your search' : 'No products found'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/sheets/${product.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {product.customer?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.new_status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTimeAgo(product.modified_at)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
