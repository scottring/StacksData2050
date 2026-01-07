import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING OMYA SHEETS ===\n')

// Find Omya company
const { data: omya } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', '%omya%')
  .limit(5)

console.log('Omya companies found:')
omya?.forEach(c => console.log(`  ${c.name} (${c.id})`))

if (omya && omya.length > 0) {
  const omyaId = omya[0].id
  console.log(`\nUsing: ${omya[0].name}\n`)

  // Get all sheets for this company
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id')
    .eq('company_id', omyaId)
    .order('name')

  console.log(`Found ${sheets?.length} sheets for Omya:\n`)

  // Filter for Aqurate
  const aqurateSheets = sheets?.filter(s => s.name?.toLowerCase().includes('aqurate'))

  console.log(`Aqurate sheets (${aqurateSheets?.length}):\n`)
  for (const sheet of aqurateSheets || []) {
    console.log(`${sheet.name}`)
    console.log(`  ID: ${sheet.id}`)

    // Check if this is the broken ID
    if (sheet.id === '9ea6b264-1db2-41fc-9418-2f9e5cfd3541') {
      console.log(`  ⚠️  THIS IS THE BROKEN SHEET ID FROM THE URL!`)
    }

    // Count answers
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    console.log(`  Answers: ${count}`)
    console.log()
  }
}
