import { supabase } from './src/migration/supabase-client.js'

async function checkWhatIBroke() {
  console.log('=== Checking What Got Broken ===\n')

  // Check sections 1, 2, 3
  for (let sectionNum = 1; sectionNum <= 3; sectionNum++) {
    console.log(`\n=== Section ${sectionNum} ===\n`)

    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, section_sort_number, subsection_sort_number, order_number')
      .eq('section_sort_number', sectionNum)
      .order('subsection_sort_number', { ascending: true, nullsFirst: false })
      .order('order_number', { ascending: true })
      .limit(20)

    if (questions && questions.length > 0) {
      console.log(`Found ${questions.length} questions:\n`)
      for (const q of questions) {
        console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 50)}`)
      }
    } else {
      console.log('No questions found')
    }
  }

  // Check for questions that got messed up (null subsection where there shouldn't be)
  console.log('\n\n=== Questions with NULL subsection_sort_number in sections 1-3 ===\n')

  const { data: brokenQuestions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id')
    .in('section_sort_number', [1, 2, 3])
    .is('subsection_sort_number', null)

  if (brokenQuestions && brokenQuestions.length > 0) {
    console.log(`Found ${brokenQuestions.length} broken questions:\n`)
    for (const q of brokenQuestions) {
      console.log(`  Section ${q.section_sort_number}: ${q.name?.substring(0, 50)}`)
      console.log(`    parent_subsection_id: ${q.parent_subsection_id}`)
    }
  } else {
    console.log('No broken questions in sections 1-3')
  }
}

checkWhatIBroke()
