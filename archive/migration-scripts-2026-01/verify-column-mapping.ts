import { supabase } from './src/migration/supabase-client.js'

async function verifyMapping() {
  const listTableId = '09e57e91-f8c5-418a-9aad-02846f7f52e9'

  // Get all columns for this list_table
  const { data: columns } = await supabase
    .from('list_table_columns')
    .select('*')
    .eq('parent_table_id', listTableId)
    .order('order_number')

  console.log('=== Columns in list_table ===')
  columns?.forEach(col => {
    console.log(`${col.order_number}. ${col.name}`)
    console.log(`   ID: ${col.id}`)
    console.log(`   Key would be: ${col.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')}`)
    console.log('')
  })

  // Check what column IDs are in the answers
  const answerColIds = [
    'b200b510-3ad3-4826-a942-7671b7556898', // EC Number
    '7481500b-5aa2-4731-929f-8483ef6e5434', // Units
    'c609f59f-1676-4e1d-b506-9531aa9b6167', // Chemical Name
    '774040d8-ca9b-49a6-b728-f3b7dcab7c2f', // Concentration
    '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b'  // CAS Number
  ]

  console.log('\n=== Checking if answer column IDs match ===')
  answerColIds.forEach(id => {
    const col = columns?.find(c => c.id === id)
    console.log(`${id}: ${col ? `✓ ${col.name}` : '✗ NOT FOUND'}`)
  })
}

verifyMapping().catch(console.error)
