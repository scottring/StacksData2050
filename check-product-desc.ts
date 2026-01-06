import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

// Get Product Description question
const { data: question } = await supabase
  .from('questions')
  .select('*')
  .ilike('name', '%Product Description%')
  .single()

console.log('=== QUESTION ===')
console.log(`Name: ${question?.name}`)
console.log(`ID: ${question?.id}`)

if (question) {
  const { data: answer } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', question.id)
    .single()

  console.log('\n=== ANSWER ===')
  if (answer) {
    console.log(`Text value: ${answer.text_value || answer.text_area_value}`)
    console.log(`Clarification: ${answer.clarification}`)
    console.log(`Custom comment: ${answer.custom_comment_text}`)
    console.log(`Support text: ${answer.support_text}`)
  } else {
    console.log('No answer found')
  }
}
