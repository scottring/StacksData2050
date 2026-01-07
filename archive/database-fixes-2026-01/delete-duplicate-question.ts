import { supabase } from './src/migration/supabase-client.js'

console.log('=== DELETING DUPLICATE QUESTION AT ORDER 4 ===\n')

const questionBubbleId = '1621986483500x603202081932705800'

// First, check if there are any answers for this question
const { data: question } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('bubble_id', questionBubbleId)
  .single()

console.log('Question to delete:')
console.log('  Name:', question?.name)
console.log('  Order:', question?.order_number)
console.log('  ID:', question?.id)

const { count: answerCount } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .eq('parent_question_id', question?.id)

console.log(`  Answers: ${answerCount}`)

if (answerCount && answerCount > 0) {
  console.log('\n⚠️  WARNING: This question has answers! Need to migrate them to the correct question.')
  console.log('Not deleting yet - need to identify the correct question first.')
} else {
  console.log('\nNo answers found, safe to delete.')

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', question?.id)

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('✓ Deleted question')
  }
}

// Show remaining Biocides questions
const { data: remaining } = await supabase
  .from('questions')
  .select('order_number, name')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

console.log('\n=== REMAINING BIOCIDES QUESTIONS ===')
remaining?.forEach(q => {
  console.log(`${q.order_number}. ${q.name?.substring(0, 70)}`)
})
