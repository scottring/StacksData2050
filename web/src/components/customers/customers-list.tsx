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

interface CustomerWithStats {
  company: Company
  sheetsRequested: number
  sheetsCompleted: number
  sheetsPending: number
  primaryContact: User | null
  lastActivity: string | null
}

interface CustomersListProps {
  customers: CustomerWithStats[]
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function CustomersList({ customers }: CustomersListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = customers.filter(c =>
    c.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.primaryContact?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCompletionPercentage = (customer: CustomerWithStats) => {
    if (customer.sheetsRequested === 0) return 0
    return Math.round((customer.sheetsCompleted / customer.sheetsRequested) * 100)
  }

  return (
    <>
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredCustomers.length} customers
        </Badge>
      </div>

      {/* Customers table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Customer</TableHead>
              <TableHead className="w-[200px]">Sheet Progress</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-12 w-12 opacity-30" />
                    <span>
                      {searchQuery ? 'No customers found matching your search' : 'No customers found'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const completionPct = getCompletionPercentage(customer)

                return (
                  <TableRow
                    key={customer.company.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/customers/${customer.company.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          {customer.company.logo_url ? (
                            <img
                              src={customer.company.logo_url}
                              alt={customer.company.name}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{customer.company.name}</div>
                          {customer.company.location_text && (
                            <div className="text-sm text-muted-foreground">
                              {customer.company.location_text}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {customer.sheetsCompleted}/{customer.sheetsRequested} sheets
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
                      {customer.primaryContact ? (
                        <div>
                          <div className="font-medium">
                            {customer.primaryContact.full_name ||
                             `${customer.primaryContact.first_name || ''} ${customer.primaryContact.last_name || ''}`.trim() ||
                             'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.primaryContact.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No contact</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(customer.lastActivity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {customer.sheetsRequested === 0 ? (
                        <Badge variant="outline">No sheets</Badge>
                      ) : customer.sheetsPending > 0 ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {customer.sheetsPending} pending
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
