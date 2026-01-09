import { supabase } from './src/migration/supabase-client.js'

async function checkAllSections() {
  console.log('=== All Sections in Database ===\n')

  const { data: sections, count } = await supabase
    .from('sections')
    .select('id, name, section_number, order_number', { count: 'exact' })
    .order('order_number')

  console.log(`Total sections: ${count}\n`)

  if (sections) {
    for (const s of sections.slice(0, 50)) {
      const num = s.section_number || '(no number)'
      console.log(`${num}: ${s.name}`)
    }
  }

  // Also check for questions that might be related to 4.3.4 or 4.3.5
  console.log('\n=== Checking for questions with "4.3" or "4.4" in number ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('question_number, question_text')
    .or('question_number.like.%4.3%,question_number.like.%4.4%')
    .order('question_number')
    .limit(30)

  if (questions && questions.length > 0) {
    for (const q of questions) {
      const text = q.question_text ? q.question_text.substring(0, 60) : '(no text)'
      console.log(`${q.question_number}: ${text}`)
    }
  } else {
    console.log('No questions found with 4.3 or 4.4 in number')
  }
}

checkAllSections()
