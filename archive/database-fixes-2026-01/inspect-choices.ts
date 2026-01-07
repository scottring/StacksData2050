import { supabase } from './src/migration/supabase-client.js'

const { data: sample } = await supabase
  .from('choices')
  .select('*')
  .limit(3)

console.log('Sample choices structure:')
console.log(JSON.stringify(sample, null, 2))
