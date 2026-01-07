import { supabase } from './src/migration/supabase-client.js'

const { data } = await supabase
  .from('sheets')
  .select('id, bubble_id, name')
  .eq('id', '548f08be-3b2a-465f-94b4-a2279bee9819')
  .single()

console.log('Sheet:', data?.name)
console.log('Bubble ID:', data?.bubble_id)
