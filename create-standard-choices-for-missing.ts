import { supabase } from './src/migration/supabase-client.js'

// Get questions that should have choices but don't
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, question_type')

const { data: allChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

const questionsWithChoices = new Set(allChoices?.map(c => c.parent_question_id))

const shouldHaveChoices = ['Select one Radio', 'Select one', 'dropdown', 'Dropdown']
const missingChoices = questions?.filter(q =>
  shouldHaveChoices.includes(q.question_type || '') &&
  !questionsWithChoices.has(q.id)
) || []

console.log(`=== CREATING STANDARD CHOICES FOR ${missingChoices.length} QUESTIONS ===\n`)

const choicesToInsert: any[] = []

for (const q of missingChoices) {
  console.log(`Adding choices for: ${q.name?.substring(0, 70)}`)

  // Standard choices: Yes, No, Not assessed
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

console.log(`\nTotal choices to insert: ${choicesToInsert.length}`)
console.log(`\nInserting choices...`)

const { data, error } = await supabase
  .from('choices')
  .insert(choicesToInsert)

if (error) {
  console.error(`Error: ${error.message}`)
} else {
  console.log(`✓ Successfully inserted ${choicesToInsert.length} choices!`)
}

// Verify
const { count: finalCount } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`\nFinal total choices in database: ${finalCount}`)
