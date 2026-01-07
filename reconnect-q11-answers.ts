import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== RECONNECTING ORPHANED Q11 ANSWERS ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11 Bubble ID:', q11?.bubble_id)
console.log('Q11 Supabase ID:', q11?.id)

// Find all answers in the database that should point to this Q11
// They would have been migrated with the Q11 bubble_id in some field
// Let's search for answers that DON'T point to current Q11 but should

// First, get current Q11 choices
const { data: q11Choices } = await supabase
  .from('choices')
  .select('id, bubble_id')
  .eq('parent_question_id', q11?.id)

const q11ChoiceIds = new Set(q11Choices?.map(c => c.id))

console.log(`\nQ11 has ${q11Choices?.length} choices`)

// Find answers that point to Q11's choices but NOT to Q11 itself
const { data: orphanedAnswers } = await supabase
  .from('answers')
  .select('id, sheet_id, choice_id, parent_question_id')
  .in('choice_id', Array.from(q11ChoiceIds))
  .neq('parent_question_id', q11?.id)

console.log(`Found ${orphanedAnswers?.length} answers pointing to Q11 choices but wrong question\n`)

if (orphanedAnswers && orphanedAnswers.length > 0) {
  console.log('Updating answers to point to correct Q11...')

  const { error } = await supabase
    .from('answers')
    .update({ parent_question_id: q11?.id })
    .in('id', orphanedAnswers.map(a => a.id))

  if (error) {
    console.log(`❌ Error: ${error.message}`)
  } else {
    console.log(`✓ Updated ${orphanedAnswers.length} answers`)
  }
}

// Verify
const { count: totalQ11Answers } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .eq('parent_question_id', q11?.id)

console.log(`\nTotal Q11 answers now: ${totalQ11Answers}`)
