import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function checkTags() {
  // Get sheet tags
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Tags on this sheet:')
  sheetTags?.forEach(st => {
    console.log(`  - ${st.tags?.name}`)
  })

  const tagIds = sheetTags?.map(st => st.tag_id) || []

  // Get all questions for these tags
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTags?.map(qt => qt.question_id))]

  console.log(`\nQuestions associated with these tags: ${questionIds.length}`)

  // Get questions to see sections/subsections
  const { data: questions } = await supabase
    .from('questions')
    .select('id, section_sort_number, subsection_sort_number, order_number, parent_section_id, parent_subsection_id')
    .in('id', questionIds)

  // Get unique section IDs
  const sectionIds = [...new Set(questions?.map(q => q.parent_section_id).filter(Boolean))]
  console.log(`Sections for this sheet's tags: ${sectionIds.length}`)

  // Get unique subsection IDs
  const subsectionIds = [...new Set(questions?.map(q => q.parent_subsection_id).filter(Boolean))]
  console.log(`Subsections for this sheet's tags: ${subsectionIds.length}`)
}

checkTags().catch(console.error)
