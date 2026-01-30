import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const rowId = '2da89f4d-7f71-4c98-abd3-6aac2c61a95a';

  const { data, error } = await supabase
    .from('list_table_rows')
    .select('*')
    .eq('id', rowId)
    .maybeSingle();

  console.log('Row exists:', data ? 'YES' : 'NO');
  if (error) console.log('Error:', error.message);
  if (data) {
    console.log('Name:', data.name);
    console.log('Order:', data.order_number);
  } else {
    console.log('\nRow does not exist - need to migrate list_table_rows first!');
  }
}

check().catch(console.error);
