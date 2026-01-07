import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== FIXING BIOCIDES ANSWER CHOICE IDS ===\n')

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

  // Get all answers for this question
  const { data: answers } = await supabase
    .from('answers')
    .select('id, choice_id, choices(content)')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', question.id)

  if (!answers || answers.length === 0) {
    continue
  }

  console.log(`Q${question.order_number}: ${question.name?.substring(0, 50)}`)
  console.log(`  ${answers.length} answer(s) to check`)

  let fixedCount = 0

  for (const answer of answers) {
    // Check if answer's choice_id exists in current choices
    const choiceExists = currentChoices.find(c => c.id === answer.choice_id)

    if (!choiceExists && answer.choices?.content) {
      // Answer points to deleted choice, find the new choice with same content
      const newChoiceId = contentToId.get(answer.choices.content)

      if (newChoiceId) {
        console.log(`  Fixing answer: "${answer.choices.content}" -> new choice ID`)

        const { error } = await supabase
          .from('answers')
          .update({ choice_id: newChoiceId })
          .eq('id', answer.id)

        if (error) {
          console.log(`    ❌ Error: ${error.message}`)
        } else {
          fixedCount++
          totalFixed++
        }
      } else {
        console.log(`  ⚠️  No matching choice found for "${answer.choices.content}"`)
      }
    }
  }

  if (fixedCount > 0) {
    console.log(`  ✓ Fixed ${fixedCount} answer(s)`)
  }
  console.log()
}

console.log(`\n=== TOTAL: Fixed ${totalFixed} answers ===`)
