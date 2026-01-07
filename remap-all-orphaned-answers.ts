import { supabase } from './src/migration/supabase-client.js'

console.log('=== REMAPPING ALL ORPHANED ANSWERS ===\n')

// The orphaned choice IDs and their content
const orphanedChoices = {
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43': 'Yes',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72': 'No',
  '513d4977-f90c-4472-9f99-5e28fef3c82d': 'not assessed'
}

let totalFixed = 0
let totalSkipped = 0

for (const [orphanedChoiceId, content] of Object.entries(orphanedChoices)) {
  console.log(`\n--- Processing "${content}" (${orphanedChoiceId}) ---`)

  // Get ALL answers using this orphaned choice (no limit)
  let allAnswers: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id, parent_question_id')
      .eq('choice_id', orphanedChoiceId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!answers || answers.length === 0) break

    allAnswers = allAnswers.concat(answers)
    page++

    if (answers.length < pageSize) break // Last page
  }

  console.log(`Found ${allAnswers.length} total answers using this orphaned choice`)

  // Group by parent_question_id
  const byQuestion = new Map<string, string[]>()
  allAnswers.forEach(a => {
    if (a.parent_question_id) {
      if (!byQuestion.has(a.parent_question_id)) {
        byQuestion.set(a.parent_question_id, [])
      }
      byQuestion.get(a.parent_question_id)!.push(a.id)
    }
  })

  console.log(`Spread across ${byQuestion.size} questions`)

  // For each question, find the correct choice and update all answers
  let fixedForThisContent = 0
  let skippedForThisContent = 0

  for (const [questionId, answerIds] of byQuestion) {
    // Find the correct choice for this question with matching content
    const { data: correctChoice } = await supabase
      .from('choices')
      .select('id')
      .eq('parent_question_id', questionId)
      .ilike('content', content) // Case-insensitive match
      .maybeSingle()

    if (correctChoice) {
      // Update in batches of 100 to avoid "Bad Request" errors
      const batchSize = 100
      for (let i = 0; i < answerIds.length; i += batchSize) {
        const batch = answerIds.slice(i, i + batchSize)

        const { error } = await supabase
          .from('answers')
          .update({ choice_id: correctChoice.id })
          .in('id', batch)

        if (error) {
          console.log(`  ❌ Error updating batch: ${error.message}`)
        } else {
          fixedForThisContent += batch.length
        }
      }

      if (answerIds.length > 0) {
        console.log(`  ✓ Fixed ${answerIds.length} answers for question ${questionId}`)
      }
    } else {
      skippedForThisContent += answerIds.length
      console.log(`  ⚠️  No choice with content "${content}" for question ${questionId} (${answerIds.length} answers)`)
    }
  }

  console.log(`\nFixed for "${content}": ${fixedForThisContent}`)
  console.log(`Skipped (no matching choice): ${skippedForThisContent}`)

  totalFixed += fixedForThisContent
  totalSkipped += skippedForThisContent
}

console.log(`\n\n=== REMAP COMPLETE ===`)
console.log(`Total answers fixed: ${totalFixed}`)
console.log(`Total answers skipped: ${totalSkipped}`)
console.log(`\nSkipped answers need their choices created first.`)
