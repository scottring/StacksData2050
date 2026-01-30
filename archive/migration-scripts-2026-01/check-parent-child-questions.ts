import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkParentChildQuestions() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Checking Parent-Child Question Structure ===\n')

  // Get section 3
  const { data: section3 } = await supabase
    .from('sections')
    .select('*')
    .eq('order_number', 3)
    .single()

  console.log('Section 3:', section3?.name)

  // Get subsection 3.1
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section3?.id)
    .order('order_number')

  const subsection31 = subsections?.[0]
  console.log('Subsection 3.1:', subsection31?.name)

  // Get all questions in subsection 3.1
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection31?.id)
    .order('order_number')

  console.log(`\nQuestions in subsection 3.1: ${questions?.length || 0}\n`)

  // Get answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  questions?.forEach((q, idx) => {
    const questionAnswers = answers?.filter(a => a.parent_question_id === q.id) || []
    const childQuestions = questions?.filter(cq => cq.parent_question_id === q.id) || []

    console.log(`3.1.${idx + 1} ${q.name?.substring(0, 60)}...`)
    console.log(`  Question ID: ${q.id}`)
    console.log(`  order_number: ${q.order_number}`)
    console.log(`  question_type: ${q.question_type}`)
    console.log(`  parent_question_id: ${q.parent_question_id || 'NULL'}`)
    console.log(`  parent_sheet_id: ${q.parent_sheet_id || 'NULL'}`)
    console.log(`  Answers: ${questionAnswers.length}`)
    console.log(`  Child questions: ${childQuestions.length}`)

    if (childQuestions.length > 0) {
      childQuestions.forEach((cq, cIdx) => {
        const childAnswers = answers?.filter(a => a.parent_question_id === cq.id) || []
        console.log(`    → Child 3.1.${idx + 1}.${cIdx + 1} ${cq.name?.substring(0, 50)}...`)
        console.log(`       Question ID: ${cq.id}`)
        console.log(`       order_number: ${cq.order_number}`)
        console.log(`       question_type: ${cq.question_type}`)
        console.log(`       Answers: ${childAnswers.length}`)
      })
    }
    console.log('')
  })

  // Check if there are questions with parent_sheet_id
  const { data: sheetQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_sheet_id', sheetId)
    .order('section_sort_number, subsection_sort_number, order_number')

  console.log(`\n=== Questions with parent_sheet_id = ${sheetId} ===`)
  console.log(`Count: ${sheetQuestions?.length || 0}`)

  if (sheetQuestions && sheetQuestions.length > 0) {
    sheetQuestions.slice(0, 5).forEach(q => {
      console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name?.substring(0, 60)}`)
    })
  }
}

checkParentChildQuestions().catch(console.error)
