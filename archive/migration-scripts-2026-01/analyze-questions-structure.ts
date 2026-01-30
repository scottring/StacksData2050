import { supabase } from './src/migration/supabase-client.js'

async function analyzeStructure() {
  console.log('=== Analyzing Questions Table Structure ===\n')

  // Check if there's a question_number field
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .limit(50)

  if (!questions || questions.length === 0) {
    console.log('No questions found')
    return
  }

  console.log(`Total questions sampled: ${questions.length}\n`)

  // Check what fields exist
  console.log('Available fields in questions table:')
  const fields = Object.keys(questions[0])
  console.log(fields.join(', '))

  // Look for any field that might contain question numbering like "4.3.4"
  console.log('\n=== Searching for Question Numbering ===\n')

  const fieldsToCheck = ['question_id_number', 'name', 'section_name_sort', 'subsection_name_sort']

  for (const field of fieldsToCheck) {
    console.log(`\nField: ${field}`)
    const samples = questions.slice(0, 5).map(q => q[field])
    console.log(samples)
  }

  // Check if there are any questions with section numbers
  console.log('\n=== Looking for Section-Based Questions ===\n')

  const questionsWithSections = questions.filter(q => 
    q.section_name_sort && q.section_name_sort.includes('4')
  )

  console.log(`Questions with "4" in section_name_sort: ${questionsWithSections.length}`)

  if (questionsWithSections.length > 0) {
    console.log('\nSample:')
    for (const q of questionsWithSections.slice(0, 5)) {
      console.log(`  ${q.question_id_number}: ${q.section_name_sort} - ${q.name}`)
    }
  }

  // Check answers table structure
  console.log('\n\n=== Checking Answers Table Structure ===\n')

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .limit(5)

  if (answers && answers.length > 0) {
    console.log('Available fields in answers table:')
    const answerFields = Object.keys(answers[0])
    console.log(answerFields.join(', '))

    console.log('\nSample answer:')
    console.log(JSON.stringify(answers[0], null, 2))
  }
}

analyzeStructure()
