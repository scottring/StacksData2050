import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== CREATING ANSWER FOR Q11 ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, name')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11:', q11?.name?.substring(0, 60))

// Get the "Yes" choice
const { data: choices } = await supabase
  .from('choices')
  .select('id, content')
  .eq('parent_question_id', q11?.id)

console.log(`\nChoices:`)
choices?.forEach(c => console.log(`  ${c.content} (${c.id})`))

const yesChoice = choices?.find(c => c.content === 'Yes')

if (!yesChoice) {
  console.log('\n❌ No "Yes" choice found!')
} else {
  console.log(`\nCreating answer with "Yes" choice: ${yesChoice.id}`)

  const { data: newAnswer, error } = await supabase
    .from('answers')
    .insert({
      sheet_id: sheetId,
      parent_question_id: q11?.id,
      choice_id: yesChoice.id,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.log(`\n❌ Error: ${error.message}`)
  } else {
    console.log(`\n✓ Created answer: ${newAnswer.id}`)
  }
}
