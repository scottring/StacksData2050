import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function debugSection11() {
  console.log('=== Investigating Section 1.1 ===\n')

  // Get Section 1
  const { data: section1 } = await supabase
    .from('sections')
    .select('*')
    .eq('order_number', 1)
    .single()

  console.log('Section 1:', section1?.name)
  console.log('Section 1 ID:', section1?.id)
  console.log()

  // Get all subsections in Section 1
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section1?.id)
    .order('order_number')

  console.log('Subsections in Section 1:')
  subsections?.forEach(ss => {
    console.log(`  1.${ss.order_number} ${ss.name} (ID: ${ss.id})`)
  })
  console.log()

  // Find subsection 1.1
  const subsection11 = subsections?.find(ss => ss.order_number === 1)

  if (!subsection11) {
    console.log('❌ Subsection 1.1 not found!')
    return
  }

  console.log('Subsection 1.1:', subsection11.name)
  console.log('Subsection 1.1 ID:', subsection11.id)
  console.log()

  // Get all questions in subsection 1.1
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection11.id)
    .order('order_number')

  console.log(`Questions in subsection 1.1: ${questions?.length || 0}`)
  questions?.forEach(q => {
    console.log(`  1.1.${q.order_number} ${q.name}`)
    console.log(`    Question ID: ${q.id}`)
    console.log(`    Question type: ${q.question_type}`)
  })
  console.log()

  // Check if there are answers for these questions on this sheet
  console.log('Checking for answers on this sheet...\n')

  for (const q of questions || []) {
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('sheet_id', sheetId)
      .eq('parent_question_id', q.id)

    console.log(`  Question 1.1.${q.order_number}: ${answers?.length || 0} answers`)
    if (answers && answers.length > 0) {
      console.log(`    Latest answer version: ${answers[0].version_in_sheet}`)
      console.log(`    Answer value: ${answers[0].text_value || answers[0].text_area_value || answers[0].number_value || '(choice/other)'}`)
    }
  }

  // Check what the query logic would do
  console.log('\n=== What the current query logic does ===\n')
  console.log('Current logic:')
  console.log('1. Gets ALL answers for the sheet')
  console.log('2. Deduplicates by parent_question_id (keeps most recent by version)')
  console.log('3. Gets unique question IDs from answers')
  console.log('4. Only shows sections/subsections that have answered questions')
  console.log()

  const questionIds = questions?.map(q => q.id) || []

  const { data: answersForSection } = await supabase
    .from('answers')
    .select('parent_question_id')
    .eq('sheet_id', sheetId)
    .in('parent_question_id', questionIds)

  const answeredQuestionIds = new Set(answersForSection?.map(a => a.parent_question_id))

  console.log(`Questions with answers in section 1.1: ${answeredQuestionIds.size}`)
  console.log()

  if (answeredQuestionIds.size === 0) {
    console.log('❌ PROBLEM: No questions in section 1.1 have answers')
    console.log('   Therefore, section 1.1 will not be displayed')
    console.log()
    console.log('Possible causes:')
    console.log('  - Answers exist but with different parent_question_id')
    console.log('  - Answers exist but filtered out by version logic')
    console.log('  - Questions migrated but answers did not')
  } else {
    console.log('✅ Section 1.1 should be showing')
  }
}

debugSection11().catch(console.error)
