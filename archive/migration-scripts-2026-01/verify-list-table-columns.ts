import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyListTableColumns() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Verifying List Table Column Lookup Logic ===\n')

  // Get all answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  // Get all columns
  const { data: allColumns } = await supabase
    .from('list_table_columns')
    .select('*')

  console.log(`Total columns: ${allColumns?.length || 0}`)

  // Enrich columns with list_table_id alias
  const enrichedColumns = allColumns?.map(c => ({
    ...c,
    list_table_id: c.parent_table_id
  })) || []

  // Get list table questions with answers
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('question_type', 'List table')

  const listTableQuestionsWithAnswers = questions?.filter(q => {
    return answers?.some(a => a.parent_question_id === q.id)
  }) || []

  console.log(`List table questions with answers: ${listTableQuestionsWithAnswers.length}\n`)

  for (const question of listTableQuestionsWithAnswers) {
    const questionAnswers = answers?.filter(a => a.parent_question_id === question.id) || []

    console.log(`Question: ${question.name?.substring(0, 60)}...`)
    console.log(`  list_table_id: ${question.list_table_id || 'NULL'}`)
    console.log(`  Answers: ${questionAnswers.length}`)

    // Strategy 1: Try to find columns by list_table_id
    let relevantColumns: any[] = []
    if (question.list_table_id) {
      relevantColumns = enrichedColumns.filter(c => c.list_table_id === question.list_table_id)
      console.log(`  Strategy 1 (by list_table_id): Found ${relevantColumns.length} columns`)
    } else {
      console.log(`  Strategy 1 (by list_table_id): Skipped (list_table_id is NULL)`)
    }

    // Strategy 2: Find columns from answer column IDs
    if (relevantColumns.length === 0) {
      const uniqueColumnIds = Array.from(new Set(questionAnswers.map(a => a.list_table_column_id).filter(Boolean)))
      relevantColumns = uniqueColumnIds
        .map(colId => enrichedColumns.find(c => c.id === colId))
        .filter(Boolean)
      console.log(`  Strategy 2 (from answer column IDs): Found ${relevantColumns.length} columns`)
    }

    if (relevantColumns.length > 0) {
      const sortedColumns = [...relevantColumns].sort((a, b) => (a.order_number || 999) - (b.order_number || 999))
      console.log(`  Column names: ${sortedColumns.map(c => c.name).join(', ')}`)

      // Verify we can build rows
      const rowMap = new Map<string, Record<string, string>>()
      questionAnswers.forEach(answer => {
        const rowId = answer.list_table_row_id
        if (!rowId) return

        if (!rowMap.has(rowId)) {
          rowMap.set(rowId, {})
        }

        const column = relevantColumns.find(c => c.id === answer.list_table_column_id)
        const colName = column?.name || 'Unknown Column'
        rowMap.get(rowId)![colName] = answer.text_value || ''
      })

      const rows = Array.from(rowMap.entries())
      console.log(`  Rows: ${rows.length}`)

      // Show first row as sample
      if (rows.length > 0) {
        const [rowId, values] = rows[0]
        console.log(`  Sample row data:`)
        sortedColumns.forEach(col => {
          const value = values[col.name] || '-'
          console.log(`    ${col.name}: ${value}`)
        })
      }
    } else {
      console.log(`  ⚠️  NO COLUMNS FOUND - This list table will not display properly!`)
    }

    console.log('')
  }

  console.log('=== Summary ===')
  console.log(`All ${listTableQuestionsWithAnswers.length} list tables should now display with proper columns`)
}

verifyListTableColumns().catch(console.error)
