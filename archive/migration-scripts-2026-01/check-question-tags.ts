import { supabase } from './src/migration/supabase-client.js'

async function checkQuestionTags() {
  console.log('=== Checking Questions 4.3.4 and 4.3.5 in Database ===\n')

  // Search for questions that might be 4.3.4 or 4.3.5
  // They might have different numbering in the new structure
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, question_number, question_text, tags')
    .order('question_number')
    .limit(500)

  if (!allQuestions) {
    console.log('No questions found')
    return
  }

  console.log(`Total questions in database: ${allQuestions.length}\n`)

  // Look for questions that might correspond to 4.3.4 or 4.3.5
  // Check for any questions with "4" in the number
  const section4Questions = allQuestions.filter(q =>
    q.question_number && (q.question_number.startsWith('4.') || q.question_number.includes('.4.'))
  )

  console.log(`Questions in section 4: ${section4Questions.length}\n`)

  if (section4Questions.length > 0) {
    console.log('Sample section 4 questions:')
    for (const q of section4Questions.slice(0, 30)) {
      const text = q.question_text ? q.question_text.substring(0, 50) : '(no text)'
      const tags = q.tags ? JSON.stringify(q.tags) : 'no tags'
      console.log(`${q.question_number}: ${text}... [${tags}]`)
    }
  }

  // Also check the section structure - maybe it was renumbered
  console.log('\n=== Checking Section Structure ===\n')

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, section_number, parent_section_id')
    .order('section_number')
    .limit(100)

  if (sections && sections.length > 0) {
    console.log(`Total sections: ${sections.length}\n`)
    console.log('First 20 sections:')
    for (const s of sections.slice(0, 20)) {
      const num = s.section_number || '(no number)'
      console.log(`${num}: ${s.name}`)
    }
  } else {
    console.log('No sections found')
  }
}

checkQuestionTags()
