import { supabase } from './src/migration/supabase-client.js'

// Simulate what the page does
const { data: questions } = await supabase
  .from('questions')
  .select('*')
  .ilike('name', '%528/2012%')

const { data: allChoices } = await supabase
  .from('choices')
  .select('*')
  .order('order_number')

console.log('Question found:', questions?.[0]?.name)
console.log('Question ID:', questions?.[0]?.id)
console.log('\nTotal choices in DB:', allChoices?.length)

// Filter choices like the component does
const questionChoices = allChoices
  ?.filter(c => c.parent_question_id === questions?.[0]?.id)
  .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))

console.log('\nFiltered choices for this question:', questionChoices?.length)
questionChoices?.forEach((c, idx) => {
  console.log(`${idx + 1}. ${c.content} (order: ${c.order_number})`)
})
