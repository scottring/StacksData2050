import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyDemoData() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Verifying Demo Page Data Structure ===\n')

  // Fetch sheet
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', sheetId)
    .single()

  if (sheetError) {
    console.error('Sheet error:', sheetError)
    return
  }

  console.log('✓ Sheet:', sheet.name)

  // Fetch company
  if (sheet.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', sheet.company_id)
      .single()
    console.log('✓ Company:', company?.name || 'Not found')
    console.log('  Location:', company?.location_text || 'N/A')
  }

  // Fetch contact user
  if (sheet.contact_user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', sheet.contact_user_id)
      .single()
    console.log('✓ Contact:', user?.full_name || 'Not found')
    console.log('  Email:', user?.email || 'N/A')
    console.log('  Phone:', user?.phone_text || 'N/A')
  }

  // Fetch sections
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  console.log(`\n✓ Sections: ${sections?.length || 0}`)
  sections?.slice(0, 5).forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.name}`)
  })

  // Fetch subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .order('order_number')

  console.log(`\n✓ Subsections: ${subsections?.length || 0}`)

  // Fetch questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('section_sort_number, subsection_sort_number, order_number')

  console.log(`✓ Questions: ${questions?.length || 0}`)

  // Fetch answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log(`✓ Answers: ${answers?.length || 0}`)

  // Group answers by question
  const answersByQuestion = new Map<string, any[]>()
  answers?.forEach(answer => {
    const qid = answer.parent_question_id
    if (!answersByQuestion.has(qid)) {
      answersByQuestion.set(qid, [])
    }
    answersByQuestion.get(qid)!.push(answer)
  })

  console.log(`✓ Unique questions with answers: ${answersByQuestion.size}`)

  // Find questions with answers and build hierarchy
  const questionsWithAnswers = questions?.filter(q => answersByQuestion.has(q.id)) || []

  console.log('\n=== Questions with Answers by Section ===\n')

  const sortedSections = [...(sections || [])].sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

  for (let sectionIdx = 0; sectionIdx < sortedSections.length; sectionIdx++) {
    const section = sortedSections[sectionIdx]
    const sectionNumber = sectionIdx + 1

    const sectionSubsections = subsections?.filter(s => s.section_id === section.id)
      .sort((a, b) => (a.order_number || 999) - (b.order_number || 999)) || []

    const subsectionsWithQuestions = sectionSubsections.map((sub, subIdx) => ({
      subsection: sub,
      subsectionNumber: subIdx + 1,
      questions: questionsWithAnswers
        .filter(q => q.parent_subsection_id === sub.id)
        .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))
    })).filter(sub => sub.questions.length > 0)

    const directQuestions = questionsWithAnswers
      .filter(q => q.parent_section_id === section.id && !q.parent_subsection_id)
      .sort((a, b) => (a.order_number || 999) - (b.order_number || 999))

    const totalQuestions = directQuestions.length + subsectionsWithQuestions.reduce((acc, s) => acc + s.questions.length, 0)

    if (totalQuestions > 0) {
      console.log(`${sectionNumber}. ${section.name} (${totalQuestions} questions)`)

      // Show direct questions
      if (directQuestions.length > 0) {
        directQuestions.forEach((q, qIdx) => {
          const questionNumber = `${sectionNumber}.${qIdx + 1}`
          const questionAnswers = answersByQuestion.get(q.id) || []
          console.log(`  ${questionNumber} ${q.name?.substring(0, 60)}... [${questionAnswers.length} answers]`)

          // Show answer details for list tables
          if (q.question_type === 'List table') {
            const rowIds = new Set(questionAnswers.map(a => a.list_table_row_id).filter(Boolean))
            console.log(`    → List table with ${rowIds.size} rows`)
          }
        })
      }

      // Show subsections
      subsectionsWithQuestions.forEach(({ subsection, subsectionNumber, questions: subQuestions }) => {
        console.log(`  ${sectionNumber}.${subsectionNumber} ${subsection.name}`)
        subQuestions.forEach((q, qIdx) => {
          const questionNumber = `${sectionNumber}.${subsectionNumber}.${qIdx + 1}`
          const questionAnswers = answersByQuestion.get(q.id) || []
          console.log(`    ${questionNumber} ${q.name?.substring(0, 60)}... [${questionAnswers.length} answers]`)

          // Show answer details for list tables
          if (q.question_type === 'List table') {
            const rowIds = new Set(questionAnswers.map(a => a.list_table_row_id).filter(Boolean))
            console.log(`      → List table with ${rowIds.size} rows`)
          }
        })
      })
    }
  }

  // Verify list table columns
  console.log('\n=== List Table Verification ===\n')

  const listTableQuestions = questionsWithAnswers.filter(q => q.question_type === 'List table')
  console.log(`✓ List table questions: ${listTableQuestions.length}`)

  for (const q of listTableQuestions.slice(0, 3)) {
    const questionAnswers = answersByQuestion.get(q.id) || []
    const { data: columns } = await supabase
      .from('list_table_columns')
      .select('*')
      .eq('parent_table_id', q.list_table_id)
      .order('order_number')

    console.log(`\nQuestion: ${q.name?.substring(0, 60)}...`)
    console.log(`  List Table ID: ${q.list_table_id}`)
    console.log(`  Columns: ${columns?.map(c => c.name).join(', ') || 'None'}`)

    const rowIds = new Set(questionAnswers.map(a => a.list_table_row_id).filter(Boolean))
    console.log(`  Rows: ${rowIds.size}`)
    console.log(`  Total answer cells: ${questionAnswers.length}`)
  }

  console.log('\n=== Summary ===\n')
  console.log(`Total answers: ${answers?.length || 0}`)
  console.log(`Questions with answers: ${answersByQuestion.size}`)
  console.log(`Expected to display all 205 answers across the sections`)
}

verifyDemoData().catch(console.error)
