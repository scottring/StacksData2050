import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function debugQuestion() {
  console.log('=== Debugging Question 3.1.1.1 ===\n')

  // Find section 3
  const { data: section3 } = await supabase
    .from('sections')
    .select('id, name, section_sort_number')
    .eq('section_sort_number', 3)
    .single()

  console.log('Section 3:', section3?.name)

  // Find subsection 3.1
  const { data: subsection } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('parent_section_id', section3?.id)
    .eq('order_number', 1)
    .single()

  console.log('Subsection 3.1:', subsection?.name)

  // Find question 3.1.1
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection?.id)
    .eq('order_number', 1)
    .order('order_number')

  console.log('\nQuestions with order_number = 1:')
  questions?.forEach(q => {
    console.log(`  ID: ${q.id}`)
    console.log(`  Name: ${q.name}`)
    console.log(`  Type: ${q.question_type}`)
    console.log(`  Order: ${q.order_number}`)
    console.log(`  Has parent question: ${!!q.parent_question_id}`)
    console.log(`  Parent question ID: ${q.parent_question_id}`)
    console.log('')
  })

  // Now check for sub-questions (3.1.1.1)
  if (questions && questions.length > 0) {
    const parentQuestionId = questions[0].id

    const { data: subQuestions } = await supabase
      .from('questions')
      .select('*')
      .eq('parent_question_id', parentQuestionId)
      .order('order_number')

    console.log('Sub-questions (3.1.1.X):')
    subQuestions?.forEach(q => {
      console.log(`  ID: ${q.id}`)
      console.log(`  Name: ${q.name}`)
      console.log(`  Type: ${q.question_type}`)
      console.log(`  Order: ${q.order_number}`)
      console.log('')
    })

    // Check for list table columns
    if (subQuestions && subQuestions.length > 0) {
      const subQ = subQuestions[0] // 3.1.1.1
      console.log(`Checking list table columns for question ${subQ.id}...`)

      const { data: columns } = await supabase
        .from('list_table_columns')
        .select('*')
        .eq('parent_question_id', subQ.id)
        .order('order_number')

      console.log(`Found ${columns?.length || 0} columns:`)
      columns?.forEach(col => {
        console.log(`  - ${col.name} (order: ${col.order_number})`)
      })

      // Check answers for this sheet
      const { data: answers } = await supabase
        .from('answers')
        .select('*')
        .eq('parent_question_id', subQ.id)
        .eq('sheet_id', sheetId)

      console.log(`\nFound ${answers?.length || 0} answers for this question on Hydrocarb sheet`)
      answers?.forEach(a => {
        console.log(`  Answer ID: ${a.id}`)
        console.log(`  Text value: ${a.text_value}`)
        console.log(`  List table row ID: ${a.list_table_row_id}`)
        console.log(`  List table column ID: ${a.list_table_column_id}`)
        console.log('')
      })
    }
  }
}

debugQuestion().catch(console.error)
