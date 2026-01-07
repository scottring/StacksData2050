import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== ASSESSING CURRENT STATE ===\n')

// Get current questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log('Current questions:')
questions?.forEach(q => {
  console.log(`Q${q.order_number}: ${q.name?.substring(0, 60)}`)
})

// Check if the duplicate question still exists in deleted state
const deletedDuplicateId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'

const { data: deletedQ } = await supabase
  .from('questions')
  .select('id, name')
  .eq('id', deletedDuplicateId)
  .single()

console.log(`\nDeleted duplicate question exists: ${deletedQ ? 'YES' : 'NO'}`)

// Check answers for Q10 (the one we migrated TO)
const q10 = questions?.find(q => q.order_number === 10)

if (q10) {
  const { data: q10Answers } = await supabase
    .from('answers')
    .select('id, created_at, modified_at, choice_id, choices(content)')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', q10.id)
    .order('modified_at', { ascending: false })
    .limit(5)

  console.log(`\nQ10 answers (most recent 5):`)
  q10Answers?.forEach(a => {
    console.log(`  ${a.choices?.content} (modified: ${a.modified_at})`)
  })
}

// Check for answers that might have been from the duplicate
const { data: recentAnswerChanges } = await supabase
  .from('answers')
  .select('id, parent_question_id, modified_at, choice_id, choices(content)')
  .eq('sheet_id', sheetId)
  .gte('modified_at', '2025-01-07')
  .order('modified_at', { ascending: false })
  .limit(20)

console.log(`\n=== Recent answer changes (today) ===`)
recentAnswerChanges?.forEach(a => {
  const q = questions?.find(q => q.id === a.parent_question_id)
  console.log(`Q${q?.order_number}: ${a.choices?.content} (${a.modified_at})`)
})
