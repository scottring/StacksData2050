'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Search, ChevronRight, Building2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type User = Database['public']['Tables']['users']['Row']

interface SupplierWithStats {
  company: Company
  openTasks: number
  completedTasks: number
  totalTasks: number
  primaryContact: User | null
}

interface SuppliersListProps {
  suppliers: SupplierWithStats[]
}

export function SuppliersList({ suppliers }: SuppliersListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSuppliers = suppliers.filter(s =>
    s.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.primaryContact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.primaryContact?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCompletionPercentage = (supplier: SupplierWithStats) => {
    if (supplier.totalTasks === 0) return 0
    return Math.round((supplier.completedTasks / supplier.totalTasks) * 100)
  }

  return (
    <>
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
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-12 w-12 opacity-30" />
                    <span>
                      {searchQuery ? 'No suppliers found matching your search' : 'No suppliers found'}
                    </span>
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
                      {supplier.primaryContact &&
                       supplier.primaryContact.full_name &&
                       supplier.primaryContact.full_name !== 'Unknown' &&
                       !supplier.primaryContact.email?.includes('placeholder') ? (
                        <div>
                          <div className="font-medium">
                            {supplier.primaryContact.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.primaryContact.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No contact assigned</span>
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
    </>
  )
}
