import { supabase } from './src/migration/supabase-client.js'

async function checkQuestionSheets() {
  console.log('=== Checking Question-Sheet Relationship ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_sheet_id, bubble_id, section_sort_number, subsection_sort_number, order_number')
    .not('section_sort_number', 'is', null)
    .limit(5)

  if (!questions || questions.length === 0) {
    console.log('No questions found')
    return
  }

  for (const q of questions) {
    console.log(`Question: ${q.name?.substring(0, 50)}`)
    console.log(`  Numbering: ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`)
    console.log(`  Parent sheet ID: ${q.parent_sheet_id}`)
    console.log(`  Bubble ID: ${q.bubble_id}`)

    if (q.parent_sheet_id) {
      const { data: sheet } = await supabase
        .from('sheets')
        .select('id, name, bubble_id')
        .eq('id', q.parent_sheet_id)
        .maybeSingle()

      if (sheet) {
        console.log(`  Sheet: ${sheet.name}`)
        console.log(`  Sheet Bubble ID: ${sheet.bubble_id}`)
      } else {
        console.log(`  Sheet: NOT FOUND`)
      }
    }
    console.log()
  }
}

checkQuestionSheets()
