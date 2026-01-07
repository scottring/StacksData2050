import { supabase } from './src/migration/supabase-client.js'

// Get all questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name')

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('*')

console.log(`Total questions: ${questions?.length}`)
console.log(`Total choices: ${allChoices?.length}\n`)

let questionsWithDuplicates = 0
let questionsWithNoChoices = 0
let totalDuplicates = 0

for (const q of questions || []) {
  const choices = allChoices?.filter(c => c.parent_question_id === q.id) || []

  if (choices.length === 0) {
    questionsWithNoChoices++
    continue
  }

  // Check for duplicates by content
  const contentCounts = new Map<string, number>()
  choices.forEach(c => {
    const key = c.content || 'null'
    contentCounts.set(key, (contentCounts.get(key) || 0) + 1)
  })

  const hasDuplicates = Array.from(contentCounts.values()).some(count => count > 1)
  if (hasDuplicates) {
    questionsWithDuplicates++
    const dupeCount = choices.length - contentCounts.size
    totalDuplicates += dupeCount
  }
}

console.log('=== GLOBAL CHOICE ANALYSIS ===')
console.log(`Questions with no choices: ${questionsWithNoChoices}`)
console.log(`Questions with duplicate choices: ${questionsWithDuplicates}`)
console.log(`Total duplicate choice records: ${totalDuplicates}`)
console.log(`\nPercentage with issues: ${(((questionsWithDuplicates + questionsWithNoChoices) / (questions?.length || 1)) * 100).toFixed(1)}%`)
