import { supabase } from './src/migration/supabase-client.js'

const { data } = await supabase
  .from('questions')
  .select('*')
  .eq('parent_subsection_id', 'f36f4e72-c5f1-4a8b-a1eb-50d1686da2bd')
  .order('order_number')
  .limit(1)

console.log(JSON.stringify(data, null, 2))
