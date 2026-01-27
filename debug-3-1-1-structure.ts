import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function debugStructure() {
  console.log('Looking at section 3.1 structure\n')

  // Get section 3
  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('order_number', 3)
    .single()

  console.log('Section 3:', section?.name)
  console.log()

  // Get subsections in section 3
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section?.id)
    .order('order_number')

  console.log('Subsections:')
  subsections?.forEach(ss => {
    console.log(`  3.${ss.order_number} ${ss.name}`)
  })
  console.log()

  // Get the first subsection (3.1)
  const subsection31 = subsections?.[0]

  // Get questions in subsection 3.1
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection31?.id)
    .order('order_number')

  console.log('Questions in subsection 3.1:')
  questions?.forEach(q => {
    console.log(`  3.1.${q.order_number} ${q.name?.substring(0, 80)}`)
    console.log(`    Type: ${q.question_type}`)
    console.log(`    ID: ${q.id}`)
  })

  // Check if there are answers with list_table data for these questions
  console.log('\nChecking for list table answers...')

  for (const q of questions || []) {
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('sheet_id', sheetId)
      .eq('parent_question_id', q.id)
      .not('list_table_row_id', 'is', null)
      .limit(5)

    if (answers && answers.length > 0) {
      console.log(`\n  Question 3.1.${q.order_number} has ${answers.length} list table answers`)
      console.log(`    First answer: row=${answers[0].list_table_row_id}, col=${answers[0].list_table_column_id}`)
      console.log(`    Value: ${answers[0].text_value || answers[0].number_value}`)
    }
  }
}

debugStructure().catch(console.error)
