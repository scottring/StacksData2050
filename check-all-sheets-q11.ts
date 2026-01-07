import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== CHECKING Q11 ANSWERS ACROSS ALL SHEETS ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, name')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11:', q11?.name?.substring(0, 60))
console.log('Q11 ID:', q11?.id)

// Get all sheets
const { data: sheets } = await supabase
  .from('sheets')
  .select('id, name')
  .order('name')

console.log(`\nTotal sheets: ${sheets?.length}\n`)

// For each sheet, check if it has an answer for Q11
let sheetsWithAnswer = 0
let sheetsWithoutAnswer = 0
const missingSheets = []

for (const sheet of sheets || []) {
  const { data: answers } = await supabase
    .from('answers')
    .select('id, choice_id')
    .eq('sheet_id', sheet.id)
    .eq('parent_question_id', q11?.id)

  if (answers && answers.length > 0) {
    sheetsWithAnswer++
  } else {
    sheetsWithoutAnswer++
    missingSheets.push(sheet.name)
  }
}

console.log(`\n=== SUMMARY ===`)
console.log(`Sheets WITH Q11 answer: ${sheetsWithAnswer}`)
console.log(`Sheets WITHOUT Q11 answer: ${sheetsWithoutAnswer}`)

if (missingSheets.length > 0 && missingSheets.length <= 20) {
  console.log(`\nSheets missing Q11 answer:`)
  missingSheets.forEach(name => console.log(`  - ${name}`))
} else if (missingSheets.length > 20) {
  console.log(`\nSheets missing Q11 answer (showing first 20):`)
  missingSheets.slice(0, 20).forEach(name => console.log(`  - ${name}`))
  console.log(`  ... and ${missingSheets.length - 20} more`)
}
