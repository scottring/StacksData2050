import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== CHECKING MISSING QUESTION IDS ===\n')

// Get current Biocides questions
const { data: currentQuestions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .order('order_number')

console.log('CURRENT Biocides Questions:')
currentQuestions?.forEach(q => {
  console.log(`  Q${q.order_number}: ${q.id.substring(0, 8)}... - ${q.name?.substring(0, 50)}`)
})

// Get all deleted Biocides questions (ones not in current list)
const currentIds = currentQuestions?.map(q => q.id) || []

const { data: deletedQuestions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', biocidesSection)
  .not('id', 'in', `(${currentIds.join(',')})`)

console.log(`\n=== DELETED Biocides Questions (${deletedQuestions?.length || 0}) ===`)
if (deletedQuestions && deletedQuestions.length > 0) {
  deletedQuestions.forEach(q => {
    console.log(`  ${q.id.substring(0, 8)}... - ${q.name?.substring(0, 50)}`)
  })
} else {
  console.log('  None found in questions table')
}

// Now check answers for this sheet that point to non-current question IDs
const { data: answers } = await supabase
  .from('answers')
  .select('parent_question_id')
  .eq('sheet_id', sheetId)
  .not('parent_question_id', 'in', `(${currentIds.join(',')})`)

const uniqueOrphanedIds = [...new Set(answers?.map(a => a.parent_question_id).filter(Boolean) || [])]

console.log(`\n=== ANSWER ORPHANED QUESTION IDS (${uniqueOrphanedIds.length}) ===`)
for (const qId of uniqueOrphanedIds.slice(0, 20)) {
  // Try to find this question
  const { data: q } = await supabase
    .from('questions')
    .select('name, parent_section_id, sections(name)')
    .eq('id', qId)
    .single()

  if (q) {
    console.log(`  ${qId.substring(0, 8)}... [${q.sections?.name}] - ${q.name?.substring(0, 40)}`)
  } else {
    console.log(`  ${qId?.substring(0, 8)}... DELETED FROM DB`)
  }
}
