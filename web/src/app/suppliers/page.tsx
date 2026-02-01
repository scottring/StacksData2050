import { AppLayout } from '@/components/layout/app-layout'
import { SuppliersList } from '@/components/suppliers/suppliers-list'
import { SuppliersHeaderActions } from '@/components/suppliers/suppliers-header-actions'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
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

async function getSuppliers(): Promise<SupplierWithStats[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return []

  const myCompanyId = userData.company_id

  const { data: sheets } = await supabase
    .from('sheets')
    .select('*, companies!sheets_company_id_fkey(id, name, logo_url, location)')
    .eq('requesting_company_id', myCompanyId)

  if (!sheets || sheets.length === 0) return []

  const supplierCompanyIds = [...new Set(
    sheets
      .map(s => s.company_id)
      .filter((id): id is string => id !== null)
  )]

  if (supplierCompanyIds.length === 0) return []

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .in('id', supplierCompanyIds)
    .order('name')

  if (!companies) return []

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('company_id', supplierCompanyIds)

  const suppliersWithStats: SupplierWithStats[] = companies.map(company => {
    const companySheets = sheets.filter(s => s.company_id === company.id)

    const openTasks = companySheets.filter(
      s => s.status === 'in_progress' || s.status === 'pending'
    ).length

    const completedTasks = companySheets.filter(
      s => s.status === 'approved' || s.status === 'imported' || s.status === 'completed' || s.status === 'draft' || !s.status
    ).length

    const companyUsers = (users || []).filter(u => u.company_id === company.id)
    const primaryContact = companyUsers.find(u => u.role === 'admin') || companyUsers[0] || null

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
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Our Suppliers"
          description="Manage your supplier relationships and compliance data"
        >
          <SuppliersHeaderActions />
        </PageHeader>

        <SuppliersList suppliers={suppliers} />
      </div>
    </AppLayout>
  )
}
