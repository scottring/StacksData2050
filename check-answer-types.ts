import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, text_value, choice_id, questions!answers_parent_question_id_fkey(name, question_type)')
    .eq('sheet_id', sheetId)
    .limit(10)

  console.log('Sample answers with question types:\n')
  answers?.forEach(a => {
    const q = a.questions as any
    console.log('Question:', q?.name?.substring(0, 60) + '...')
    console.log('Type:', q?.question_type)
    console.log('text_value:', a.text_value)
    console.log('choice_id:', a.choice_id)
    console.log()
  })

  // Count by type
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('choice_id, questions!answers_parent_question_id_fkey(question_type)')
    .eq('sheet_id', sheetId)

  const typeStats = new Map()
  const choiceStats = new Map()

  allAnswers?.forEach(a => {
    const q = a.questions as any
    const type = q?.question_type || 'unknown'
    typeStats.set(type, (typeStats.get(type) || 0) + 1)

    if (type === 'Select one Radio') {
      const hasChoice = a.choice_id ? 'has choice_id' : 'NO choice_id'
      choiceStats.set(hasChoice, (choiceStats.get(hasChoice) || 0) + 1)
    }
  })

  console.log('\n=== Statistics ===')
  console.log('Answers by question type:')
  typeStats.forEach((count, type) => {
    console.log(`  ${type}: ${count}`)
  })

  console.log('\nDropdown answers:')
  choiceStats.forEach((count, status) => {
    console.log(`  ${status}: ${count}`)
  })
}

main().catch(console.error)
