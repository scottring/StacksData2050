import { supabase } from './src/migration/supabase-client.js'

const { data: upm } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', 'UPM')
  .single()

if (upm) {
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('id')
    .eq('company_id', upm.id)

  const { data: sheetsWithChemicals } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id')
    .in('sheet_id', allSheets?.map(s => s.id) || [])

  const uniqueWithChemicals = new Set(sheetsWithChemicals?.map(s => s.sheet_id) || []).size

  console.log('UPM Analysis:')
  console.log('  Total sheets:', allSheets?.length)
  console.log('  Sheets with chemicals:', uniqueWithChemicals)
}
