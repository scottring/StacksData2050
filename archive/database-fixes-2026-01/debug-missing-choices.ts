import { supabase } from './src/migration/supabase-client.js'

console.log('=== DEBUGGING MISSING CHOICES ===\n')

// Pick one question that had orphaned answers
// From the remap output: c7364e6f-5148-422f-8531-cb43d53f3d93 had 260 Yes answers, 42 No answers, 817 not assessed answers

const testQuestionId = 'c7364e6f-5148-422f-8531-cb43d53f3d93'

console.log(`Investigating question: ${testQuestionId}\n`)

// Get question details
const { data: question } = await supabase
  .from('questions')
  .select('id, name, order_number, parent_section_id, sections(name)')
  .eq('id', testQuestionId)
  .single()

console.log(`Question: ${question?.name}`)
console.log(`Section: ${(question as any)?.sections?.name}`)
console.log(`Order: ${question?.order_number}\n`)

// Get all choices for this question
const { data: choices } = await supabase
  .from('choices')
  .select('id, content')
  .eq('parent_question_id', testQuestionId)

console.log(`Existing choices (${choices?.length}):`)
choices?.forEach(c => {
  console.log(`  "${c.content}" (${c.id})`)
  console.log(`    Lowercase: "${c.content?.toLowerCase()}"`)
  console.log(`    Length: ${c.content?.length}`)
})

// Check if any match "Yes", "No", "not assessed"
const hasYes = choices?.some(c => c.content?.toLowerCase() === 'yes')
const hasNo = choices?.some(c => c.content?.toLowerCase() === 'no')
const hasNotAssessed = choices?.some(c => c.content?.toLowerCase() === 'not assessed')

console.log(`\nHas "yes": ${hasYes}`)
console.log(`Has "no": ${hasNo}`)
console.log(`Has "not assessed": ${hasNotAssessed}`)

// Get answers for this question
const { data: answers } = await supabase
  .from('answers')
  .select('choice_id, choices(content)')
  .eq('parent_question_id', testQuestionId)
  .limit(10)

console.log(`\nSample answers (${answers?.length}):`)
answers?.forEach(a => {
  console.log(`  Choice ID: ${a.choice_id}`)
  console.log(`  Content: "${a.choices?.content}"`)
})
