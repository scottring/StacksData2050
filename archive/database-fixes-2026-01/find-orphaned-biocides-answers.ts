import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== FINDING ORPHANED BIOCIDES ANSWERS ===\n')

// Get all current Biocides questions
const { data: currentQuestions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log(`Current Biocides questions: ${currentQuestions?.length}`)
const currentIds = new Set(currentQuestions?.map(q => q.id) || [])

// Get all answers for this sheet
const { data: allAnswers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id, text_value, boolean_value, choices(content)')
  .eq('sheet_id', sheetId)

// Find Biocides answers pointing to non-existent questions
const orphaned = []

for (const answer of allAnswers || []) {
  if (!answer.parent_question_id) continue

  // Check if this answer's question exists
  const questionExists = currentIds.has(answer.parent_question_id)

  if (!questionExists) {
    // Check if this was a Biocides question by querying all questions
    const { data: oldQuestion } = await supabase
      .from('questions')
      .select('name, parent_section_id')
      .eq('id', answer.parent_question_id)
      .single()

    if (oldQuestion?.parent_section_id === biocidesSection || !oldQuestion) {
      let value = 'unknown'
      if (answer.choices) value = answer.choices.content
      else if (answer.text_value) value = answer.text_value
      else if (answer.boolean_value !== null) value = answer.boolean_value.toString()

      orphaned.push({
        answerId: answer.id,
        oldQuestionId: answer.parent_question_id,
        questionName: oldQuestion?.name || 'DELETED',
        value
      })
    }
  }
}

console.log(`\nFound ${orphaned.length} orphaned Biocides answers:\n`)

// Group by old question ID
const grouped = new Map<string, typeof orphaned>()
for (const o of orphaned) {
  if (!grouped.has(o.oldQuestionId)) {
    grouped.set(o.oldQuestionId, [])
  }
  grouped.get(o.oldQuestionId)!.push(o)
}

for (const [qId, answers] of grouped) {
  console.log(`Question: ${answers[0].questionName}`)
  console.log(`  Old ID: ${qId}`)
  console.log(`  ${answers.length} orphaned answers`)
  console.log()
}
