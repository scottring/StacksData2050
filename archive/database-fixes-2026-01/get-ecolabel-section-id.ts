import { supabase } from './src/migration/supabase-client.js'

// Find the Ecolabels section
const { data: section } = await supabase
  .from('sections')
  .select('*')
  .eq('id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .single()

console.log('Ecolabels section:', section)

// Check if it has a bubble_id
console.log('\nBubble ID:', section?.bubble_id)
