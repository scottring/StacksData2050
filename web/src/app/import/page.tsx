import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { ManufacturerExcelImport } from '@/components/import/manufacturer-excel-import'

export default async function ManufacturerImportPage() {
  const supabase = await createClient()
  
  // Get current user's company
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <AppLayout title="Import Excel">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to import workbooks.</p>
        </div>
      </AppLayout>
    )
  }
  
  // Get user's company
  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, companies(id, name)')
    .eq('id', user.id)
    .single()
  
  const companyId = userProfile?.company_id
  const companyName = (userProfile?.companies as any)?.name || 'Unknown'
  
  if (!companyId) {
    return (
      <AppLayout title="Import Excel">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No company associated with your account.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Import Historical Workbooks">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Import Historical Excel Workbooks</h1>
          <p className="text-muted-foreground mt-1">
            Upload PPVIS HQ 2.1 workbooks that were completed outside the system.
            The supplier will be notified to review and confirm the imported data.
          </p>
        </div>

        <ManufacturerExcelImport 
          manufacturerCompanyId={companyId}
          manufacturerCompanyName={companyName}
        />
      </div>
    </AppLayout>
  )
}
