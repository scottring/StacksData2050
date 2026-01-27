import { supabase } from './src/migration/supabase-client.js'

async function pickTestSheets() {
  console.log('=== Picking Good Test Sheets ===\n')

  // Pick some interesting sheets
  const candidateIds = [
    'eeebc8c5-bc05-475b-9fe3-819a57276d53', // PERGALITE VIOLET MK 60L
    '04a8d56a-59f2-444c-9775-dd58036b28b8', // FERAFLOC CSC 615 UH L
    '445691bd-9663-40fe-a994-72e67dc89128', // ND7231 SLURRY
    '2afd6c09-b6d8-43b6-8e93-66b11c9dbcc6', // Blankophor P liq. 01
    'b63e5555-15c3-482c-bf24-bad4bb9e5d66', // 10-Undecenal Aldehyde C-11
  ]

  for (const id of candidateIds) {
    const { data: sheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('id', id)
      .single()

    if (!sheet) {
      console.log(`Sheet ${id} not found`)
      console.log('')
      continue
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sheet.company_id)
      .single()

    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', id)

    console.log(`${sheet.name}`)
    console.log(`  Company: ${company?.name || 'Unknown'}`)
    console.log(`  Answers: ${answerCount || 0}`)
    console.log(`  Sheet ID: ${id}`)
    console.log(`  Demo URL: http://localhost:3002/sheets/${id}/demo`)
    console.log('')
  }
}

pickTestSheets().catch(console.error)
