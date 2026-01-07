import { supabase } from './src/migration/supabase-client.js'

console.log('=== MIGRATING ANSWERS FROM DUPLICATE TO CORRECT QUESTION ===\n')

// The duplicate at order 4
const duplicateId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'

// Find the correct question (order 10, similar name about Article 95)
const { data: correctQuestion } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .eq('order_number', 10)
  .single()

console.log('Migrating FROM (duplicate at order 4):')
console.log('  ID:', duplicateId)

console.log('\nMigrating TO (correct question at order 10):')
console.log('  ID:', correctQuestion?.id)
console.log('  Name:', correctQuestion?.name)

// Count answers
const { count } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .eq('parent_question_id', duplicateId)

console.log(`\nMigrating ${count} answers...`)

const { error } = await supabase
  .from('answers')
  .update({ parent_question_id: correctQuestion?.id })
  .eq('parent_question_id', duplicateId)

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('✓ Migrated all answers')

  // Now delete the duplicate question
  console.log('\nDeleting duplicate question...')

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('id', duplicateId)

  if (deleteError) {
    console.error('Delete error:', deleteError.message)
  } else {
    console.log('✓ Deleted duplicate question')
  }
}

// Verify
const { data: remaining } = await supabase
  .from('questions')
  .select('order_number, name')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

console.log('\n=== FINAL BIOCIDES QUESTIONS ===')
remaining?.forEach(q => {
  console.log(`${q.order_number}. ${q.name?.substring(0, 65)}`)
})
