'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { CustomersList } from '@/components/customers/customers-list'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type User = Database['public']['Tables']['users']['Row']
type Sheet = Database['public']['Tables']['sheets']['Row']

interface CustomerWithStats {
  company: Company
  sheetsRequested: number
  sheetsCompleted: number
  sheetsPending: number
  primaryContact: User | null
  lastActivity: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCustomers() {
      const supabase = createClient()

      // Get current user and their company
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
        console.error('Error fetching user data:', userError)
        setLoading(false)
        return
      }

      if (!userData?.company_id) {
        setLoading(false)
        return
      }

      const myCompanyId = userData.company_id

      // Fetch sheets where I am the SUPPLIER (assigned_to_company_id = my company)
      // The requesting company (company_id) is my CUSTOMER
      const { data: sheets, error: sheetsError } = await supabase
        .from('sheets')
        .select('*')
        .eq('assigned_to_company_id', myCompanyId)

      console.log('Customers page - Sheets query:', {
        myCompanyId,
        totalSheetsCount: sheets?.length || 0,
        error: sheetsError,
        sampleSheets: sheets?.slice(0, 3).map(s => ({
          name: s.name,
          company_id: s.company_id,
          assigned_to: s.assigned_to_company_id
        }))
      })

      if (!sheets || sheets.length === 0) {
        setLoading(false)
        return
      }

      // DON'T deduplicate yet - let's see all sheets first
      const allSheets = sheets

      console.log('Customers page - All sheets before dedup:', {
        totalSheets: allSheets.length,
        uniqueNames: new Set(allSheets.map(s => s.name)).size,
        uniqueCompanyIds: new Set(allSheets.map(s => s.company_id)).size
      })

      // Get unique customer company IDs, EXCLUDING our own company
      const customerCompanyIds = [...new Set(
        allSheets
          .map(s => s.company_id)
          .filter(id => id && id !== myCompanyId) as string[]
      )]

      console.log('Customers page - Customer IDs (excluding self):', {
        allCompanyIds: allSheets.map(s => s.company_id),
        myCompanyId,
        filteredCustomerIds: customerCompanyIds,
        customerCount: customerCompanyIds.length
      })

      if (customerCompanyIds.length === 0) {
        console.log('No customers found (all sheets were self-referencing)')
        setLoading(false)
        return
      }

      // Fetch customer companies
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .in('id', customerCompanyIds)
        .eq('active', true)
        .order('name')

      console.log('Customers page - Companies:', companies?.length || 0)

      if (!companies) {
        setLoading(false)
        return
      }

      // Fetch users for primary contacts
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .in('company_id', customerCompanyIds)
        .eq('is_company_main_contact', true)

      // Build customer stats
      const customersWithStats: CustomerWithStats[] = companies.map(company => {
        // Get all sheets for this customer, then deduplicate by name
        const rawCompanySheets = allSheets.filter(s => s.company_id === company.id)

        // Deduplicate sheets by name for this customer, keeping most recent
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

        const sheetsCompleted = companySheets.filter(
          s => s.new_status === 'completed' || s.new_status === 'approved'
        ).length

        const sheetsPending = companySheets.filter(
          s => s.new_status === 'in_progress' || s.new_status === 'pending' || !s.new_status
        ).length

        // Find most recent activity
        const lastModified = companySheets
          .map(s => s.modified_at)
          .filter(Boolean)
          .sort()
          .reverse()[0]

        const primaryContact = (users || []).find(
          u => u.company_id === company.id
        ) || null

        return {
          company,
          sheetsRequested: companySheets.length,
          sheetsCompleted,
          sheetsPending,
          primaryContact,
          lastActivity: lastModified || null
        }
      })

      console.log('Customers page - Final customers:', customersWithStats.length)

      setCustomers(customersWithStats)
      setLoading(false)
    }

    fetchCustomers()
  }, [])

  if (loading) {
    return (
      <AppLayout title="Our Customers">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading customers...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Our Customers">
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Our Customers</h1>
            <p className="text-muted-foreground mt-1">
              Companies that request product data sheets from you
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Client component handles search and table interactivity */}
        <CustomersList customers={customers} />
      </div>
    </AppLayout>
  )
}
