import { supabase } from './src/migration/supabase-client.js'

async function checkSchema() {
  const { data } = await supabase
    .from('list_table_columns')
    .select('*')
    .limit(1)

  console.log('Sample list_table_columns record:')
  console.log(JSON.stringify(data?.[0], null, 2))
}

checkSchema().catch(console.error)
