import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('=== Checking Choice Parent IDs for Imported Answers ===\n')

  // Get all dropdown answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, choice_id, text_value')
    .eq('sheet_id', sheetId)
    .not('choice_id', 'is', null)

  console.log(`Total dropdown answers: ${answers?.length}\n`)

  // Check if choice_id references a choice with matching parent_question_id
  let matchCount = 0
  let mismatchCount = 0
  const sampleMismatches: any[] = []

  for (const answer of answers || []) {
    const { data: choice } = await supabase
      .from('choices')
      .select('id, content, parent_question_id')
      .eq('id', answer.choice_id)
      .single()

    if (choice) {
      if (choice.parent_question_id === answer.parent_question_id) {
        matchCount++
      } else {
        mismatchCount++
        if (sampleMismatches.length < 5) {
          sampleMismatches.push({
            answerId: answer.id,
            answerQuestionId: answer.parent_question_id,
            choiceId: choice.id,
            choiceContent: choice.content,
            choiceParentQuestionId: choice.parent_question_id,
            textValue: answer.text_value
          })
        }
      }
    }
  }

  console.log(`Choices with MATCHING parent_question_id: ${matchCount}`)
  console.log(`Choices with MISMATCHED parent_question_id: ${mismatchCount}\n`)

  if (sampleMismatches.length > 0) {
    console.log('Sample mismatches:')
    let i = 1
    for (const m of sampleMismatches) {
      console.log(`\nMismatch ${i}:`)
      console.log(`  Answer ID: ${m.answerId}`)
      console.log(`  Answer question ID: ${m.answerQuestionId}`)
      console.log(`  Choice ID: ${m.choiceId}`)
      console.log(`  Choice content: ${m.choiceContent}`)
      console.log(`  Choice parent_question_id: ${m.choiceParentQuestionId || 'NULL'}`)
      const match = m.choiceParentQuestionId === m.answerQuestionId
      console.log(`  Match: ${match ? 'YES' : 'NO'}`)
      i++
    }
  }
}

main().catch(console.error)
