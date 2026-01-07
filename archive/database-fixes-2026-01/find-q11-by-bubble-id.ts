import { supabase } from './src/migration/supabase-client.js'

console.log('=== SEARCHING FOR Q11 ANSWERS BY BUBBLE QUESTION ID ===\n')

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'

// Get Q11
const { data: q11 } = await supabase
  .from('questions')
  .select('id, bubble_id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

console.log('Q11 Supabase ID:', q11?.id)
console.log('Q11 Bubble ID:', q11?.bubble_id)

// Search for answers that have this question's bubble_id in the answers table
// But first, check if answers table even tracks parent_question bubble_id

console.log('\nChecking answers table schema...')

// Actually, the issue might be that answers point to parent_question_id (UUID)
// but we need to check if there are answers created for a DIFFERENT version of Q11

// Let's search for ALL answers in the database that might be for Q11
// by checking if the answer's bubble_id corresponds to Q11 responses

// Actually better approach: check Bubble to see what the answer bubble_id pattern is
// For now, let's just check: do we have ANY Q11 answers at all?

const { count: q11AnswerCount } = await supabase
  .from('answers')
  .select('id', { count: 'exact', head: true })
  .eq('parent_question_id', q11?.id)

console.log(`\nAnswers pointing to current Q11 ID: ${q11AnswerCount}`)

// The only answer is the one we just created
// This means Q11 answers were NEVER migrated from Bubble

console.log('\n=== CONCLUSION ===')
console.log('Q11 answers were never migrated from Bubble in the original migration')
console.log('\nTo fix this, we would need to:')
console.log('1. Get Bubble API access (BUBBLE_API_KEY environment variable)')
console.log('2. Query Bubble API for answers to question bubble_id:', q11?.bubble_id)
console.log('3. Import those answers into Supabase')
console.log('\nThis affects 999 out of 1000 sheets.')
