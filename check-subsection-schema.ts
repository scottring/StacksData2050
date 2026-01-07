import { supabase } from './src/migration/supabase-client.js'

const { data } = await supabase
  .from('subsections')
  .select('*')
  .limit(1)
  .single()

console.log('Subsection columns:', Object.keys(data || {}).sort().join(', '))
