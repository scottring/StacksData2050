import { supabase } from './src/migration/supabase-client.js'

console.log('=== SEARCHING FOR HYDRAGLOSS SHEETS ===\n')

// Search for any sheet with "hydra" in the name
const { data: sheets } = await supabase
  .from('sheets')
  .select('id, name, company_id')
  .ilike('name', '%hydra%')

console.log(`Found ${sheets?.length} sheets with "hydra" in name:\n`)

sheets?.forEach(s => {
  console.log(`${s.name}`)
  console.log(`  ID: ${s.id}`)
  console.log(`  Company: ${s.company_id}`)
  console.log()
})

// Also get the company name for Omya sheets
if (sheets && sheets.length > 0) {
  const omyaId = 'e5ddb7ab-99bd-40f1-9a5d-3731be1aa3b7'
  const omyaSheets = sheets.filter(s => s.company_id === omyaId)

  console.log(`\nHydragloss sheets from Omya: ${omyaSheets.length}`)
  omyaSheets.forEach(s => console.log(`  ${s.name} (${s.id})`))
}
