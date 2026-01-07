import { supabase } from './src/migration/supabase-client.js'

const { data } = await supabase.from('answers').select('*').limit(1).single()
if (data) {
  console.log('Answer fields:', Object.keys(data).sort().join(', '))
}
