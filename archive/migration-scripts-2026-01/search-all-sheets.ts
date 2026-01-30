import { supabase } from './src/migration/supabase-client.js'

async function searchAllSheets() {
  console.log('=== Searching All Sheets ===\n')

  // Get all sheets
  const { data: sheets, count } = await supabase
    .from('sheets')
    .select('id, name, version_number', { count: 'exact' })
    .order('name')

  console.log(`Total sheets: ${count}\n`)

  if (sheets) {
    // Search for sheets containing "90" or "ME" or "78"
    const matching = sheets.filter(s =>
      s.name?.includes('90') ||
      s.name?.includes('ME') ||
      s.name?.includes('78') ||
      s.name?.toLowerCase().includes('hydrocarb')
    )

    if (matching.length > 0) {
      console.log('Sheets matching HYDROCARB criteria:\n')
      for (const sheet of matching) {
        console.log(`${sheet.name}`)
        console.log(`  ID: ${sheet.id}`)
        console.log(`  Version: ${sheet.version_number}`)

        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('parent_sheet_id', sheet.id)

        console.log(`  Questions: ${count}\n`)
      }
    } else {
      console.log('No matching sheets found')
      console.log('\nShowing first 20 sheets:')
      for (const sheet of sheets.slice(0, 20)) {
        console.log(`  ${sheet.name}`)
      }
    }
  }

  // Also try searching by the ID from the original context
  console.log('\n=== Checking Specific Sheet ID ===\n')
  const knownId = 'd8bcf82a-02c0-45f4-a7b9-b63ede46f3d6'

  const { data: specificSheet } = await supabase
    .from('sheets')
    .select('id, name, version_number')
    .eq('id', knownId)
    .maybeSingle()

  if (specificSheet) {
    console.log(`Found sheet by ID:`)
    console.log(`  Name: ${specificSheet.name}`)
    console.log(`  ID: ${specificSheet.id}`)
    console.log(`  Version: ${specificSheet.version_number}`)

    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_sheet_id', specificSheet.id)

    console.log(`  Questions: ${count}`)
  } else {
    console.log(`Sheet ID ${knownId} NOT FOUND`)
  }
}

searchAllSheets()
