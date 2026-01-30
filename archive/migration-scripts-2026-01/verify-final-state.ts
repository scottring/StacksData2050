import { supabase } from './src/migration/supabase-client.js'

async function verifyFinalState() {
  console.log('=== Final Verification of Question Numbering Fix ===\n')

  // Overall statistics
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })

  const { count: nullCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .is('subsection_sort_number', null)

  const { count: fixedCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .not('subsection_sort_number', 'is', null)

  console.log('Overall Statistics:')
  console.log(`  Total questions: ${totalCount}`)
  console.log(`  Questions fixed: ${fixedCount}`)
  console.log(`  Questions remaining null: ${nullCount}`)
  console.log(`  Percentage complete: ${Math.round((fixedCount! / totalCount!) * 100)}%\n`)

  // Check section 4 (Food Contact) specifically
  console.log('=== Section 4 (Food Contact) Breakdown ===\n')

  const { data: section4Questions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id')
    .eq('section_sort_number', 4)
    .order('subsection_sort_number', { ascending: true, nullsFirst: false })
    .order('order_number', { ascending: true })

  if (section4Questions) {
    const bySubsection = new Map<number, any[]>()
    const nullSubsection: any[] = []

    for (const q of section4Questions) {
      if (q.subsection_sort_number === null) {
        nullSubsection.push(q)
      } else {
        if (!bySubsection.has(q.subsection_sort_number)) {
          bySubsection.set(q.subsection_sort_number, [])
        }
        bySubsection.get(q.subsection_sort_number)!.push(q)
      }
    }

    console.log(`Total Section 4 questions: ${section4Questions.length}`)
    console.log(`Questions with subsection numbers: ${section4Questions.length - nullSubsection.length}`)
    console.log(`Questions still null: ${nullSubsection.length}\n`)

    // Show subsection 8 specifically (the missing 4.8.x questions)
    if (bySubsection.has(8)) {
      console.log('Subsection 4.8 (Other relevant national legislations):')
      const sub8Questions = bySubsection.get(8)!
      for (const q of sub8Questions) {
        console.log(`  4.8.${q.order_number}: ${q.name?.substring(0, 60)}...`)
      }
      console.log()
    }

    // Show a few questions from each subsection
    console.log('Sample questions by subsection:')
    const sortedSubsections = Array.from(bySubsection.keys()).sort((a, b) => a - b)
    for (const subNum of sortedSubsections.slice(0, 10)) {
      const questions = bySubsection.get(subNum)!
      console.log(`  4.${subNum}: ${questions.length} questions`)
      if (questions.length > 0) {
        console.log(`    First: 4.${subNum}.${questions[0].order_number}: ${questions[0].name?.substring(0, 50)}`)
      }
    }
    console.log()

    // Show remaining null questions
    if (nullSubsection.length > 0) {
      console.log('Remaining questions with null subsection_sort_number:')
      for (const q of nullSubsection.slice(0, 10)) {
        console.log(`  ${q.name?.substring(0, 60)}`)
        console.log(`    ID: ${q.id}`)
        console.log(`    parent_subsection_id: ${q.parent_subsection_id}`)
      }
    }
  }

  // Check HYDROCARB specifically
  console.log('\n=== HYDROCARB 90-ME 78% Verification ===\n')

  const hydrocarbId = 'd8bcf82a-02c0-45f4-a7b9-b63ede46f3d6'

  const { data: hydrocarbQuestions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number')
    .eq('parent_sheet_id', hydrocarbId)
    .eq('section_sort_number', 4)
    .gte('subsection_sort_number', 8)
    .order('subsection_sort_number', { ascending: true })
    .order('order_number', { ascending: true })
    .limit(20)

  if (hydrocarbQuestions && hydrocarbQuestions.length > 0) {
    console.log('Questions 4.8+ in HYDROCARB:')
    for (const q of hydrocarbQuestions) {
      console.log(`  4.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 60)}`)
    }
  } else {
    console.log('No questions found in subsection 4.8+ for HYDROCARB')
  }

  console.log('\n=== Verification Complete ===')
}

verifyFinalState()
