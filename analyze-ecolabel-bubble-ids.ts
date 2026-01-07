import { supabase } from './src/migration/supabase-client.js'

console.log('=== ANALYZING ECOLABEL SUBSECTIONS ===\n')

// Get subsections
const { data: subsections } = await supabase
  .from('subsections')
  .select('id, bubble_id, name, order_number')
  .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('Subsections:')
subsections?.forEach(sub => {
  console.log(`  ${sub.order_number}. ${sub.name}`)
  console.log(`     ID: ${sub.id}`)
  console.log(`     Bubble ID: ${sub.bubble_id}\n`)
})

console.log('\n=== ANALYZING ECOLABEL QUESTIONS ===\n')

// Get questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number, parent_subsection_id')
  .eq('parent_section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('Questions (by order_number):')
questions?.forEach((q, idx) => {
  console.log(`${idx + 1}. Order ${q.order_number}: ${q.name?.substring(0, 70)}`)
  console.log(`   Bubble ID: ${q.bubble_id}`)
  console.log(`   Current subsection: ${q.parent_subsection_id || 'NONE'}\n`)
})

// Now check if we can find the pattern from the Bubble IDs
console.log('\n=== CHECKING BUBBLE ID PATTERNS ===')
console.log('\nEU Ecolabel subsection bubble_id:', subsections?.find(s => s.order_number === 1)?.bubble_id)
console.log('Nordic Ecolabel subsection bubble_id:', subsections?.find(s => s.order_number === 2)?.bubble_id)
console.log('Blue Angel subsection bubble_id:', subsections?.find(s => s.order_number === 3)?.bubble_id)
