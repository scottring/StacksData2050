import { createClient } from '@/lib/supabase/server'
import { SimpleSheetEditor } from './simple-editor'

export default async function SheetEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sheetId } = await params
  const supabase = await createClient()

  // Fetch sheet info
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, new_status, company_id, companies!sheets_company_id_fkey(name)')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Sheet Not Found</h1>
        <p className="text-muted-foreground">The requested sheet could not be found.</p>
      </div>
    )
  }

  // Fetch all answers from the view - already deduplicated and joined!
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order')

  // Fetch choices for dropdown questions
  const { data: choices } = await supabase
    .from('choices')
    .select('id, content, parent_question_id')
    .order('order_number')

  const companyName = (sheet as any).companies?.name || 'Unknown'

  return (
    <SimpleSheetEditor
      sheetId={sheetId}
      sheetName={sheet.name}
      sheetStatus={sheet.new_status}
      companyName={companyName}
      answers={answers || []}
      choices={choices || []}
    />
  )
}
