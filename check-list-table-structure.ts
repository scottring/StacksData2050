import { supabase } from './src/migration/supabase-client.js'

async function checkStructure() {
  console.log('=== Checking list table structure ===\n')

  // Get the column we saw earlier
  const colId = 'b200b510-3ad3-4826-a942-7671b7556898' // EC Number from question 3.1.2

  const { data: col } = await supabase
    .from('list_table_columns')
    .select('*')
    .eq('id', colId)
    .single()

  console.log('Column:', col?.name)
  console.log('Parent table ID:', col?.parent_table_id)

  // Check if parent_table_id references a "list_tables" table
  if (col?.parent_table_id) {
    const { data: parentTable, error } = await supabase
      .from('list_tables')
      .select('*')
      .eq('id', col.parent_table_id)
      .single()

    if (error) {
      console.log('Error fetching parent table:', error.message)
      console.log('\nTrying "list_table" (singular)...')

      const { data: parentTable2, error: error2 } = await supabase
        .from('list_table')
        .select('*')
        .eq('id', col.parent_table_id)
        .single()

      if (error2) {
        console.log('Error:', error2.message)
      } else {
        console.log('\nParent table found:', JSON.stringify(parentTable2, null, 2))
      }
    } else {
      console.log('\nParent table found:', JSON.stringify(parentTable, null, 2))
    }
  }

  // Check question 3.1.2 to see if it has a list_table_id
  const questionId = '55eeea30-92d0-492e-aa44-37819705fbb0'
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single()

  console.log('\nQuestion 3.1.2 fields:')
  console.log('  name:', question?.name)
  console.log('  question_type:', question?.question_type)
  console.log('  list_table_id:', (question as any)?.list_table_id)
}

checkStructure().catch(console.error)
