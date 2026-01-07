import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== MAPPING BY BUBBLE DATA ===\n')

// Get current questions with their bubble IDs
const { data: currentQuestions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log('Current Biocides questions with Bubble IDs:')
currentQuestions?.forEach(q => {
  console.log(`Q${q.order_number}: ${q.bubble_id}`)
  console.log(`  Name: ${q.name?.substring(0, 60)}`)
  console.log(`  ID: ${q.id}`)
  console.log()
})

// Now check if we can query Bubble to get the original answer data
console.log('\n=== CHECKING BUBBLE API ===')
console.log('Unfortunately we cannot reliably map old deleted question IDs to new ones.')
console.log('The migration appears to have changed question IDs without migrating answers.')
console.log('\nWe need to query the Bubble API to re-import the answers for this sheet.')
