import { supabase } from './src/migration/supabase-client.js'

async function findHydrocarbSheet() {
  console.log('=== Finding HYDROCARB Sheet ===\n')

  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .ilike('name', '%HYDROCARB%90%')

  if (sheets && sheets.length > 0) {
    console.log(`Found ${sheets.length} HYDROCARB sheets:\n`)
    for (const sheet of sheets) {
      console.log(`${sheet.name}`)
      console.log(`  ID: ${sheet.id}`)
      console.log(`  Bubble ID: ${sheet.bubble_id}`)

      // Get tags for this sheet
      const { data: sheetTags } = await supabase
        .from('sheet_tags')
        .select('tag_id')
        .eq('sheet_id', sheet.id)

      if (sheetTags && sheetTags.length > 0) {
        const { data: tags } = await supabase
          .from('tags')
          .select('name')
          .in('id', sheetTags.map(st => st.tag_id))

        console.log(`  Tags: ${tags?.map(t => t.name).join(', ')}`)
      }
      console.log()
    }
  } else {
    console.log('No HYDROCARB sheets found')
  }
}

findHydrocarbSheet()
