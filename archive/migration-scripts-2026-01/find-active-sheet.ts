import { supabase } from './src/migration/supabase-client.js'

async function findActiveSheet() {
  console.log('=== Finding Active Sheet with Questions ===\n')

  // Get sheets that have questions
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .not('bubble_id', 'is', null)
    .limit(100)

  if (!sheets) {
    console.log('No sheets found')
    return
  }

  console.log('Checking sheets for questions...\n')

  for (const sheet of sheets) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_sheet_id', sheet.id)

    if (count && count > 20) {
      console.log(`${sheet.name}`)
      console.log(`  Supabase ID: ${sheet.id}`)
      console.log(`  Bubble ID: ${sheet.bubble_id}`)
      console.log(`  Questions: ${count}\n`)

      if (count > 50) {
        break // Found a good one
      }
    }
  }
}

findActiveSheet()
