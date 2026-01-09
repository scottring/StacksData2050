import { supabase } from './src/migration/supabase-client.js'

async function checkSection43Questions() {
  console.log('=== Checking Section 4.3 Questions ===\n')

  // Get section 4.3
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, section_number')
    .eq('section_number', '4.3')
    .maybeSingle()

  if (!section) {
    console.log('Section 4.3 not found')
    return
  }

  console.log(`Section: ${section.name}`)
  console.log(`Section ID: ${section.id}\n`)

  // Get all questions in section 4.3
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_number, question_text')
    .like('question_number', '4.3.%')
    .order('question_number')

  if (!questions || questions.length === 0) {
    console.log('No questions found in section 4.3')
    return
  }

  console.log(`Found ${questions.length} questions:\n`)
  for (const q of questions) {
    const text = q.question_text ? q.question_text.substring(0, 80) : '(no text)'
    console.log(`${q.question_number}: ${text}`)
  }
}

checkSection43Questions()
