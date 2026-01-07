import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819' // Aqurate HA 25 ME 60%

console.log('=== CHECKING BIOCIDES ANSWERS ===\n')

// Get all Biocides questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, dependent_no_show')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

// Get answers for this sheet
const { data: answers } = await supabase
  .from('answers')
  .select('*, choices(*)')
  .eq('sheet_id', sheetId)
  .in('parent_question_id', questions?.map(q => q.id) || [])

console.log('Questions with answers:\n')

for (const q of questions || []) {
  const answer = answers?.find(a => a.parent_question_id === q.id)

  console.log(`Q${q.order_number} (${q.dependent_no_show ? 'DEPENDENT' : 'independent'}): ${q.name?.substring(0, 60)}`)

  if (answer) {
    if (answer.choice_id && answer.choices) {
      console.log(`  Answer: ${answer.choices.content}`)
    } else if (answer.text_value) {
      console.log(`  Answer: ${answer.text_value}`)
    } else if (answer.boolean_value !== null) {
      console.log(`  Answer: ${answer.boolean_value}`)
    } else {
      console.log(`  Answer: (has answer but no clear value)`)
    }
  } else {
    console.log(`  Answer: NO ANSWER`)
  }
  console.log()
}
