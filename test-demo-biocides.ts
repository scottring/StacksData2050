import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testDemoBiocides() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Testing Demo Page Biocides Rendering ===\n')

  // Simulate what the demo page does

  // Get section 3
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  const section3 = sections?.find(s => s.order_number === 3)

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section3?.id)
    .order('order_number')

  const subsection31 = subsections?.[0]

  // Get questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection31?.id)
    .order('order_number')

  // Get answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  // Group answers by question
  const answersByQuestion = new Map<string, any[]>()
  answers?.forEach(answer => {
    const qid = answer.parent_question_id
    if (!answersByQuestion.has(qid)) {
      answersByQuestion.set(qid, [])
    }
    answersByQuestion.get(qid)!.push(answer)
  })

  // Filter to questions with answers
  const questionsWithAnswers = questions?.filter(q => answersByQuestion.has(q.id)) || []

  console.log(`Section: ${section3?.name}`)
  console.log(`Subsection: ${subsection31?.name}`)
  console.log(`Total questions: ${questions?.length || 0}`)
  console.log(`Questions with answers: ${questionsWithAnswers.length}\n`)

  // Build hierarchy like demo page does
  const childrenByParent = new Map<string, any[]>()
  questionsWithAnswers.forEach(q => {
    if (q.dependent_no_show) {
      // Find parent by looking at order_number - 1
      const potentialParent = questionsWithAnswers.find(pq =>
        pq.parent_subsection_id === q.parent_subsection_id &&
        pq.order_number === (q.order_number || 0) - 1
      )
      if (potentialParent) {
        if (!childrenByParent.has(potentialParent.id)) {
          childrenByParent.set(potentialParent.id, [])
        }
        childrenByParent.get(potentialParent.id)!.push(q)
      }
    }
  })

  // Show what will be rendered
  const topLevelQuestions = questionsWithAnswers.filter(q => !q.dependent_no_show)

  console.log('=== What Will Be Rendered ===\n')

  topLevelQuestions.forEach((q, idx) => {
    const questionNumber = `3.1.${idx + 1}`
    const questionAnswers = answersByQuestion.get(q.id) || []
    const children = childrenByParent.get(q.id) || []

    console.log(`${questionNumber} ${q.name?.substring(0, 60)}... [${questionAnswers.length} answers]`)

    if (children.length > 0) {
      children.forEach((child, childIdx) => {
        const childNumber = `${questionNumber}.${childIdx + 1}`
        const childAnswers = answersByQuestion.get(child.id) || []
        console.log(`  ${childNumber} ${child.name?.substring(0, 60)}... [${childAnswers.length} answers]`)
      })
    }
  })

  console.log('\n=== Expected vs Actual ===')
  console.log('Expected: 3.1.2 should display as 3.1.1.1 (child of 3.1.1)')
  console.log('Expected: 3.1.3-3.1.10 should display as 3.1.2-3.1.9')
  console.log('\nActual rendering above should match this pattern')
}

testDemoBiocides().catch(console.error)
