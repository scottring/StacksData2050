import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function showQuestionsAndTags() {
  console.log('=== Sheet Tags and Questions ===\n')

  // Get sheet info
  const { data: sheet } = await supabase
    .from('sheets')
    .select('name')
    .eq('id', sheetId)
    .single()

  console.log('Sheet:', sheet?.name)
  console.log()

  // Get sheet tags
  const { data: sheetTagsData } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Tags on this sheet:')
  sheetTagsData?.forEach(st => {
    console.log(`  - ${st.tags?.name} (ID: ${st.tag_id})`)
  })
  console.log()

  const tagIds = sheetTagsData?.map(st => st.tag_id) || []

  // Get questions for these tags
  const { data: questionTagsData } = await supabase
    .from('question_tags')
    .select('question_id, tag_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTagsData?.map(qt => qt.question_id))]

  console.log(`Total questions for these tags: ${questionIds.length}`)
  console.log()

  // Get the questions with their full details
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  // Group by section
  const questionsBySection = new Map()
  questions?.forEach(q => {
    const sectionNum = q.section_sort_number
    if (!questionsBySection.has(sectionNum)) {
      questionsBySection.set(sectionNum, [])
    }
    questionsBySection.get(sectionNum).push(q)
  })

  console.log('Questions by Section:\n')

  for (const [sectionNum, sectionQuestions] of questionsBySection) {
    console.log(`Section ${sectionNum}: ${sectionQuestions.length} questions`)

    // Show first 3 questions in each section
    sectionQuestions.slice(0, 3).forEach((q: any) => {
      const num = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      console.log(`  ${num} ${q.name?.substring(0, 60)}...`)
    })

    if (sectionQuestions.length > 3) {
      console.log(`  ... and ${sectionQuestions.length - 3} more`)
    }
    console.log()
  }

  // Show which tags each question belongs to
  console.log('\n=== Sample: First 10 Questions with Their Tags ===\n')

  for (const q of questions?.slice(0, 10) || []) {
    const num = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
    console.log(`${num} ${q.name?.substring(0, 50)}`)

    // Get tags for this question
    const { data: qTags } = await supabase
      .from('question_tags')
      .select('tag_id, tags(name)')
      .eq('question_id', q.id)

    qTags?.forEach(qt => {
      console.log(`    → ${qt.tags?.name}`)
    })
    console.log()
  }
}

showQuestionsAndTags().catch(console.error)
