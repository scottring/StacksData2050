import { supabase } from './src/migration/supabase-client.js'

// Get questions that should have choices but don't
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, question_type')

const { data: allChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

const questionsWithChoices = new Set(allChoices?.map(c => c.parent_question_id))

const shouldHaveChoices = ['Select one Radio', 'Select one', 'dropdown', 'Dropdown']
const missingChoices = questions?.filter(q =>
  shouldHaveChoices.includes(q.question_type || '') &&
  !questionsWithChoices.has(q.id)
) || []

console.log(`Found ${missingChoices.length} questions missing choices\n`)

// Check how many answers exist for these questions
console.log('=== CHECKING IF THESE QUESTIONS ARE ACTUALLY USED ===\n')

let usedCount = 0
let unusedCount = 0
let totalAnswers = 0

for (const q of missingChoices.slice(0, 20)) { // Sample first 20
  const { count } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('parent_question_id', q.id)

  if (count && count > 0) {
    usedCount++
    totalAnswers += count
    console.log(`✓ USED (${count} answers): ${q.name?.substring(0, 70)}`)
  } else {
    unusedCount++
  }
}

console.log(`\n=== SUMMARY (first 20 questions) ===`)
console.log(`Used in sheets: ${usedCount}`)
console.log(`Not used: ${unusedCount}`)
console.log(`Total answers needing choices: ${totalAnswers}`)
