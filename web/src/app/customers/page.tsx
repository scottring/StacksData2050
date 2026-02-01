'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { CustomersList } from '@/components/customers/customers-list'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  name: string
  email_domain?: string | null
  type?: string | null
  logo_url?: string | null
  location?: string | null
  created_at?: string | null
  modified_at?: string | null
  bubble_id?: string | null
}

interface User {
  id: string
  email?: string | null
  full_name?: string | null
  company_id?: string | null
  role?: string | null
  created_at?: string | null
  modified_at?: string | null
  bubble_id?: string | null
}

interface CustomerWithStats {
  company: Company
  sheetsRequested: number
  sheetsCompleted: number
  sheetsPending: number
  primaryContact: User | null
  lastActivity: string | null
  isNewCustomer: boolean
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCustomers() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userError) {
        setLoading(false)
        return
      }

      if (!userData?.company_id) {
        setLoading(false)
        return
      }

      const myCompanyId = userData.company_id

      const { data: sheets } = await supabase
        .from('sheets')
        .select('*')
        .eq('company_id', myCompanyId)

      const { data: requests } = await supabase
        .from('requests')
        .select('*')
        .eq('requesting_from_id', myCompanyId)
        .neq('show_as_removed', true)

      const allSheets = sheets || []
      const allRequests = requests || []

      const customerIdsFromSheets = allSheets
        .map(s => s.requesting_company_id)
        .filter(id => id && id !== myCompanyId) as string[]

      const customerIdsFromRequests = allRequests
        .map(r => r.requestor_id)
        .filter(id => id && id !== myCompanyId) as string[]

      const customerCompanyIds = [...new Set([...customerIdsFromSheets, ...customerIdsFromRequests])]

      if (customerCompanyIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .in('id', customerCompanyIds)
        .order('name')

      if (!companies) {
        setLoading(false)
        return
      }

      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('company_id', customerCompanyIds)

      const customersWithStats: CustomerWithStats[] = (companies as Company[]).map(company => {
        const rawCompanySheets = allSheets.filter(s => s.requesting_company_id === company.id)

        const sheetsByName = new Map<string, typeof allSheets[0]>()
        rawCompanySheets.forEach(sheet => {
          const existing = sheetsByName.get(sheet.name)
          if (!existing ||
              new Date(sheet.modified_at || sheet.created_at || 0) >
              new Date(existing.modified_at || existing.created_at || 0)) {
            sheetsByName.set(sheet.name, sheet)
          }
        })
        const companySheets = Array.from(sheetsByName.values())

        const hasSheets = companySheets.length > 0
        const hasRequests = allRequests.some(r => r.requestor_id === company.id)
        const isNewCustomer = !hasSheets && hasRequests

        const sheetsCompleted = companySheets.filter(
          s => s.status === 'completed' || s.status === 'approved' || s.status === 'draft' || s.status === 'imported' || !s.status
        ).length

        const sheetsPending = companySheets.filter(
          s => s.status === 'in_progress' || s.status === 'pending'
        ).length

        const sheetDates = companySheets
          .map(s => s.modified_at)
          .filter(Boolean) as string[]

        const requestDates = allRequests
          .filter(r => r.requestor_id === company.id)
          .map(r => r.modified_at || r.created_at)
          .filter(Boolean) as string[]

        const allDates = [...sheetDates, ...requestDates].sort().reverse()
        const lastActivity = allDates[0] || null

        const companyUsers = ((users || []) as User[]).filter(u => u.company_id === company.id)
        const primaryContact = companyUsers.find(u => u.role === 'admin') || companyUsers[0] || null

        return {
          company,
          sheetsRequested: companySheets.length,
          sheetsCompleted,
          sheetsPending,
          primaryContact,
          lastActivity,
          isNewCustomer
        }
      })

      setCustomers(customersWithStats)
      setLoading(false)
    }

    fetchCustomers()
  }, [])

  if (loading) {
    return (
      <AppLayout title="Our Customers">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-sky-600" />
            </div>
            <span className="text-sm font-medium">Loading customers...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Our Customers">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Our Customers"
          description="Companies that request product data sheets from you"
        >
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </PageHeader>

        <CustomersList customers={customers} />
      </div>
    </AppLayout>
  )
}
