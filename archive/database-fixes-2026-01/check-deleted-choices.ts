import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING DELETED CHOICES ===\n')

// Get a sample of broken choice IDs
const brokenChoiceIds = [
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72',
  '513d4977-f90c-4472-9f99-5e28fef3c82d'
]

console.log('Checking if these deleted choice IDs still exist in choices table...\n')

for (const choiceId of brokenChoiceIds) {
  const { data: choice, error } = await supabase
    .from('choices')
    .select('id, content, parent_question_id')
    .eq('id', choiceId)
    .maybeSingle()

  if (choice) {
    console.log(`✓ ${choiceId}: "${choice.content}"`)
  } else {
    console.log(`❌ ${choiceId}: DELETED (${error?.message || 'not found'})`)
  }
}

// Check if we can get the content from the answers table using the join
console.log('\n=== CHECKING IF ANSWERS HAVE CHOICE CONTENT ===\n')

const { data: sampleAnswers } = await supabase
  .from('answers')
  .select('id, choice_id, choices(content)')
  .in('choice_id', brokenChoiceIds)
  .limit(10)

console.log(`Sample answers with deleted choice_ids:`)
sampleAnswers?.forEach(a => {
  console.log(`  Choice ID: ${a.choice_id}`)
  console.log(`  Content from join: ${a.choices?.content || 'NULL'}`)
})

// The issue is that when we deleted the choices, the join returns null
// We need a different strategy - check the audit log or find another way
console.log('\n=== ALTERNATIVE: CHECK IF DUPLICATE CLEANUP LOG EXISTS ===')
console.log('We need to find what content these deleted choices had before deletion.')
console.log('These were deleted during the duplicate cleanup process.')
