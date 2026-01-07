import { supabase } from './src/migration/supabase-client.js'

const duplicateId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'

console.log('=== DELETING DUPLICATE QUESTION COMPLETELY ===\n')

// Get choices for the duplicate question
const { data: duplicateChoices } = await supabase
  .from('choices')
  .select('id, content, order_number')
  .eq('parent_question_id', duplicateId)
  .order('order_number')

console.log(`Found ${duplicateChoices?.length} choices for duplicate question:`)
duplicateChoices?.forEach(c => console.log(`  - ${c.content} (ID: ${c.id})`))

// Get the correct question at order 10
const { data: correctQuestion } = await supabase
  .from('questions')
  .select('id, order_number')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .eq('order_number', 10)
  .single()

console.log(`\nCorrect question ID: ${correctQuestion?.id}`)

// Get choices for the correct question
const { data: correctChoices } = await supabase
  .from('choices')
  .select('id, content, order_number')
  .eq('parent_question_id', correctQuestion?.id)
  .order('order_number')

console.log(`\nFound ${correctChoices?.length} choices for correct question:`)
correctChoices?.forEach(c => console.log(`  - ${c.content} (ID: ${c.id})`))

// For each duplicate choice, find the matching correct choice and migrate answers
console.log('\n=== MIGRATING ANSWERS FROM DUPLICATE CHOICES ===')
for (const dupChoice of duplicateChoices || []) {
  const matchingCorrect = correctChoices?.find(c => c.content === dupChoice.content)

  if (!matchingCorrect) {
    console.log(`⚠️  No match found for "${dupChoice.content}"`)
    continue
  }

  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .eq('choice_id', dupChoice.id)

  if (answers && answers.length > 0) {
    console.log(`Migrating ${answers.length} answers from "${dupChoice.content}" to correct choice`)

    const { error } = await supabase
      .from('answers')
      .update({ choice_id: matchingCorrect.id })
      .eq('choice_id', dupChoice.id)

    if (error) {
      console.error(`  Error: ${error.message}`)
    } else {
      console.log(`  ✓ Migrated`)
    }
  } else {
    console.log(`No answers for "${dupChoice.content}"`)
  }
}

// Now delete choices
console.log('\n=== DELETING DUPLICATE CHOICES ===')
const { error: choiceError } = await supabase
  .from('choices')
  .delete()
  .eq('parent_question_id', duplicateId)

if (choiceError) {
  console.error('Choice deletion error:', choiceError.message)
} else {
  console.log('✓ Deleted choices')
}

// Now delete question
console.log('\n=== DELETING DUPLICATE QUESTION ===')
const { error } = await supabase
  .from('questions')
  .delete()
  .eq('id', duplicateId)

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('✓ Deleted duplicate question')
}

// Verify
const { data: remaining } = await supabase
  .from('questions')
  .select('order_number, name')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

console.log(`\n=== REMAINING BIOCIDES QUESTIONS (${remaining?.length} total) ===`)
remaining?.forEach(q => {
  console.log(`${q.order_number}. ${q.name?.substring(0, 65)}`)
})
