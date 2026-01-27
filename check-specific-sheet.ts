import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

async function checkSheet() {
  const { data: sheet } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', sheetId)
    .single()

  if (!sheet) {
    console.log('Sheet not found')
    return
  }

  console.log('Sheet:', sheet.name)
  console.log('Bubble ID:', sheet.bubble_id)
  console.log('Status:', sheet.new_status)
  console.log()

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log('Total answers:', count)
  console.log()
  console.log('View at: http://localhost:3000/sheets/' + sheetId)
}

checkSheet().catch(console.error)
