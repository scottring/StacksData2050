import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== DEBUGGING WHY ANSWERS DON\'T SHOW ===\n')

// Get Q3 (3.1.2 - "Are biocidal active substances used for in-can preservation PT 6?")
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, question_type')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 3)
  .single()

console.log('Question 3.1.2:')
console.log(`  ID: ${questions?.id}`)
console.log(`  Type: ${questions?.question_type}`)
console.log(`  Name: ${questions?.name}`)

// Get all answers for this question
const { data: allAnswers } = await supabase
  .from('answers')
  .select('id, created_at, modified_at, choice_id, text_value, boolean_value, choices(id, content)')
  .eq('sheet_id', sheetId)
  .eq('parent_question_id', questions?.id)
  .order('modified_at', { ascending: false })

console.log(`\nAll answers for Q3 (${allAnswers?.length} total):`)
allAnswers?.forEach((a, idx) => {
  console.log(`[${idx}] Modified: ${a.modified_at}`)
  console.log(`    choice_id: ${a.choice_id}`)
  console.log(`    choice content: ${a.choices?.content}`)
  console.log(`    text_value: ${a.text_value}`)
  console.log(`    boolean_value: ${a.boolean_value}`)
  console.log()
})

// Check which one SHOULD be shown (most recent modified_at)
if (allAnswers && allAnswers.length > 0) {
  const latest = allAnswers[0]
  console.log('SHOULD SHOW:')
  console.log(`  Choice: ${latest.choices?.content}`)
  console.log(`  Modified: ${latest.modified_at}`)
}

// Get the choices for this question
const { data: choices } = await supabase
  .from('choices')
  .select('id, content, order_number')
  .eq('parent_question_id', questions?.id)
  .order('order_number')

console.log(`\nAvailable choices for Q3 (${choices?.length} total):`)
choices?.forEach(c => {
  console.log(`  ${c.content} (ID: ${c.id})`)
})

// Check if the answer's choice_id matches any of the available choices
if (allAnswers && allAnswers.length > 0) {
  const latest = allAnswers[0]
  const matchingChoice = choices?.find(c => c.id === latest.choice_id)

  console.log(`\nDoes latest answer's choice_id match available choices? ${matchingChoice ? 'YES' : 'NO'}`)
  if (!matchingChoice && latest.choice_id) {
    console.log(`  ⚠️  Answer points to choice ${latest.choice_id} which doesn't exist in choices table!`)
  }
}
