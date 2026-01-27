import { supabase } from './src/migration/supabase-client.js'

async function analyzeUnitsRows() {
  const questionId = '55eeea30-92d0-492e-aa44-37819705fbb0'
  const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'
  const unitsColId = '774040d8-ca9b-49a6-b728-f3b7dcab7c2f'

  const { data: allAnswers } = await supabase
    .from('answers')
    .select('*')
    .eq('parent_question_id', questionId)
    .eq('sheet_id', sheetId)
    .order('created_at')

  console.log('=== All Answers Ordered by created_at ===\n')

  const rowGroups = new Map()

  allAnswers?.forEach(a => {
    if (!rowGroups.has(a.list_table_row_id)) {
      rowGroups.set(a.list_table_row_id, [])
    }

    const colName = a.list_table_column_id === unitsColId ? 'Units' :
                    a.list_table_column_id === 'c609f59f-1676-4e1d-b506-9531aa9b6167' ? 'Chemical Name' :
                    a.list_table_column_id === '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b' ? 'CAS Number' :
                    a.list_table_column_id === 'b200b510-3ad3-4826-a942-7671b7556898' ? 'EC Number' :
                    a.list_table_column_id === '7481500b-5aa2-4731-929f-8483ef6e5434' ? 'Concentration' : 'Unknown'

    rowGroups.get(a.list_table_row_id).push({
      col: colName,
      value: a.text_value || a.number_value,
      created: a.created_at
    })
  })

  console.log('Rows grouped by row_id:\n')
  for (const [rowId, cells] of rowGroups) {
    console.log(`Row ID: ${rowId}`)
    cells.forEach(c => {
      console.log(`  ${c.col}: ${c.value} (created: ${c.created})`)
    })
    console.log('')
  }

  // Check list_table_rows to see if there's order information
  const { data: rows } = await supabase
    .from('list_table_rows')
    .select('*')
    .in('id', Array.from(rowGroups.keys()))

  console.log('\nList table rows metadata:')
  rows?.forEach(r => {
    console.log(`  ${r.id}: order=${r.order_number || 'NULL'}`)
  })
}

analyzeUnitsRows().catch(console.error)
