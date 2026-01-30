import { supabase } from './src/migration/supabase-client.js'

async function findGoodSheet() {
  // Get sheets with answers that are marked as approved
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, new_status, bubble_id')
    .eq('new_status', 'approved')
    .limit(10)

  if (!sheets || sheets.length === 0) {
    console.log('No approved sheets found')
    return
  }

  console.log('Looking for a well-filled sheet...\n')

  for (const sheet of sheets) {
    // Count answers for this sheet
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    console.log(`Sheet: ${sheet.name}`)
    console.log(`  ID: ${sheet.id}`)
    console.log(`  Bubble ID: ${sheet.bubble_id}`)
    console.log(`  Status: ${sheet.new_status}`)
    console.log(`  Answers: ${count}`)

    if (count && count > 50) {
      console.log('\n✅ This sheet has good data!')
      console.log(`\nView it at: http://localhost:3000/sheets/${sheet.id}`)
      console.log(`\nOr start the dev server with:`)
      console.log(`  cd stacks-app && npm run dev`)
      return
    }

    console.log()
  }

  console.log('No sheets with >50 answers found in first 10 approved sheets')
}

findGoodSheet().catch(console.error)
