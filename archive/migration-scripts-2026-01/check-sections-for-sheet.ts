import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('=== Checking Sections for FennoCide Sheet ===\n')

  // Get the tags for this sheet
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Sheet tags:')
  sheetTags?.forEach(st => {
    const tag = st.tags as any
    console.log(`  - ${tag?.name}`)
  })

  const tagIds = sheetTags?.map(st => st.tag_id) || []

  // Get questions for these tags
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTags?.map(qt => qt.question_id))]

  // Get sections for these questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_section_id, sections!questions_parent_section_id_fkey(id, name, order_number)')
    .in('id', questionIds)

  const sectionMap = new Map()
  questions?.forEach(q => {
    const section = q.sections as any
    if (section?.id) {
      if (!sectionMap.has(section.id)) {
        sectionMap.set(section.id, {
          id: section.id,
          name: section.name,
          order_number: section.order_number,
          questionCount: 0
        })
      }
      sectionMap.get(section.id).questionCount++
    }
  })

  console.log('\n=== Sections that should be displayed ===')
  const sections = Array.from(sectionMap.values()).sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
  sections.forEach(s => {
    console.log(`${s.order_number}. ${s.name} (${s.questionCount} questions)`)
  })

  // Check which sections have imported answers
  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id')
    .eq('sheet_id', sheetId)

  const answeredQuestionIds = new Set(answers?.map(a => a.parent_question_id))

  console.log('\n=== Sections with imported answers ===')
  sections.forEach(s => {
    const sectionQuestions = questions?.filter(q => {
      const sec = q.sections as any
      return sec?.id === s.id
    })
    const answeredCount = sectionQuestions?.filter(q => answeredQuestionIds.has(q.id)).length || 0
    if (answeredCount > 0) {
      console.log(`${s.name}: ${answeredCount}/${s.questionCount} questions have answers`)
    }
  })
}

main().catch(console.error)
