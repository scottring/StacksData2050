import { supabase } from './src/migration/supabase-client.js'

async function deleteOrphanRows() {
  const orphanRowIds = [
    '9b21ec6f-30ff-4df6-8038-c0a84be03ec4',
    '2da89f4d-7f71-4c98-abd3-6aac2c61a95a'
  ]

  console.log('=== Deleting orphan rows ===\n')

  // First delete the answers
  const { data: deletedAnswers, error: answersError } = await supabase
    .from('answers')
    .delete()
    .in('list_table_row_id', orphanRowIds)
    .select()

  if (answersError) {
    console.error('Error deleting answers:', answersError)
    return
  }

  console.log(`Deleted ${deletedAnswers?.length || 0} answer records`)

  // Then delete the row records themselves
  const { data: deletedRows, error: rowsError } = await supabase
    .from('list_table_rows')
    .delete()
    .in('id', orphanRowIds)
    .select()

  if (rowsError) {
    console.error('Error deleting rows:', rowsError)
    return
  }

  console.log(`Deleted ${deletedRows?.length || 0} list_table_row records`)
  console.log('\n✅ Orphan rows deleted! Refresh the page.')
}

deleteOrphanRows().catch(console.error)
