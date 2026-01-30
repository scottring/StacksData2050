import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkListTableIds() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Checking List Table IDs ===\n')

  // Get all answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  // Get list table questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('question_type', 'List table')

  console.log(`List table questions: ${questions?.length || 0}`)

  // Check each list table question
  for (const q of questions || []) {
    const questionAnswers = answers?.filter(a => a.parent_question_id === q.id) || []

    console.log(`\nQuestion: ${q.name?.substring(0, 60)}...`)
    console.log(`  Question ID: ${q.id}`)
    console.log(`  list_table_id: ${q.list_table_id || 'NULL'}`)
    console.log(`  Answers: ${questionAnswers.length}`)

    if (questionAnswers.length > 0) {
      // Check first answer
      const firstAnswer = questionAnswers[0]
      console.log(`  First answer list_table_row_id: ${firstAnswer.list_table_row_id}`)
      console.log(`  First answer list_table_column_id: ${firstAnswer.list_table_column_id}`)

      // Try to find columns by parent_question_id instead
      const { data: columnsByQuestion } = await supabase
        .from('list_table_columns')
        .select('*')
        .eq('parent_question_id', q.id)
        .order('order_number')

      console.log(`  Columns by parent_question_id: ${columnsByQuestion?.length || 0}`)
      if (columnsByQuestion && columnsByQuestion.length > 0) {
        console.log(`    Column names: ${columnsByQuestion.map(c => c.name).join(', ')}`)
      }

      // Try to find columns by parent_table_id
      if (q.list_table_id) {
        const { data: columnsByTable } = await supabase
          .from('list_table_columns')
          .select('*')
          .eq('parent_table_id', q.list_table_id)
          .order('order_number')

        console.log(`  Columns by parent_table_id: ${columnsByTable?.length || 0}`)
        if (columnsByTable && columnsByTable.length > 0) {
          console.log(`    Column names: ${columnsByTable.map(c => c.name).join(', ')}`)
        }
      }

      // Try to find columns by column_id from answers
      if (firstAnswer.list_table_column_id) {
        const { data: column } = await supabase
          .from('list_table_columns')
          .select('*')
          .eq('id', firstAnswer.list_table_column_id)
          .single()

        if (column) {
          console.log(`  Column lookup by answer column_id:`)
          console.log(`    ID: ${column.id}`)
          console.log(`    Name: ${column.name}`)
          console.log(`    parent_table_id: ${column.parent_table_id}`)
          console.log(`    parent_question_id: ${column.parent_question_id}`)

          // Now find all columns with same parent
          if (column.parent_question_id) {
            const { data: siblingColumns } = await supabase
              .from('list_table_columns')
              .select('*')
              .eq('parent_question_id', column.parent_question_id)
              .order('order_number')

            console.log(`  All columns for this question: ${siblingColumns?.map(c => c.name).join(', ')}`)
          }
        }
      }
    }
  }
}

checkListTableIds().catch(console.error)
