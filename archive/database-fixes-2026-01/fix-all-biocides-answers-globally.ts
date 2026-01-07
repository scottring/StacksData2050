import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== FIXING ALL BIOCIDES ANSWERS GLOBALLY ===\n')

// Get all Biocides questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log(`Found ${questions?.length} Biocides questions\n`)

let totalFixed = 0

for (const question of questions || []) {
  // Get current choices for this question
  const { data: currentChoices } = await supabase
    .from('choices')
    .select('id, content')
    .eq('parent_question_id', question.id)

  if (!currentChoices || currentChoices.length === 0) {
    console.log(`Q${question.order_number}: No choices, skipping`)
    continue
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

  console.log(`Q${question.order_number}: ${question.name?.substring(0, 50)}`)
  console.log(`  ${answers.length} answer(s) to check`)

  let fixedCount = 0
  const answerIdsToFix = []

  for (const answer of answers) {
    // Check if answer's choice_id exists in current choices
    const choiceExists = currentChoices.find(c => c.id === answer.choice_id)

    if (!choiceExists && answer.choices?.content) {
      // Answer points to deleted choice, find the new choice with same content
      const newChoiceId = contentToId.get(answer.choices.content)

      if (newChoiceId) {
        answerIdsToFix.push({ id: answer.id, newChoiceId, content: answer.choices.content })
      }
    }
  }

  if (answerIdsToFix.length > 0) {
    console.log(`  Fixing ${answerIdsToFix.length} answers...`)

    // Batch update - group by newChoiceId for efficiency
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
        console.log(`    ❌ Error: ${error.message}`)
      } else {
        fixedCount += answerIds.length
        totalFixed += answerIds.length
      }
    }

    console.log(`  ✓ Fixed ${fixedCount} answer(s)`)
  }
  console.log()
}

console.log(`\n=== TOTAL: Fixed ${totalFixed} answers across ALL sheets ===`)
