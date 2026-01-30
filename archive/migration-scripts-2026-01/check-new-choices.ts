import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  // Get a sample dropdown answer with choice_id
  const { data: answers } = await supabase
    .from('answers')
    .select('id, choice_id, text_value, parent_question_id, questions!answers_parent_question_id_fkey(name, question_type)')
    .eq('sheet_id', sheetId)
    .not('choice_id', 'is', null)
    .limit(5)

  console.log('Sample dropdown answers with choice_id:\n')

  for (const answer of answers || []) {
    const q = answer.questions as any
    console.log(`Question: ${q?.name?.substring(0, 60)}...`)
    console.log(`  Answer text_value: "${answer.text_value}"`)
    console.log(`  Answer choice_id: ${answer.choice_id}`)

    // Look up the choice
    const { data: choice } = await supabase
      .from('choices')
      .select('id, content, parent_question_id')
      .eq('id', answer.choice_id)
      .single()

    if (choice) {
      console.log(`  Choice content: "${choice.content}"`)
      console.log(`  Choice parent_question_id: ${choice.parent_question_id}`)
      console.log(`  Match: ${choice.parent_question_id === answer.parent_question_id ? '✓' : '✗ MISMATCH!'}`)
    } else {
      console.log(`  ✗ CHOICE NOT FOUND!`)
    }
    console.log()
  }

  // Check how many choices exist for a sample question
  const sampleQuestionId = answers?.[0]?.parent_question_id
  if (sampleQuestionId) {
    const { data: allChoices } = await supabase
      .from('choices')
      .select('id, content')
      .eq('parent_question_id', sampleQuestionId)

    console.log(`All choices for question ${sampleQuestionId}:`)
    allChoices?.forEach(c => console.log(`  - "${c.content}"`))
  }
}

main().catch(console.error)
