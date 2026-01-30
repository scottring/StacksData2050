import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const sheetId = '0e21cabb-84f4-43a6-8e77-614e9941a734'

  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id, choice_id, text_value, list_table_row_id')
    .eq('sheet_id', sheetId)

  const questionIds = [...new Set(answers?.map(a => a.parent_question_id).filter(Boolean))]

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_section_id')
    .in('id', questionIds)

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .order('order_number')

  console.log('=== IMPORTED ANSWERS BY SECTION ===')
  console.log('Total answers:', answers?.length)
  console.log()

  for (const section of sections || []) {
    const sectionQuestions = questions?.filter(q => q.parent_section_id === section.id) || []
    const sectionQIds = sectionQuestions.map(q => q.id)
    const sectionAnswers = answers?.filter(a => sectionQIds.includes(a.parent_question_id!)) || []

    if (sectionAnswers.length === 0) continue

    const withChoice = sectionAnswers.filter(a => a.choice_id).length
    const withText = sectionAnswers.filter(a => a.text_value && !a.choice_id).length
    const listTableRows = sectionAnswers.filter(a => a.list_table_row_id).length

    console.log(`Section ${section.order_number}: ${section.name}`)
    console.log(`  Questions with answers: ${sectionQuestions.length}`)
    console.log(`  - With choice_id (dropdown): ${withChoice}`)
    console.log(`  - With text_value only: ${withText}`)
    console.log(`  - List table cells: ${listTableRows}`)
    console.log()
  }
}

check().catch(console.error)
