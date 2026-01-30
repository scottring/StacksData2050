import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function verifyTagFiltering() {
  console.log('=== Verifying Tag-Based Filtering ===\n')

  // Get sheet tags
  const { data: sheetTagsData } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Sheet tags:')
  sheetTagsData?.forEach(st => console.log(`  - ${st.tags?.name}`))

  const tagIds = sheetTagsData?.map(st => st.tag_id) || []
  console.log('\nSheet tag IDs:', tagIds)
  console.log()

  // Get questions for these tags (mimicking the frontend logic)
  let questionIdsForSheet: string[] = []
  if (tagIds.length > 0) {
    const { data: questionTagsData } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds)
    questionIdsForSheet = [...new Set(questionTagsData?.map(qt => qt.question_id) || [])]
  }

  console.log(`Total questions for sheet tags: ${questionIdsForSheet.length}`)
  console.log()

  // Get questions in section 2.1
  let section21Questions: any[] = []
  if (questionIdsForSheet.length > 0) {
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIdsForSheet)
      .eq('section_sort_number', 2)
      .eq('subsection_sort_number', 1)
      .order('order_number', { ascending: true })
    section21Questions = questionsData || []
  }

  console.log('=== Questions in Section 2.1 (after tag filtering) ===')
  section21Questions.forEach(q => {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name?.substring(0, 70)}`)
  })
  console.log(`\nTotal: ${section21Questions.length}`)

  // Check for question 2.1.5
  const has215 = section21Questions.some(q => q.order_number === 5)
  console.log(`\n✓ Question 2.1.5 present: ${has215}`)

  // Check the problematic question directly
  const problematicId = '20b98a71-714c-4b91-aca9-4448018376ec'
  const hasProblematic = questionIdsForSheet.includes(problematicId)

  console.log(`✓ Problematic question (${problematicId}) in results: ${hasProblematic}`)

  if (hasProblematic) {
    console.log('\n❌ PROBLEM: Question 2.1.5 should NOT be included (only has HQ2.1 tag)')
  } else {
    console.log('\n✅ SUCCESS: Question 2.1.5 correctly filtered out!')
  }

  // Check section 1.1
  let section11Questions: any[] = []
  if (questionIdsForSheet.length > 0) {
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIdsForSheet)
      .eq('section_sort_number', 1)
      .eq('subsection_sort_number', 1)
      .order('order_number', { ascending: true })
    section11Questions = questionsData || []
  }

  console.log('\n=== Section 1.1 Check ===')
  if (section11Questions.length > 0) {
    console.log(`✅ Section 1.1 has ${section11Questions.length} questions (should display even without answers)`)
    section11Questions.forEach(q => {
      console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name?.substring(0, 60)}`)
    })
  } else {
    console.log('❌ No questions in section 1.1 - check if this section has matching tags')
  }
}

verifyTagFiltering().catch(console.error)
