import { AppLayout } from '@/components/layout/app-layout'
import { SuppliersList } from '@/components/suppliers/suppliers-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type User = Database['public']['Tables']['users']['Row']
type Sheet = Database['public']['Tables']['sheets']['Row']

interface SupplierWithStats {
  company: Company
  openTasks: number
  completedTasks: number
  totalTasks: number
  primaryContact: User | null
}

async function getSuppliers(): Promise<SupplierWithStats[]> {
  const supabase = await createClient()

  // Get current user and their company
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return []

  // Fetch companies - RLS will automatically filter to visible companies
  // (own company + association members + sheet relationship companies)
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('active', true)
    .eq('show_as_supplier', true)  // Only show companies that are suppliers
    .order('name')

  if (!companies) return []

  // Fetch sheets - RLS will filter to accessible sheets only
  const { data: sheets } = await supabase
    .from('sheets')
    .select('*')

  // Fetch users for primary contacts - RLS will filter to visible users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('is_company_main_contact', true)

  // Build supplier stats
  const suppliersWithStats: SupplierWithStats[] = companies.map(company => {
    // Count sheets assigned to this supplier company
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

  return suppliersWithStats
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

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

        {/* Client component handles search and table interactivity */}
        <SuppliersList suppliers={suppliers} />
      </div>
    </AppLayout>
  )
}
