import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

// Get Q11 (order 11)
const { data: q11 } = await supabase
  .from('questions')
  .select('id, name, order_number, question_type')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11:', q11?.name)
console.log('Type:', q11?.question_type)

// Get choices
const { data: choices } = await supabase
  .from('choices')
  .select('id, content, order_number')
  .eq('parent_question_id', q11?.id)
  .order('order_number')

console.log(`\nChoices (${choices?.length}):`)
choices?.forEach(c => console.log(`  ${c.content} (${c.id})`))

// Get ALL answers for this question
const { data: answers } = await supabase
  .from('answers')
  .select('id, choice_id, created_at, modified_at, choices(content)')
  .eq('sheet_id', sheetId)
  .eq('parent_question_id', q11?.id)
  .order('modified_at', { ascending: false })

console.log(`\nAll answers (${answers?.length}):`)
answers?.forEach((a, idx) => {
  console.log(`[${idx}] ${a.choices?.content || 'NO CONTENT'} (modified: ${a.modified_at})`)
  console.log(`    choice_id: ${a.choice_id}`)

  const matchesChoice = choices?.find(c => c.id === a.choice_id)
  if (!matchesChoice && a.choice_id) {
    console.log(`    ⚠️  choice_id doesn't match any current choices!`)
  }
})

if (answers && answers.length > 0) {
  const latest = answers[0]
  console.log(`\nMost recent should be: ${latest.choices?.content}`)
  console.log(`Modified: ${latest.modified_at}`)
}
