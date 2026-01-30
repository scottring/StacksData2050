import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function check() {
  // Find questions with section_sort_number = 3 (Biocides)
  const { data: biocidesQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 3)
    .order('subsection_sort_number')
    .order('order_number')
    .limit(20)

  console.log('Questions in section 3 (Biocides):\n')
  biocidesQuestions?.forEach(q => {
    const questionNum = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
    const nameOrContent = q.name || (q.content ? q.content.substring(0, 60) : 'NO NAME')
    console.log(`  ${questionNum} ${nameOrContent}`)
    console.log(`    Type: ${q.question_type}`)
    console.log(`    ID: ${q.id}`)
    console.log(`    Parent Q ID: ${q.parent_question_id || 'none'}`)
    console.log('')
  })

  // Find Biocides section
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('name', 'Biocides')
    .single()

  // Now check the list table question 3.1.2
  const listTableQ = biocidesQuestions?.find(q => q.question_type === 'List table')

  if (listTableQ) {
    console.log('\n=== Checking List Table Question 3.1.2 ===')
    console.log('Question ID:', listTableQ.id)
    console.log('Question Name:', listTableQ.name)

    // Get list table columns
    const { data: cols } = await supabase
      .from('list_table_columns')
      .select('*')
      .eq('parent_question_id', listTableQ.id)
      .order('order_number')

    console.log(`\nList table columns (${cols?.length || 0}):`)
    cols?.forEach(c => console.log(`  - ${c.name} (order: ${c.order_number})`))

    // Get answers for this question on Hydrocarb sheet
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('parent_question_id', listTableQ.id)
      .eq('sheet_id', sheetId)

    console.log(`\nAnswers for Hydrocarb sheet (${answers?.length || 0}):`)
    answers?.slice(0, 10).forEach(a => {
      console.log(`  Row: ${a.list_table_row_id}, Col: ${a.list_table_column_id}`)
      console.log(`  Value: ${a.text_value}`)
      console.log('')
    })

    // Check if there are any list_table_rows
    if (answers && answers.length > 0 && answers[0].list_table_row_id) {
      const rowIds = [...new Set(answers.map(a => a.list_table_row_id))]
      console.log(`Unique row IDs: ${rowIds.length}`)

      const { data: rows } = await supabase
        .from('list_table_rows')
        .select('*')
        .in('id', rowIds)

      console.log(`\nList table rows (${rows?.length || 0}):`)
      rows?.forEach(r => {
        console.log(`  Row ID: ${r.id}, Order: ${r.order_number}`)
      })
    }
  }
}

check().catch(console.error)

// Check if those column IDs exist anywhere
const colIds = ['b200b510-3ad3-4826-a942-7671b7556898', '7481500b-5aa2-4731-929f-8483ef6e5434', 'c609f59f-1676-4e1d-b506-9531aa9b6167', '774040d8-ca9b-49a6-b728-f3b7dcab7c2f', '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b']

const { data: orphanedCols } = await supabase
  .from('list_table_columns')
  .select('*')
  .in('id', colIds)

console.log('\n=== Looking for orphaned column IDs ===')
orphanedCols?.forEach(c => {
  console.log(`Column: ${c.name}`)
  console.log(`  Parent Question: ${c.parent_question_id}`)
  console.log(`  Order: ${c.order_number}`)
  console.log('')
})

if (!orphanedCols || orphanedCols.length === 0) {
  console.log('❌ None of those column IDs exist in list_table_columns!')
  console.log('This is the problem - answers reference columns that don\'t exist')
}

check().catch(console.error)
