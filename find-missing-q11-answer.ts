import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

console.log('=== SEARCHING FOR MISSING Q11 ANSWER ===\n')

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id, name')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11 ID:', q11?.id)
console.log('Q11 Bubble ID:', q11?.bubble_id)
console.log('Q11 Name:', q11?.name?.substring(0, 60))

// Check if there are ANY answers for this sheet with this question's bubble_id
// But first, we need to search for answers that might have been orphaned

// Search for answers with similar question names (deleted questions)
const searchTerm = '%Article 95 list for respective active substance%'

const { data: deletedQuestions } = await supabase
  .from('questions')
  .select('id, name, bubble_id')
  .ilike('name', searchTerm)

console.log(`\n=== Questions matching search (${deletedQuestions?.length}) ===`)
deletedQuestions?.forEach(q => {
  console.log(`ID: ${q.id.substring(0, 12)}... Bubble: ${q.bubble_id}`)
  console.log(`  ${q.name?.substring(0, 60)}`)
  console.log()
})

// Check if there are answers for any of these question IDs
for (const q of deletedQuestions || []) {
  const { data: answers } = await supabase
    .from('answers')
    .select('id, choice_id, modified_at, choices(content)')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', q.id)
    .order('modified_at', { ascending: false })
    .limit(1)

  if (answers && answers.length > 0) {
    console.log(`Found answer for question ${q.id.substring(0, 12)}:`)
    console.log(`  Answer: ${answers[0].choices?.content}`)
    console.log(`  Modified: ${answers[0].modified_at}`)
    console.log()
  }
}
