import { supabase } from './src/migration/supabase-client.js'

async function checkQuestion() {
  const questionId = '189b0699-2d41-4dc4-90fa-b42bc4347f9b'

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle()

  if (question) {
    console.log('Question found:')
    console.log(JSON.stringify(question, null, 2))
  } else {
    console.log('Question not found')
  }
}

checkQuestion()
