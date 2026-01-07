import { supabase } from './src/migration/supabase-client.js'

// Get one of the questions with missing choices that's heavily used
const questionId = '2498c7e1-d35c-43bd-a8f5-3c1d808cc6c7' // "Does the product contain elements restricted..."

console.log('=== ANALYZING ANSWER PATTERNS ===\n')

// Get answers for this question
const { data: answers } = await supabase
  .from('answers')
  .select('text_value, text_area_value, boolean_value, choice_id')
  .eq('parent_question_id', questionId)
  .limit(100)

console.log(`Sample of ${answers?.length} answers:`)

// Analyze what fields are being used
const patterns = {
  text_value: 0,
  text_area_value: 0,
  boolean_value: 0,
  choice_id: 0,
  null_all: 0
}

const uniqueTextValues = new Set<string>()
const uniqueBoolValues = new Set<string>()

answers?.forEach(a => {
  if (a.text_value) {
    patterns.text_value++
    uniqueTextValues.add(a.text_value)
  }
  if (a.text_area_value) patterns.text_area_value++
  if (a.boolean_value !== null) {
    patterns.boolean_value++
    uniqueBoolValues.add(String(a.boolean_value))
  }
  if (a.choice_id) patterns.choice_id++

  if (!a.text_value && !a.text_area_value && a.boolean_value === null && !a.choice_id) {
    patterns.null_all++
  }
})

console.log('\nField usage:')
console.log(JSON.stringify(patterns, null, 2))

console.log('\nUnique text_value entries:', Array.from(uniqueTextValues).slice(0, 20))
console.log('Unique boolean_value entries:', Array.from(uniqueBoolValues))
