import { supabase } from './src/migration/supabase-client.js'

// Get the "If yes, please specify" question (order 2)
const { data: question } = await supabase
  .from('questions')
  .select('*')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .eq('order_number', 2)
  .single()

console.log('Question:', question?.name)
console.log('Order:', question?.order_number)
console.log('Type:', question?.question_type)
console.log('\nDependency fields:')
console.log('  parent_choice_id:', question?.parent_choice_id)
console.log('  dependent_no_show:', question?.dependent_no_show)

// Check if there's a parent_choice_id that links to question 1
if (question?.parent_choice_id) {
  const { data: parentChoice } = await supabase
    .from('choices')
    .select('*, questions!inner(*)')
    .eq('id', question.parent_choice_id)
    .single()

  console.log('\nParent choice:', parentChoice?.content)
  console.log('Parent question:', parentChoice?.questions?.name)
}

// Get question 1 for comparison
const { data: q1 } = await supabase
  .from('questions')
  .select('id, name')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .eq('order_number', 1)
  .single()

console.log('\nQuestion 1 (potential parent):', q1?.name)
console.log('Question 1 ID:', q1?.id)
