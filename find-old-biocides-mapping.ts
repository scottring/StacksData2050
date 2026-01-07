import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== FINDING OLD BIOCIDES QUESTION MAPPING ===\n')

// Get current questions
const { data: currentQuestions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

// Get all answers for this sheet
const { data: answers } = await supabase
  .from('answers')
  .select('parent_question_id, choice_id, text_value, boolean_value, choices(content)')
  .eq('sheet_id', sheetId)

// Group answers by question ID
const answersByQuestion = new Map()
for (const answer of answers || []) {
  if (!answer.parent_question_id) continue

  if (!answersByQuestion.has(answer.parent_question_id)) {
    answersByQuestion.set(answer.parent_question_id, [])
  }

  let value = 'unknown'
  if (answer.choices) value = answer.choices.content
  else if (answer.text_value) value = answer.text_value
  else if (answer.boolean_value !== null) value = answer.boolean_value.toString()

  answersByQuestion.get(answer.parent_question_id).push(value)
}

console.log(`Found ${answersByQuestion.size} unique question IDs with answers\n`)

// For each old question ID, try to find what it was
const oldQuestionIds = Array.from(answersByQuestion.keys())

console.log('Checking old question IDs...\n')

const mappings = []

for (const oldId of oldQuestionIds) {
  // Try to find this question in the database
  const { data: oldQ } = await supabase
    .from('questions')
    .select('name, bubble_id, order_number, parent_section_id, sections(name)')
    .eq('id', oldId)
    .single()

  if (oldQ && oldQ.sections?.name === 'Biocides') {
    console.log(`OLD Biocides Question:`)
    console.log(`  ID: ${oldId.substring(0, 12)}...`)
    console.log(`  Name: ${oldQ.name?.substring(0, 60)}`)
    console.log(`  Bubble ID: ${oldQ.bubble_id}`)
    console.log(`  Order: ${oldQ.order_number}`)

    // Try to find matching current question by bubble_id
    const match = currentQuestions?.find(q => q.bubble_id === oldQ.bubble_id)

    if (match) {
      console.log(`  → MATCHES current Q${match.order_number}: ${match.id.substring(0, 12)}...`)
      mappings.push({
        oldId,
        newId: match.id,
        name: oldQ.name,
        bubble_id: oldQ.bubble_id,
        answerCount: answersByQuestion.get(oldId).length
      })
    } else {
      console.log(`  → NO MATCH FOUND`)
    }
    console.log()
  }
}

console.log(`\n=== MIGRATION MAPPINGS (${mappings.length}) ===\n`)
mappings.forEach(m => {
  console.log(`${m.oldId} → ${m.newId} (${m.answerCount} answers)`)
  console.log(`  ${m.name?.substring(0, 60)}`)
  console.log()
})
