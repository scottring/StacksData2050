import { supabase } from './src/migration/supabase-client.js'

console.log('=== FINDING ALL AQURATE SHEETS ===\n')

// Search for sheets with "Aqurate" in the name
const { data: sheets } = await supabase
  .from('sheets')
  .select('id, name, company_id, new_status')
  .ilike('name', '%Aqurate%')
  .order('name')

console.log(`Found ${sheets?.length} Aqurate sheets:\n`)

sheets?.forEach((s, idx) => {
  console.log(`${idx + 1}. ${s.name}`)
  console.log(`   ID: ${s.id}`)
  console.log(`   Status: ${s.new_status}`)

  // Check answer count
  supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', s.id)
    .then(({ count }) => {
      console.log(`   Answers: ${count}`)
      console.log()
    })
})

// Also check the specific ID from the URL
console.log('\n=== CHECKING URL SHEET ID ===')
const urlSheetId = '9ea6b264-1db2-41fc-9418-2f9e5cfd3541'

const { data: urlSheet, error } = await supabase
  .from('sheets')
  .select('id, name')
  .eq('id', urlSheetId)
  .maybeSingle()

if (urlSheet) {
  console.log(`URL sheet found: ${urlSheet.name}`)
} else {
  console.log(`URL sheet NOT found in database`)
  console.log(`Error: ${error?.message || 'No error'}`)
}

// Check the sheet we've been working on
console.log('\n=== THE SHEET WE FIXED ===')
const workingSheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

const { data: workingSheet } = await supabase
  .from('sheets')
  .select('id, name')
  .eq('id', workingSheetId)
  .single()

console.log(`Working sheet: ${workingSheet?.name}`)
console.log(`ID: ${workingSheet?.id}`)
