import { supabase } from './src/migration/supabase-client.js'

async function checkOrphanedColumns() {
  const colIds = [
    'b200b510-3ad3-4826-a942-7671b7556898',
    '7481500b-5aa2-4731-929f-8483ef6e5434',
    'c609f59f-1676-4e1d-b506-9531aa9b6167',
    '774040d8-ca9b-49a6-b728-f3b7dcab7c2f',
    '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b'
  ]

  console.log('=== Checking if column IDs exist in list_table_columns ===\n')

  const { data, error } = await supabase
    .from('list_table_columns')
    .select('*')
    .in('id', colIds)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${data?.length || 0} columns:`)
  data?.forEach(c => {
    console.log(`  - ${c.name}`)
    console.log(`    Parent Question: ${c.parent_question_id}`)
    console.log(`    Order: ${c.order_number}`)
    console.log('')
  })

  if (!data || data.length === 0) {
    console.log('❌ None of those column IDs exist in list_table_columns!')
    console.log('\nThis is the problem:')
    console.log('- Answers reference column IDs that don\'t exist')
    console.log('- Frontend can\'t find column definitions')
    console.log('- Falls back to showing raw text values')
    console.log('\nSolution: Need to populate list_table_columns for question 3.1.2')
  }
}

checkOrphanedColumns().catch(console.error)
