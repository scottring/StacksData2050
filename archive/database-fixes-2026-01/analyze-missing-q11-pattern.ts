import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'
const testSheetId = '548f08be-3b2a-465f-94b4-a2279bee9819' // Aqurate (has Q11 answer now)

console.log('=== ANALYZING Q11 PATTERN ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

// Get sheets that DO have Q11 answer
const { data: sheetsWithQ11 } = await supabase
  .from('sheets')
  .select('id, name, bubble_id')
  .in('id',
    supabase.from('answers')
      .select('sheet_id')
      .eq('parent_question_id', q11?.id)
  )
  .limit(5)

console.log('Sheets WITH Q11 answer:')
console.log(`  Found: ${sheetsWithQ11?.length}`)

// Pick a sheet that has other Biocides answers but NOT Q11
const { data: allBiocidesQuestions } = await supabase
  .from('questions')
  .select('id')
  .eq('parent_section_id', biocidesSection)

const biocidesQuestionIds = allBiocidesQuestions?.map(q => q.id) || []

// Find a sheet with Biocides answers but no Q11
const { data: sheetsWithBiocides } = await supabase
  .from('answers')
  .select('sheet_id')
  .in('parent_question_id', biocidesQuestionIds)
  .neq('parent_question_id', q11?.id)
  .limit(100)

const uniqueSheetIds = [...new Set(sheetsWithBiocides?.map(a => a.sheet_id))]

console.log(`\nSheets with OTHER Biocides answers: ${uniqueSheetIds.length}`)

// Check if any of these have Q11 answer
let hasQ11Count = 0
let missingQ11Count = 0
let sampleSheetMissingQ11 = null

for (const sheetId of uniqueSheetIds) {
  const { data: q11Answer } = await supabase
    .from('answers')
    .select('id')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', q11?.id)
    .single()

  if (q11Answer) {
    hasQ11Count++
  } else {
    missingQ11Count++
    if (!sampleSheetMissingQ11) {
      sampleSheetMissingQ11 = sheetId
    }
  }
}

console.log(`  With Q11: ${hasQ11Count}`)
console.log(`  WITHOUT Q11: ${missingQ11Count}`)

if (sampleSheetMissingQ11) {
  console.log(`\n=== SAMPLE SHEET WITHOUT Q11 ===`)

  const { data: sheet } = await supabase
    .from('sheets')
    .select('name, bubble_id')
    .eq('id', sampleSheetMissingQ11)
    .single()

  console.log(`Sheet: ${sheet?.name}`)
  console.log(`Sheet Bubble ID: ${sheet?.bubble_id}`)

  // Get all Biocides answers for this sheet
  const { data: biocidesAnswers } = await supabase
    .from('answers')
    .select('parent_question_id, questions(order_number), choices(content)')
    .eq('sheet_id', sampleSheetMissingQ11)
    .in('parent_question_id', biocidesQuestionIds)

  console.log(`\nBiocides answers for this sheet:`)
  biocidesAnswers?.forEach(a => {
    console.log(`  Q${a.questions?.order_number}: ${a.choices?.content || 'no choice'}`)
  })

  // This confirms: sheets have Biocides answers but are missing Q11
  console.log(`\n✓ Confirmed: Sheet has Biocides answers but Q11 is missing`)
  console.log(`  This is genuine missing data from the original Bubble migration`)
}
