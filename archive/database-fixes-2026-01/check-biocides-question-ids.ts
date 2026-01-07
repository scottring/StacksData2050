import { supabase } from './src/migration/supabase-client.js'

// Get first Biocides question
const { data: question } = await supabase
  .from('questions')
  .select('id, bubble_id, name')
  .ilike('name', '%528/2012%')
  .single()

console.log('Question:', question?.name)
console.log('Supabase ID:', question?.id)
console.log('Bubble ID:', question?.bubble_id)

// Check for choices
const { data: choices } = await supabase
  .from('choices')
  .select('*')
  .eq('parent_question_id', question?.id)

console.log('\nChoices found:', choices?.length || 0)
choices?.forEach(c => {
  console.log(`  - ${c.content}`)
})
