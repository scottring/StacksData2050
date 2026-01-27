import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function debugListTable() {
  console.log('Debugging list table at 3.1.1.1\n')

  // Find question with numbering 3.1.1.1 (section 3, subsection 1, order 1, sub-order 1)
  // Or it might be stored differently - let me check all questions in section 3

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 3)
    .order('subsection_sort_number')
    .order('order_number')

  console.log('Questions in section 3:\n')
  questions?.forEach(q => {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} - ${q.name?.substring(0, 80)}`)
    console.log(`  Type: ${q.question_type}, ID: ${q.id}`)
  })

  // Now look for the specific biocidal question
  const biocidalQ = questions?.find(q =>
    q.name?.includes('biocidal active substances') &&
    q.name?.includes('intentionally added')
  )

  if (!biocidalQ) {
    console.log('\nCould not find the biocidal question')
    return
  }

  console.log('\n--- Found the question ---')
  console.log('Question:', biocidalQ.name)
  console.log('Number:', `${biocidalQ.section_sort_number}.${biocidalQ.subsection_sort_number}.${biocidalQ.order_number}`)
  console.log('Type:', biocidalQ.question_type)
  console.log('ID:', biocidalQ.id)

  // Get all answers for this question on this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', biocidalQ.id)

  console.log(`\nTotal answers: ${answers?.length || 0}`)

  // Check for list table answers
  const listTableAnswers = answers?.filter(a => a.list_table_row_id || a.list_table_column_id)
  console.log(`List table answers: ${listTableAnswers?.length || 0}`)

  if (listTableAnswers && listTableAnswers.length > 0) {
    console.log('\nList table data:')

    // Group by row
    const rowMap = new Map()
    listTableAnswers.forEach(answer => {
      const rowId = answer.list_table_row_id
      if (!rowMap.has(rowId)) {
        rowMap.set(rowId, [])
      }
      rowMap.get(rowId).push(answer)
    })

    console.log(`\nRows: ${rowMap.size}`)

    rowMap.forEach((cells, rowId) => {
      console.log(`\nRow ${rowId}:`)
      cells.forEach(cell => {
        console.log(`  Column ${cell.list_table_column_id}: ${cell.text_value || cell.number_value || '(empty)'}`)
      })
    })
  }
}

debugListTable().catch(console.error)
