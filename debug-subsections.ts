import { supabase } from './src/migration/supabase-client.js'

const { data, error } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('Error:', error)
console.log('Data count:', data?.length)
console.log('\nData:', JSON.stringify(data, null, 2))
