import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

// Get Q1
const { data: q1 } = await supabase
  .from('questions')
  .select('id, name, order_number, question_type')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 1)
  .single()

console.log('Q1:', q1?.name)
console.log('Type:', q1?.question_type)

// Get choices
const { data: choices } = await supabase
  .from('choices')
  .select('id, content')
  .eq('parent_question_id', q1?.id)

console.log(`\nChoices (${choices?.length}):`)
choices?.forEach(c => console.log(`  ${c.content} (${c.id})`))

// Get answers
const { data: answers } = await supabase
  .from('answers')
  .select('id, choice_id, modified_at, choices(content)')
  .eq('sheet_id', sheetId)
  .eq('parent_question_id', q1?.id)
  .order('modified_at', { ascending: false })
  .limit(1)

console.log(`\nMost recent answer:`)
if (answers && answers.length > 0) {
  const a = answers[0]
  console.log(`  ${a.choices?.content} (${a.modified_at})`)
  console.log(`  choice_id: ${a.choice_id}`)

  const matchesChoice = choices?.find(c => c.id === a.choice_id)
  console.log(`  Matches current choices: ${matchesChoice ? 'YES' : 'NO'}`)
}
