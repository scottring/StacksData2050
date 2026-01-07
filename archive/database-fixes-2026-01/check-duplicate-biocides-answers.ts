import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== CHECKING FOR DUPLICATE BIOCIDES ANSWERS ===\n')

// Get all Biocides questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log(`Found ${questions?.length} Biocides questions\n`)

// For each question, check if there are multiple answers
for (const q of questions || []) {
  const { data: answers } = await supabase
    .from('answers')
    .select('id, created_at, modified_at, choice_id, text_value, boolean_value, choices(content)')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', q.id)
    .order('modified_at', { ascending: false })

  if (answers && answers.length > 0) {
    console.log(`Q${q.order_number}: ${q.name?.substring(0, 50)}`)
    console.log(`  ${answers.length} answer(s)`)

    answers.forEach((a, idx) => {
      let value = 'unknown'
      if (a.choices) value = a.choices.content
      else if (a.text_value) value = a.text_value
      else if (a.boolean_value !== null) value = a.boolean_value.toString()

      console.log(`  [${idx}] ${value} (modified: ${a.modified_at})`)
    })
    console.log()
  }
}
