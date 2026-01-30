import { supabase } from './src/migration/supabase-client.js'

async function verifyFixResults() {
  console.log('=== Verifying Fix Results ===\n')

  // Test a few specific sheets that we fixed
  const testCases = [
    { name: 'Blankophor P liq. 01', version: 1, expectedAnswers: 80 },
    { name: 'Blankophor P liq. 01', version: 3, expectedAnswers: 90 },
    { name: 'ND7231 SLURRY', version: 1, expectedAnswers: 100 },
    { name: '10-Undecenal Aldehyde C-11', version: 2, expectedAnswers: 87 }
  ]

  console.log('Checking specific sheets:\n')

  for (const test of testCases) {
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, name, version')
      .eq('name', test.name)
      .eq('version', test.version)
      .single()

    if (!sheet) {
      console.log(`❌ Sheet not found: ${test.name} v${test.version}`)
      continue
    }

    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    const status = count === test.expectedAnswers ? '✅' : '❌'
    console.log(`${status} ${test.name} (v${test.version}): ${count} answers (expected ${test.expectedAnswers})`)
  }

  // Check HYDROCARB 90-ME 78% specifically
  console.log('\n=== HYDROCARB 90-ME 78% Check ===\n')

  const hydrocarb = [
    { version: 1, id: '8a3424ae-49d9-4f8a-a4af-fda13a222b28' },
    { version: 2, id: '8222b70c-14dd-48ab-8ceb-e972c9d797c3' },
    { version: 3, id: 'fc48461e-7a18-4cb1-887e-1a3686244ef0' }
  ]

  for (const v of hydrocarb) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', v.id)

    console.log(`Version ${v.version}: ${count} answers`)
  }

  console.log('\n=== Overall Health Check ===\n')

  // Count total answers
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })

  console.log(`Total answers in database: ${totalAnswers}`)

  // Count answers with valid sheet_id
  const { count: withValidSheet } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .not('sheet_id', 'is', null)

  console.log(`Answers with valid sheet_id: ${withValidSheet}`)
  console.log(`Percentage: ${Math.round((withValidSheet || 0) / (totalAnswers || 1) * 100)}%`)

  console.log('\n✅ Verification complete!')
}

verifyFixResults()
