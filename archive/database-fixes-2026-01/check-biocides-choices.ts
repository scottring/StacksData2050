import { supabase } from './src/migration/supabase-client.js'

// Get Biocides section
const { data: section } = await supabase
  .from('sections')
  .select('id')
  .ilike('name', '%biocide%')
  .single()

// Get first few questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, question_type, order_number')
  .eq('parent_section_id', section?.id)
  .order('order_number')
  .limit(5)

console.log('=== CHECKING CHOICES FOR BIOCIDES QUESTIONS ===\n')

for (const q of questions || []) {
  console.log(`Question ${q.order_number}: ${q.name?.substring(0, 60)}`)
  console.log(`Type: ${q.question_type}`)

  // Get choices for this question
  const { data: choices } = await supabase
    .from('choices')
    .select('*')
    .eq('question_id', q.id)
    .order('order_number')

  if (choices && choices.length > 0) {
    console.log(`Choices (${choices.length}):`)
    choices.forEach(c => {
      console.log(`  - ${c.name}`)
    })
  } else {
    console.log('  NO CHOICES FOUND!')
  }
  console.log()
}
