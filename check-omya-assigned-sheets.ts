import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING SHEETS ASSIGNED TO OMYA ===\n')

// Find Omya company
const { data: omya } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', '%omya%')
  .single()

console.log(`Omya: ${omya?.name} (${omya?.id})`)

// Fetch sheets exactly as the supplier page does
const { data: sheets } = await supabase
  .from('sheets')
  .select('*')
  .eq('assigned_to_company_id', omya?.id)
  .order('modified_at', { ascending: false })

console.log(`\nTotal sheets assigned to Omya: ${sheets?.length}\n`)

// Filter for Aqurate sheets
const aqurateSheets = sheets?.filter(s => s.name?.toLowerCase().includes('aqurate'))

console.log(`Aqurate sheets (${aqurateSheets?.length}):\n`)
aqurateSheets?.forEach((sheet, idx) => {
  console.log(`${idx + 1}. ${sheet.name}`)
  console.log(`   ID: ${sheet.id}`)
  console.log(`   Assigned to: ${sheet.assigned_to_company_id}`)
  console.log(`   Modified: ${sheet.modified_at}`)

  // Check if this is the broken ID
  if (sheet.id === '9ea6b264-1db2-41fc-9418-2f9e5cfd3541') {
    console.log(`   ⚠️  THIS IS THE BROKEN SHEET ID FROM THE URL!`)
  }
  console.log()
})

// Also check by company_id instead of assigned_to_company_id
console.log('\n=== CHECKING BY company_id FIELD ===\n')

const { data: sheetsByCompanyId } = await supabase
  .from('sheets')
  .select('*')
  .eq('company_id', omya?.id)
  .order('modified_at', { ascending: false })

console.log(`Total sheets with company_id = Omya: ${sheetsByCompanyId?.length}`)

const aqurateByCompanyId = sheetsByCompanyId?.filter(s => s.name?.toLowerCase().includes('aqurate'))
console.log(`Aqurate sheets by company_id: ${aqurateByCompanyId?.length}`)

if (aqurateByCompanyId && aqurateByCompanyId.length > 0) {
  console.log('\nFirst few:')
  aqurateByCompanyId.slice(0, 3).forEach(s => {
    console.log(`  ${s.name} (${s.id})`)
  })
}
