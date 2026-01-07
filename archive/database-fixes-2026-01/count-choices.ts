import { supabase } from './src/migration/supabase-client.js'

const { count } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log('Total choices in database:', count)

// Get sample choices to see structure
const { data: sample } = await supabase
  .from('choices')
  .select('*')
  .limit(5)

console.log('\nSample choices:')
sample?.forEach(c => {
  console.log(`- ${c.name} (question_id: ${c.question_id})`)
})
