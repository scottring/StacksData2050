import { supabase } from './src/migration/supabase-client.js'

async function checkHydrocarbSection4() {
  console.log('=== Checking HYDROCARB Section 4 Questions ===\n')

  const hydrocarbId = 'd8bcf82a-02c0-45f4-a7b9-b63ede46f3d6'

  // Get all section 4 questions for HYDROCARB
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id')
    .eq('parent_sheet_id', hydrocarbId)
    .eq('section_sort_number', 4)
    .order('subsection_sort_number', { ascending: true, nullsFirst: false })
    .order('order_number', { ascending: true })

  if (!questions) {
    console.log('No questions found')
    return
  }

  console.log(`Total Section 4 questions in HYDROCARB: ${questions.length}\n`)

  // Group by subsection
  const bySubsection = new Map<number | null, any[]>()
  for (const q of questions) {
    const key = q.subsection_sort_number
    if (!bySubsection.has(key)) {
      bySubsection.set(key, [])
    }
    bySubsection.get(key)!.push(q)
  }

  // Show each subsection
  const sortedKeys = Array.from(bySubsection.keys()).sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a - b
  })

  for (const subNum of sortedKeys) {
    const subQuestions = bySubsection.get(subNum)!
    if (subNum === null) {
      console.log(`\nSubsection NULL: ${subQuestions.length} questions`)
    } else {
      console.log(`\nSubsection 4.${subNum}: ${subQuestions.length} questions`)
    }

    for (const q of subQuestions) {
      const questionNum = subNum !== null ? `4.${subNum}.${q.order_number}` : `4.?.${q.order_number}`
      console.log(`  ${questionNum}: ${q.name?.substring(0, 60)}`)
    }
  }

  // Look for the specific question that should be 4.8.1
  console.log('\n=== Looking for "Other relevant national legislations" Table ===\n')

  const { data: tableQuestion } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id, bubble_id')
    .eq('parent_sheet_id', hydrocarbId)
    .ilike('name', '%other relevant national%')
    .maybeSingle()

  if (tableQuestion) {
    console.log('Found question:')
    console.log(`  Name: ${tableQuestion.name}`)
    console.log(`  Current numbering: ${tableQuestion.section_sort_number}.${tableQuestion.subsection_sort_number}.${tableQuestion.order_number}`)
    console.log(`  Bubble ID: ${tableQuestion.bubble_id}`)
    console.log(`  parent_subsection_id: ${tableQuestion.parent_subsection_id}`)

    // Check what subsection this references
    if (tableQuestion.parent_subsection_id) {
      const { data: subsection } = await supabase
        .from('subsections')
        .select('id, name, order_number, bubble_id')
        .eq('id', tableQuestion.parent_subsection_id)
        .maybeSingle()

      if (subsection) {
        console.log(`\n  Subsection in DB:`)
        console.log(`    Name: ${subsection.name}`)
        console.log(`    Order: ${subsection.order_number}`)
        console.log(`    Bubble ID: ${subsection.bubble_id}`)
      } else {
        console.log(`\n  Subsection NOT FOUND in DB`)
      }
    }
  } else {
    console.log('Question NOT FOUND')
  }
}

checkHydrocarbSection4()
