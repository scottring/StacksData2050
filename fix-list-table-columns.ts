import { supabase } from './src/migration/supabase-client.js'

async function fixColumns() {
  console.log('=== Fixing list table for question 3.1.2 ===\n')

  const questionId = '55eeea30-92d0-492e-aa44-37819705fbb0' // Question 3.1.2
  const listTableId = '09e57e91-f8c5-418a-9aad-02846f7f52e9' // The list_table these columns belong to

  console.log('Step 1: Updating question to reference list_table...')

  const { data: questionUpdate, error: questionError } = await supabase
    .from('questions')
    .update({ list_table_id: listTableId })
    .eq('id', questionId)
    .select()

  if (questionError) {
    console.error('❌ Error updating question:', questionError)
    return
  }

  console.log('✅ Question updated!\n')

  // Verify the fix
  console.log('Step 2: Verifying list_table_columns...')
  const { data: columns } = await supabase
    .from('list_table_columns')
    .select('*')
    .eq('parent_table_id', listTableId)
    .order('order_number')

  console.log(`Found ${columns?.length || 0} columns for this list_table:`)
  columns?.forEach(c => {
    console.log(`  ${c.order_number}. ${c.name}`)
  })

  console.log('\n✅ List table should now render correctly!')
  console.log('Refresh the page to see the list table with all columns.')
}

fixColumns().catch(console.error)
