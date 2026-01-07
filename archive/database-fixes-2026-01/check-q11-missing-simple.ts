import { supabase } from './src/migration/supabase-client.js'

console.log('=== SIMPLE Q11 ANALYSIS ===\n')

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11 Bubble ID:', q11?.bubble_id)

// Simple approach: check answers table directly for Q11 bubble_id
const { data: answersWithBubbleId } = await supabase
  .from('answers')
  .select('id, bubble_id')
  .not('bubble_id', 'is', null)
  .limit(10)

console.log(`\nSample answers with bubble_id:`)
answersWithBubbleId?.forEach(a => {
  console.log(`  ${a.id}: ${a.bubble_id}`)
})

// The real question: do answers even HAVE bubble_ids?
const { count: answersWithBubble } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .not('bubble_id', 'is', null)

const { count: totalAnswers } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })

console.log(`\nTotal answers: ${totalAnswers}`)
console.log(`Answers with bubble_id: ${answersWithBubble}`)
console.log(`Answers WITHOUT bubble_id: ${(totalAnswers || 0) - (answersWithBubble || 0)}`)

console.log('\n=== CONCLUSION ===')
if ((answersWithBubble || 0) === 0) {
  console.log('❌ Answers table has NO bubble_ids')
  console.log('   Cannot map to Bubble data')
  console.log('   Missing Q11 answers are GENUINELY missing from migration')
  console.log('\n   Options:')
  console.log('   1. Re-import from Bubble API (slow, requires API key)')
  console.log('   2. Accept that Q11 is missing for 999 sheets')
  console.log('   3. Check if data exists in Bubble and manually import')
} else {
  console.log('✓ Some answers have bubble_ids, can attempt mapping')
}
