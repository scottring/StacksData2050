import { supabase } from './src/migration/supabase-client.js'

async function findApprovedSheets() {
  // Get approved sheets with good data
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, new_status, bubble_id')
    .eq('new_status', 'approved')
    .limit(20)

  if (!sheets || sheets.length === 0) {
    console.log('No approved sheets found')
    return
  }

  console.log('Finding approved sheets with good answer counts...\n')

  const goodSheets = []

  for (const sheet of sheets) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    if (count && count > 80) {
      goodSheets.push({
        ...sheet,
        answerCount: count
      })
    }
  }

  console.log(`Found ${goodSheets.length} sheets with >80 answers:\n`)

  goodSheets.forEach((sheet, idx) => {
    console.log(`${idx + 1}. ${sheet.name}`)
    console.log(`   ID: ${sheet.id}`)
    console.log(`   Answers: ${sheet.answerCount}`)
    console.log(`   URL: http://localhost:3000/sheets/${sheet.id}`)
    console.log()
  })
}

findApprovedSheets().catch(console.error)
