import { supabase } from './src/migration/supabase-client.js'

const aqurateSheetId = '9ea6b264-1db2-41fc-9418-2f9e5cfd3541' // From URL in screenshot

console.log('=== CHECKING AQURATE SHEET ANSWERS ===\n')

// Get sheet details
const { data: sheet } = await supabase
  .from('sheets')
  .select('id, name, bubble_id')
  .eq('id', aqurateSheetId)
  .single()

console.log('Sheet:', sheet?.name)
console.log('Sheet ID:', sheet?.id)
console.log('Bubble ID:', sheet?.bubble_id)

// Count total answers for this sheet
const { count: totalAnswers } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .eq('sheet_id', aqurateSheetId)

console.log(`\nTotal answers: ${totalAnswers}`)

// Get sample answers
const { data: sampleAnswers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id, text_value, questions(name), choices(content)')
  .eq('sheet_id', aqurateSheetId)
  .limit(10)

console.log('\nSample answers:')
sampleAnswers?.forEach((a, idx) => {
  let value = 'unknown'
  if (a.choices) value = a.choices.content
  else if (a.text_value) value = a.text_value

  console.log(`${idx + 1}. ${a.questions?.name?.substring(0, 50)}`)
  console.log(`   Answer: ${value}`)
})

// Check if answers have valid question IDs
const { data: allAnswers } = await supabase
  .from('answers')
  .select('parent_question_id')
  .eq('sheet_id', aqurateSheetId)

const uniqueQuestionIds = [...new Set(allAnswers?.map(a => a.parent_question_id).filter(Boolean))]

console.log(`\nUnique question IDs in answers: ${uniqueQuestionIds.length}`)

// Check how many of these questions exist
let existCount = 0
for (const qId of uniqueQuestionIds.slice(0, 20)) {
  const { data: q } = await supabase
    .from('questions')
    .select('id')
    .eq('id', qId)
    .single()

  if (q) existCount++
}

console.log(`Sample check (20 questions): ${existCount} exist, ${20 - existCount} deleted`)
