import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING ANSWERS WITH ORPHANED CHOICES ===\n')

const orphanedChoices = {
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43': 'Yes',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72': 'No',
  '513d4977-f90c-4472-9f99-5e28fef3c82d': 'not assessed'
}

let totalFixed = 0

for (const [orphanedChoiceId, content] of Object.entries(orphanedChoices)) {
  console.log(`\n--- Processing "${content}" (${orphanedChoiceId}) ---`)

  // Get all answers using this orphaned choice
  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, sheet_id')
    .eq('choice_id', orphanedChoiceId)

  console.log(`Found ${answers?.length} answers using this orphaned choice`)

  if (!answers || answers.length === 0) continue

  // Group answers by their parent_question_id
  const byQuestion = new Map<string, string[]>()
  answers.forEach(a => {
    if (a.parent_question_id) {
      if (!byQuestion.has(a.parent_question_id)) {
        byQuestion.set(a.parent_question_id, [])
      }
      byQuestion.get(a.parent_question_id)!.push(a.id)
    }
  })

  console.log(`Answers spread across ${byQuestion.size} different questions`)

  // For each question, find the correct choice with matching content
  let fixedForThisChoice = 0
  for (const [questionId, answerIds] of byQuestion) {
    // Find the correct choice for this question with matching content
    const { data: correctChoice } = await supabase
      .from('choices')
      .select('id, content')
      .eq('parent_question_id', questionId)
      .eq('content', content)
      .maybeSingle()

    if (correctChoice) {
      // Update all answers for this question to use the correct choice
      const { error } = await supabase
        .from('answers')
        .update({ choice_id: correctChoice.id })
        .in('id', answerIds)

      if (error) {
        console.log(`  ❌ Error updating ${answerIds.length} answers for question ${questionId}: ${error.message}`)
      } else {
        fixedForThisChoice += answerIds.length
        if (fixedForThisChoice % 1000 === 0 || fixedForThisChoice <= 100) {
          console.log(`  ✓ Fixed ${answerIds.length} answers for question ${questionId}`)
        }
      }
    } else {
      console.log(`  ⚠️  No choice with content "${content}" found for question ${questionId} (${answerIds.length} answers affected)`)
    }
  }

  console.log(`Total fixed for "${content}": ${fixedForThisChoice}`)
  totalFixed += fixedForThisChoice
}

console.log(`\n=== FIX COMPLETE ===`)
console.log(`Total answers fixed: ${totalFixed}`)
