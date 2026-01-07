import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== CURRENT BIOCIDES ANSWERS FOR SHEET ===\n')

// Get current Biocides questions with their answers
const { data: questions } = await supabase
  .from('questions')
  .select(`
    id,
    order_number,
    name,
    answers!inner(
      id,
      choice_id,
      text_value,
      boolean_value,
      choices(content)
    )
  `)
  .eq('parent_section_id', biocidesSection)
  .eq('answers.sheet_id', sheetId)
  .order('order_number')

console.log(`Questions WITH answers: ${questions?.length || 0}\n`)

questions?.forEach(q => {
  const answer = q.answers?.[0]
  let value = '(no value)'
  if (answer) {
    if (answer.choices) value = answer.choices.content
    else if (answer.text_value) value = answer.text_value
    else if (answer.boolean_value !== null) value = answer.boolean_value.toString()
  }

  console.log(`Q${q.order_number}: ${q.name?.substring(0, 60)}`)
  console.log(`  Answer: ${value}`)
  console.log()
})

// Also check for questions WITHOUT answers
const { data: allQuestions } = await supabase
  .from('questions')
  .select('id, order_number, name')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

const questionsWithAnswers = new Set(questions?.map(q => q.id) || [])

const questionsWithoutAnswers = allQuestions?.filter(q => !questionsWithAnswers.has(q.id))

console.log(`\n=== Questions WITHOUT answers: ${questionsWithoutAnswers?.length || 0} ===\n`)
questionsWithoutAnswers?.forEach(q => {
  console.log(`Q${q.order_number}: ${q.name?.substring(0, 60)}`)
})
