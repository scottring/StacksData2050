import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

console.log('=== DEBUGGING ANSWER QUESTION IDS ===\n')

// Get all current Biocides questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

console.log('Current Biocides question IDs:')
questions?.forEach(q => {
  console.log(`Q${q.order_number}: ${q.id} - ${q.name?.substring(0, 50)}`)
})

// Get all answers for this sheet
const { data: answers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id, text_value, boolean_value, choices(content)')
  .eq('sheet_id', sheetId)

console.log(`\n=== ANSWERS FOR SHEET (${answers?.length} total) ===\n`)

// Check which answers point to questions that don't exist
for (const answer of answers || []) {
  const questionExists = questions?.find(q => q.id === answer.parent_question_id)

  if (!questionExists) {
    console.log(`⚠️  Answer ${answer.id} points to NON-EXISTENT question ${answer.parent_question_id}`)

    let value = 'unknown'
    if (answer.choices) value = answer.choices.content
    else if (answer.text_value) value = answer.text_value
    else if (answer.boolean_value !== null) value = answer.boolean_value.toString()

    console.log(`   Value: ${value}`)
    console.log()
  }
}

// Show which questions have answers
console.log('\n=== QUESTIONS WITH ANSWERS ===')
for (const q of questions || []) {
  const answer = answers?.find(a => a.parent_question_id === q.id)
  console.log(`Q${q.order_number}: ${answer ? '✓ HAS ANSWER' : '✗ NO ANSWER'}`)
}
