import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function debugQuestion() {
  console.log('Debugging question 3.1.1.1 on sheet Hydrocarb 60 BE 70%\n')

  // Find the question
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 3)
    .eq('subsection_sort_number', 1)
    .eq('order_number', 1)
    .single()

  if (!question) {
    console.log('Question 3.1.1.1 not found')
    return
  }

  console.log('Question:', question.name)
  console.log('Type:', question.question_type)
  console.log('ID:', question.id)
  console.log()

  // Get all answers for this question on this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', question.id)

  console.log(`Total answers: ${answers?.length || 0}`)
  console.log()

  if (answers && answers.length > 0) {
    console.log('First few answers:')
    answers.slice(0, 5).forEach((answer, idx) => {
      console.log(`\n${idx + 1}. Answer ID: ${answer.id}`)
      console.log(`   list_table_row_id: ${answer.list_table_row_id}`)
      console.log(`   list_table_column_id: ${answer.list_table_column_id}`)
      console.log(`   text_value: ${answer.text_value}`)
      console.log(`   number_value: ${answer.number_value}`)
    })
  }

  // Check if there are list table columns
  if (question.question_type === 'list_table' || question.question_type === 'List') {
    console.log('\n--- Checking List Table Structure ---')

    // Find list table columns
    const { data: columns } = await supabase
      .from('list_table_columns')
      .select('*')
      .order('display_order')
      .limit(100)

    console.log(`\nTotal list_table_columns in database: ${columns?.length || 0}`)

    if (columns && columns.length > 0) {
      console.log('\nFirst 5 columns:')
      columns.slice(0, 5).forEach(col => {
        console.log(`  - ${col.name} (ID: ${col.id})`)
      })
    }
  }
}

debugQuestion().catch(console.error)
