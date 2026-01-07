import { supabase } from './src/migration/supabase-client.js'

console.log('=== ADDING BIOCIDES CHOICES MANUALLY (from screenshot verification) ===\n')

// Get Biocides questions without choices
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, question_type')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

const { data: existingChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

const questionsWithChoices = new Set(existingChoices?.map(c => c.parent_question_id))

const needsChoices = questions?.filter(q =>
  !questionsWithChoices.has(q.id) &&
  (q.question_type === 'Select one Radio' || q.question_type === 'Dropdown')
) || []

console.log(`Adding Yes/No/Not assessed choices for ${needsChoices.length} Biocides questions:\n`)

const choicesToInsert: any[] = []

for (const q of needsChoices) {
  console.log(`  Order ${q.order_number}: ${q.name?.substring(0, 60)}`)

  const standardChoices = [
    { content: 'Yes', order: 1 },
    { content: 'No', order: 2 },
    { content: 'Not assessed', order: 3 }
  ]

  standardChoices.forEach(choice => {
    choicesToInsert.push({
      content: choice.content,
      parent_question_id: q.id,
      order_number: choice.order,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    })
  })
}

console.log(`\nInserting ${choicesToInsert.length} choices...`)

const { error } = await supabase
  .from('choices')
  .insert(choicesToInsert)

if (error) {
  console.error(`Error: ${error.message}`)
} else {
  console.log(`✓ Successfully inserted ${choicesToInsert.length} choices`)
}

// Verify
const { count } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`\nFinal choice count: ${count}`)
