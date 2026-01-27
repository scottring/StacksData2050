import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  // Get answers with dropdown questions
  const { data: answers } = await supabase
    .from('answers')
    .select('text_value, parent_question_id, questions!answers_parent_question_id_fkey(name, question_type)')
    .eq('sheet_id', sheetId)

  const dropdownAnswers = answers?.filter(a => {
    const q = a.questions as any
    return q?.question_type === 'Select one Radio'
  })

  console.log(`Found ${dropdownAnswers?.length} dropdown answers\n`)

  // Get unique answer values
  const uniqueValues = new Set(dropdownAnswers?.map(a => a.text_value))
  console.log('Unique Excel answer values for dropdowns:')
  Array.from(uniqueValues).sort().forEach(val => console.log(`  - "${val}"`))

  // Check a sample question's choices
  const sampleQuestionId = dropdownAnswers?.[0]?.parent_question_id
  if (sampleQuestionId) {
    const { data: choices } = await supabase
      .from('choices')
      .select('content')
      .eq('parent_question_id', sampleQuestionId)

    console.log(`\nSample question choices (${(dropdownAnswers?.[0]?.questions as any)?.name?.substring(0, 60)}...):`)
    choices?.forEach(c => console.log(`  - "${c.content}"`))
  }
}

main().catch(console.error)
