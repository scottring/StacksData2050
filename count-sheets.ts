import { supabase } from './src/migration/supabase-client.js'

async function countSheets() {
  const { count } = await supabase
    .from('sheets')
    .select('id', { count: 'exact', head: true })
    .not('bubble_id', 'is', null)
  
  console.log('Total sheets with bubble_id:', count)
}

countSheets()
