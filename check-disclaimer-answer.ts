import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const questionId = '0a61547e-8aea-454b-88b4-c7753065d861'
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: answer, error } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', questionId)
    .single()

  if (error) {
    console.log('No answer found for disclaimer question')
    console.log('Error:', error.message)
  } else {
    console.log('Answer for question 0a61547e (Add disclaimer):')
    console.log(JSON.stringify(answer, null, 2))
  }
}

main().catch(console.error)
