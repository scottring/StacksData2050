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
  Plus,
  Download,
  Search,
  ChevronRight,
  Building2,
  MoreHorizontal
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Company, Sheet, User } from '@/lib/database.types'

interface SupplierWithStats {
  company: Company
  openTasks: number
  completedTasks: number
  totalTasks: number
  primaryContact: User | null
}

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchSuppliers() {
      const supabase = createClient()

      // Fetch all companies (in production, filter by relationship to current user's company)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name')

      if (companiesError) {
        console.error('Error fetching companies:', companiesError)
        setLoading(false)
        return
      }

      // Fetch sheets to calculate task stats
      const { data: sheets, error: sheetsError } = await supabase
        .from('sheets')
        .select('*')

      // Fetch users to get primary contacts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_company_main_contact', true)

      // Build supplier stats
      const suppliersWithStats: SupplierWithStats[] = (companies || []).map(company => {
        // Count sheets assigned to this company
        const companySheets = (sheets || []).filter(
          s => s.assigned_to_company_id === company.id
        )

        const openTasks = companySheets.filter(
          s => s.new_status === 'in_progress' || s.new_status === 'pending'
        ).length

        const completedTasks = companySheets.filter(
          s => s.new_status === 'completed' || s.new_status === 'approved'
        ).length

        const primaryContact = (users || []).find(
          u => u.company_id === company.id
        ) || null

        return {
          company,
          openTasks,
          completedTasks,
          totalTasks: companySheets.length,
          primaryContact
        }
      })

      setSuppliers(suppliersWithStats)
      setLoading(false)
    }

    fetchSuppliers()
  }, [])

  const filteredSuppliers = suppliers.filter(s =>
    s.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.primaryContact?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCompletionPercentage = (supplier: SupplierWithStats) => {
    if (supplier.totalTasks === 0) return 0
    return Math.round((supplier.completedTasks / supplier.totalTasks) * 100)
  }

  return (
    <AppLayout title="Our Suppliers">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Suppliers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your supplier relationships and compliance data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredSuppliers.length} suppliers
          </Badge>
        </div>

        {/* Suppliers table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Supplier</TableHead>
                <TableHead className="w-[200px]">Task Progress</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Loading suppliers...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-12 w-12 opacity-30" />
                      <span>No suppliers found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const completionPct = getCompletionPercentage(supplier)

                  return (
                    <TableRow
                      key={supplier.company.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/suppliers/${supplier.company.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            {supplier.company.logo_url ? (
                              <img
                                src={supplier.company.logo_url}
                                alt={supplier.company.name}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{supplier.company.name}</div>
                            {supplier.company.location_text && (
                              <div className="text-sm text-muted-foreground">
                                {supplier.company.location_text}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {supplier.completedTasks}/{supplier.totalTasks} tasks
                            </span>
                            <span className="font-medium">{completionPct}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.primaryContact ? (
                          <div>
                            <div className="font-medium">
                              {supplier.primaryContact.full_name ||
                               `${supplier.primaryContact.first_name || ''} ${supplier.primaryContact.last_name || ''}`.trim() ||
                               'No name'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {supplier.primaryContact.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.totalTasks === 0 ? (
                          <Badge variant="outline">No sheets</Badge>
                        ) : supplier.openTasks > 0 ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {supplier.openTasks} open
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Complete
                          </Badge>
                        )}
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
