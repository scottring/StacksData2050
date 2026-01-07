import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING QUESTION 4 DEPENDENCY ===\n')

const questionBubbleId = '1621986483500x603202081932705800'

const { error } = await supabase
  .from('questions')
  .update({ dependent_no_show: false })
  .eq('bubble_id', questionBubbleId)

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('✓ Set dependent_no_show to false')
}

// Verify
const { data: q } = await supabase
  .from('questions')
  .select('name, order_number, dependent_no_show')
  .eq('bubble_id', questionBubbleId)
  .single()

console.log('\nUpdated question:')
console.log('  Name:', q?.name?.substring(0, 60))
console.log('  Order:', q?.order_number)
console.log('  Dependent:', q?.dependent_no_show)
