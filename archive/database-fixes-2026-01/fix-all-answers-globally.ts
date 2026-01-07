import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING ALL BROKEN ANSWERS GLOBALLY ===\n')

// Get all sections
const { data: sections } = await supabase
  .from('sections')
  .select('id, name')
  .order('name')

console.log(`Processing ${sections?.length} sections...\n`)

let totalFixed = 0
let totalQuestions = 0

for (const section of sections || []) {
  console.log(`\n--- ${section.name} ---`)

  // Get all questions in this section
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, order_number')
    .eq('parent_section_id', section.id)
    .order('order_number')

  console.log(`  Questions: ${questions?.length}`)
  totalQuestions += questions?.length || 0

  for (const question of questions || []) {
    // Get current valid choices for this question
    const { data: currentChoices } = await supabase
      .from('choices')
      .select('id, content')
      .eq('parent_question_id', question.id)

    if (!currentChoices || currentChoices.length === 0) {
      continue // No choices for this question
    }

    // Build a map of choice content to current choice ID
    const contentToId = new Map<string, string>()
    currentChoices.forEach(c => {
      if (c.content) {
        contentToId.set(c.content, c.id)
      }
    })

    // Get ALL answers for this question (across all sheets)
    const { data: answers } = await supabase
      .from('answers')
      .select('id, choice_id, choices(content)')
      .eq('parent_question_id', question.id)
      .not('choice_id', 'is', null)

    if (!answers || answers.length === 0) {
      continue
    }

    // Find answers pointing to deleted choices and remap them
    const answerIdsToFix: Array<{ id: string; newChoiceId: string }> = []

    for (const answer of answers) {
      const choiceExists = currentChoices.find(c => c.id === answer.choice_id)

      if (!choiceExists && answer.choices?.content) {
        const newChoiceId = contentToId.get(answer.choices.content)
        if (newChoiceId) {
          answerIdsToFix.push({ id: answer.id, newChoiceId })
        }
      }
    }

    if (answerIdsToFix.length > 0) {
      // Batch update by grouping by newChoiceId
      const byChoiceId = new Map<string, string[]>()
      for (const fix of answerIdsToFix) {
        if (!byChoiceId.has(fix.newChoiceId)) {
          byChoiceId.set(fix.newChoiceId, [])
        }
        byChoiceId.get(fix.newChoiceId)!.push(fix.id)
      }

      for (const [newChoiceId, answerIds] of byChoiceId) {
        const { error } = await supabase
          .from('answers')
          .update({ choice_id: newChoiceId })
          .in('id', answerIds)

        if (error) {
          console.log(`  ❌ Error updating ${answerIds.length} answers: ${error.message}`)
        } else {
          totalFixed += answerIds.length
        }
      }

      console.log(`  ✓ Fixed ${answerIdsToFix.length} answers for Q${question.order_number}`)
    }
  }
}

console.log(`\n=== GLOBAL FIX COMPLETE ===`)
console.log(`Total questions processed: ${totalQuestions}`)
console.log(`Total answers fixed: ${totalFixed}`)
