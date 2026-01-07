import { supabase } from './src/migration/supabase-client.js'

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== SEARCHING FOR ORPHANED Q11 ANSWERS ===\n')

// Get current Q11
const { data: currentQ11 } = await supabase
  .from('questions')
  .select('id, bubble_id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Current Q11 ID:', currentQ11?.id)
console.log('Current Q11 Bubble ID:', currentQ11?.bubble_id)

// Search for ALL questions that might have been Q11 (same bubble_id)
const { data: allQ11Versions } = await supabase
  .from('questions')
  .select('id, created_at')
  .eq('bubble_id', currentQ11?.bubble_id)
  .order('created_at', { ascending: true })

console.log(`\nFound ${allQ11Versions?.length} versions of Q11 over time:`)
allQ11Versions?.forEach((q, idx) => {
  console.log(`  [${idx}] ${q.id} (created: ${q.created_at})`)
})

// Get a sample sheet to check
const { data: sampleSheet } = await supabase
  .from('sheets')
  .select('id, name')
  .limit(1)
  .single()

console.log(`\nChecking sample sheet: ${sampleSheet?.name}`)

// Check if there are answers for any old Q11 versions
for (const q11Version of allQ11Versions || []) {
  const { data: answers } = await supabase
    .from('answers')
    .select('id, choice_id, choices(content)')
    .eq('sheet_id', sampleSheet?.id)
    .eq('parent_question_id', q11Version.id)

  if (answers && answers.length > 0) {
    console.log(`  Found ${answers.length} answer(s) for old Q11 ID: ${q11Version.id}`)
    answers.forEach(a => {
      console.log(`    Answer: ${a.choices?.content || 'no choice'}`)
    })
  }
}

// Also check ALL answers for this sheet to see if any point to deleted questions
console.log('\n=== Checking for answers to DELETED questions ===')

const { data: allAnswersForSheet } = await supabase
  .from('answers')
  .select('parent_question_id')
  .eq('sheet_id', sampleSheet?.id)

const uniqueQuestionIds = [...new Set(allAnswersForSheet?.map(a => a.parent_question_id))]

console.log(`Sheet has ${uniqueQuestionIds.length} unique question IDs in answers`)

// Check which ones exist vs deleted
let existCount = 0
let deletedCount = 0

for (const qId of uniqueQuestionIds.slice(0, 20)) {
  if (!qId) continue

  const { data: q } = await supabase
    .from('questions')
    .select('id')
    .eq('id', qId)
    .single()

  if (q) {
    existCount++
  } else {
    deletedCount++
    console.log(`  Deleted question ID: ${qId}`)
  }
}

console.log(`\nSample of 20: ${existCount} exist, ${deletedCount} deleted`)
