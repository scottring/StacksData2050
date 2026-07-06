import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Find the disclaimer question
  const { data: q } = await supabase
    .from('questions')
    .select('id, name, response_type')
    .ilike('name', '%disclaimer%')
    .single()

  if (!q) {
    console.log('Disclaimer question not found')
    return
  }

  console.log('Disclaimer question:', q.id)
  console.log('Response type:', q.response_type)

  // Get the choice IDs for this question
  const { data: choices } = await supabase
    .from('choices')
    .select('id, content')
    .eq('question_id', q.id)

  console.log('Choices to remove:', choices?.length || 0)

  if (choices && choices.length > 0) {
    const choiceIds = choices.map(c => c.id)

    // First, update any answers that reference these choices
    // Set choice_id to null and move the value to text_value
    const { data: updatedAnswers, error: updateError } = await supabase
      .from('answers')
      .update({
        choice_id: null,
        text_value: choices[0].content // Store the choice text as the answer
      })
      .in('choice_id', choiceIds)
      .select('id')

    if (updateError) {
      console.log('Error updating answers:', updateError.message)
    } else {
      console.log('Updated answers:', updatedAnswers?.length || 0)
    }

    // Now delete the choices
    const { error: deleteError } = await supabase
      .from('choices')
      .delete()
      .eq('question_id', q.id)

    if (deleteError) {
      console.log('Error deleting choices:', deleteError.message)
    } else {
      console.log('Deleted choices successfully')
    }
  }

  // Verify
  const { data: remaining } = await supabase
    .from('choices')
    .select('id')
    .eq('question_id', q.id)

  console.log('Remaining choices:', remaining?.length || 0)
  console.log('Done! Disclaimer should now render as textarea.')
}

main().catch(console.error)
