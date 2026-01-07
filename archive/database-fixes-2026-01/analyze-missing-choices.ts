import { supabase } from './src/migration/supabase-client.js'

// Get all questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, question_type')

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

// Create set of question IDs that have choices
const questionsWithChoices = new Set(allChoices?.map(c => c.parent_question_id))

// Question types that SHOULD have choices
const shouldHaveChoices = [
  'Select one Radio',
  'Select one',
  'dropdown',
  'Dropdown',
  'single_choice',
  'radio',
  'Radio',
  'select'
]

// Question types that SHOULDN'T need choices
const shouldNotHaveChoices = [
  'Text',
  'text',
  'Text Area',
  'textarea',
  'Number',
  'number',
  'Date',
  'date',
  'List table',
  'File Upload',
  'file_upload'
]

console.log('=== ANALYZING MISSING CHOICES ===\n')

const missingChoices: any[] = []

for (const q of questions || []) {
  const hasChoices = questionsWithChoices.has(q.id)
  const qType = q.question_type || 'unknown'

  // If it's a type that should have choices but doesn't
  if (shouldHaveChoices.includes(qType) && !hasChoices) {
    missingChoices.push(q)
  }
}

console.log(`Total questions: ${questions?.length}`)
console.log(`Questions with choices: ${questionsWithChoices.size}`)
console.log(`Questions MISSING choices (but should have): ${missingChoices.length}\n`)

// Group by question type
const byType = new Map<string, any[]>()
missingChoices.forEach(q => {
  const type = q.question_type || 'unknown'
  if (!byType.has(type)) byType.set(type, [])
  byType.get(type)!.push(q)
})

console.log('=== MISSING CHOICES BY TYPE ===')
for (const [type, qs] of byType.entries()) {
  console.log(`\n${type}: ${qs.length} questions`)
  qs.slice(0, 3).forEach(q => {
    console.log(`  - ${q.name?.substring(0, 80)}`)
  })
  if (qs.length > 3) {
    console.log(`  ... and ${qs.length - 3} more`)
  }
}

console.log('\n\n=== ALL QUESTION TYPES IN DATABASE ===')
const allTypes = new Map<string, number>()
questions?.forEach(q => {
  const type = q.question_type || 'unknown'
  allTypes.set(type, (allTypes.get(type) || 0) + 1)
})

Array.from(allTypes.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const withChoices = questions?.filter(q => q.question_type === type && questionsWithChoices.has(q.id)).length || 0
    console.log(`${type}: ${count} total, ${withChoices} with choices`)
  })
