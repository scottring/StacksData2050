import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ManufacturerExcelImport } from '@/components/import/manufacturer-excel-import'
import { FileSpreadsheet, AlertCircle } from 'lucide-react'

export default async function ManufacturerImportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AppLayout title="Import Excel">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Authentication Required</h2>
            <p className="text-slate-500 mt-1">Please log in to import workbooks.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

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
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">No Company Associated</h2>
            <p className="text-slate-500 mt-1">No company associated with your account.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Import Historical Workbooks">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Import Historical Workbooks"
          description="Upload PPVIS HQ 2.1 workbooks that were completed outside the system"
        />

        <div className="opacity-0 animate-fade-in-up animation-delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Excel Import</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload completed Excel workbooks to import historical data. The supplier will be notified to review and confirm the imported data.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <ManufacturerExcelImport
            manufacturerCompanyId={companyId}
            manufacturerCompanyName={companyName}
          />
        </div>
      </div>
    </AppLayout>
  )
}
