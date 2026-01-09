import { supabase } from './src/migration/supabase-client.js'

async function investigateQuestionsTable() {
  console.log('=== Investigating Questions Table ===\n')

  // Check if table exists and has any data
  const { data: questions, error, count } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .limit(10)

  const errorMsg = error ? error.message : 'none'
  console.log(`Error: ${errorMsg}`)
  console.log(`Count: ${count}`)
  console.log(`Data rows returned: ${questions ? questions.length : 0}\n`)

  if (questions && questions.length > 0) {
    console.log('Sample question:')
    console.log(JSON.stringify(questions[0], null, 2))
  }

  // Check sections table
  console.log('\n=== Checking Sections Table ===\n')

  const { data: sections, error: sectionsError, count: sectionsCount } = await supabase
    .from('sections')
    .select('*', { count: 'exact' })
    .limit(10)

  const sectionsErrorMsg = sectionsError ? sectionsError.message : 'none'
  console.log(`Error: ${sectionsErrorMsg}`)
  console.log(`Count: ${sectionsCount}`)
  console.log(`Data rows returned: ${sections ? sections.length : 0}\n`)

  if (sections && sections.length > 0) {
    console.log('Sample section:')
    console.log(JSON.stringify(sections[0], null, 2))
  }

  // Check answers table to see what question IDs exist
  console.log('\n=== Checking Answer References ===\n')

  const { data: answers, count: answersCount } = await supabase
    .from('answers')
    .select('parent_question_id', { count: 'exact' })
    .not('parent_question_id', 'is', null)
    .limit(10)

  console.log(`Total answers with question ID: ${answersCount}`)

  if (answers && answers.length > 0) {
    console.log('Sample answer parent_question_ids:')
    const uniqueIds = [...new Set(answers.map(a => a.parent_question_id))]
    console.log(uniqueIds.slice(0, 10))

    // Try to look up one of these question IDs
    if (uniqueIds.length > 0) {
      const { data: linkedQuestion } = await supabase
        .from('questions')
        .select('*')
        .eq('id', uniqueIds[0])
        .maybeSingle()

      const exists = linkedQuestion ? 'YES' : 'NO'
      console.log(`\nQuestion ${uniqueIds[0]} exists in questions table: ${exists}`)
      if (linkedQuestion) {
        console.log(JSON.stringify(linkedQuestion, null, 2))
      }
    }
  }
}

investigateQuestionsTable()
