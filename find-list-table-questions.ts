import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function findListTables() {
  console.log('Finding list table questions for Hydrocarb 60 BE 70%\n')

  // Get all answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id')
    .eq('sheet_id', sheetId)
    .not('list_table_row_id', 'is', null)

  if (!answers || answers.length === 0) {
    console.log('No list table answers found')
    return
  }

  const questionIds = [...new Set(answers.map(a => a.parent_question_id))]
  console.log(`Found ${questionIds.length} questions with list table data\n`)

  // Get those questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  if (questions) {
    questions.forEach(q => {
      console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name}`)
      console.log(`  Question type: ${q.question_type}`)
      console.log(`  ID: ${q.id}`)
      console.log()
    })
  }
}

findListTables().catch(console.error)
