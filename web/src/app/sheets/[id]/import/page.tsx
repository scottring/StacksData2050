import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'
import { ExcelImport } from '@/components/import/excel-import'

export default async function SheetImportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sheetId } = await params
  const supabase = await createClient()

  // Fetch sheet info
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, status, company_id, companies!sheets_company_id_fkey(name)')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    return (
      <AppLayout title="Sheet Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sheet not found</p>
          <Link href="/sheets" className="text-blue-600 hover:underline mt-4 block">
            Back to sheets
          </Link>
        </div>
      </AppLayout>
    )
  }

  const companyName = (sheet.companies as any)?.name || 'Unknown'

  return (
    <AppLayout title={`Import to: ${sheet.name}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton fallbackUrl={`/sheets/${sheetId}`} />
          <div>
            <h1 className="text-2xl font-bold">{sheet.name}</h1>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
        </div>

        <ExcelImport 
          sheetId={sheetId} 
          companyId={sheet.company_id}
        />
      </div>
    </AppLayout>
  )
}
