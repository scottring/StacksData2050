import { supabase } from './src/migration/supabase-client.js'

async function checkSection4Structure() {
  console.log('=== Checking Section 4 Structure ===\n')

  // Get all section 4 sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, section_number, order_number')
    .or('section_number.like.4.%,section_number.eq.4')
    .order('order_number')

  if (!sections || sections.length === 0) {
    console.log('No section 4 sections found')
    return
  }

  console.log(`Found ${sections.length} sections:\n`)
  for (const s of sections) {
    console.log(`${s.section_number}: ${s.name}`)
  }

  // Now check for questions 4.3.4 and 4.3.5 regardless of section structure
  console.log('\n=== Searching for questions 4.3.4 and 4.3.5 ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_number, question_text')
    .in('question_number', ['4.3.4', '4.3.5'])

  if (questions && questions.length > 0) {
    console.log('Found questions:')
    for (const q of questions) {
      console.log(`${q.question_number}: ${q.question_text}`)
    }
  } else {
    console.log('Questions 4.3.4 and 4.3.5 do not exist in the questions table')
    
    // Check what questions DO exist around that range
    const { data: nearbyQuestions } = await supabase
      .from('questions')
      .select('id, question_number, question_text')
      .or('question_number.like.4.3.%,question_number.like.4.4.%')
      .order('question_number')
      .limit(20)

    if (nearbyQuestions && nearbyQuestions.length > 0) {
      console.log('\nNearby questions in 4.3.x and 4.4.x range:')
      for (const q of nearbyQuestions) {
        const text = q.question_text ? q.question_text.substring(0, 60) : '(no text)'
        console.log(`${q.question_number}: ${text}`)
      }
    }
  }
}

checkSection4Structure()
