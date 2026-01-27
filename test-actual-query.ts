import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function testQuery() {
  console.log('=== Testing the actual query from queries.ts ===\n')

  // Step 1: Get sheet tags
  const { data: sheetTagsData } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTagsData?.map(st => st.tag_id) || []
  console.log('Sheet tag IDs:', tagIds)

  // Step 2: Get questions for these tags
  let questionIdsForSheet: string[] = []
  if (tagIds.length > 0) {
    const { data: questionTagsData } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds)
    questionIdsForSheet = [...new Set(questionTagsData?.map(qt => qt.question_id) || [])]
  }

  console.log(`Question IDs for sheet: ${questionIdsForSheet.length}`)

  // Step 3: Get the actual questions
  let allQuestions: any[] = []
  if (questionIdsForSheet.length > 0) {
    const { data: allQuestionsData } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIdsForSheet)
      .order('section_sort_number', { ascending: true })
      .order('subsection_sort_number', { ascending: true })
      .order('order_number', { ascending: true })
    allQuestions = allQuestionsData || []
  }

  console.log(`Total questions returned: ${allQuestions.length}\n`)

  // Filter to section 2.1
  const section21 = allQuestions.filter(q =>
    q.section_sort_number === 2 && q.subsection_sort_number === 1
  )

  console.log('=== Questions in Section 2.1 ===')
  section21.forEach(q => {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name?.substring(0, 70)}`)
    console.log(`  ID: ${q.id}`)
  })
  console.log(`\nTotal in 2.1: ${section21.length}`)

  // Check for the problematic question
  const problematicId = '20b98a71-714c-4b91-aca9-4448018376ec'
  const hasProblematic = allQuestions.some(q => q.id === problematicId)

  console.log(`\nDoes query include problematic question (2.1.5)? ${hasProblematic}`)
}

testQuery().catch(console.error)
