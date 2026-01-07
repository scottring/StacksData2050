import { supabase } from './src/migration/supabase-client.js'

const duplicateId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'

console.log('=== DELETING DUPLICATE QUESTION COMPLETELY ===\n')

// Delete choices first
const { data: choices } = await supabase
  .from('choices')
  .select('id')
  .eq('parent_question_id', duplicateId)

console.log(`Deleting ${choices?.length} choices...`)

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
console.log('\nDeleting question...')
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
