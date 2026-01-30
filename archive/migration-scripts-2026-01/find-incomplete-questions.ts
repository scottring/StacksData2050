import { supabase } from './src/migration/supabase-client.js'

async function findIncompleteQuestions() {
  console.log('🔍 Finding questions with incomplete hierarchy\n')

  // Get all questions
  const { data: allQuestions, error } = await supabase
    .from('questions')
    .select('id, bubble_id, parent_subsection_id, section_sort_number, subsection_sort_number, order_number')

  if (error || !allQuestions) {
    console.log('❌ Could not fetch questions:', error?.message)
    return
  }

  console.log(`Total questions: ${allQuestions.length}`)
  console.log()

  // Find incomplete ones
  const incomplete = allQuestions.filter(q =>
    !q.parent_subsection_id ||
    q.section_sort_number === null ||
    q.subsection_sort_number === null ||
    q.order_number === null
  )

  console.log(`Incomplete questions: ${incomplete.length}`)
  console.log()

  if (incomplete.length > 0) {
    console.log('Details of incomplete questions:')
    incomplete.slice(0, 10).forEach((q, i) => {
      console.log(`\n${i + 1}. Bubble ID: ${q.bubble_id}`)
      console.log(`   parent_subsection_id: ${q.parent_subsection_id || 'NULL'}`)
      console.log(`   section_sort_number: ${q.section_sort_number ?? 'NULL'}`)
      console.log(`   subsection_sort_number: ${q.subsection_sort_number ?? 'NULL'}`)
      console.log(`   order_number: ${q.order_number ?? 'NULL'}`)
    })
    if (incomplete.length > 10) {
      console.log(`\n... and ${incomplete.length - 10} more`)
    }
  } else {
    console.log('✅ All questions have complete hierarchy!')
  }

  // Also check: are there questions with hierarchy but wrong values?
  const complete = allQuestions.filter(q =>
    q.parent_subsection_id &&
    q.section_sort_number !== null &&
    q.subsection_sort_number !== null &&
    q.order_number !== null
  )

  console.log(`\nComplete questions: ${complete.length}`)
  console.log(`\nBreakdown:`)
  console.log(`  ✅ Complete: ${complete.length}`)
  console.log(`  ❌ Incomplete: ${incomplete.length}`)
  console.log(`  = Total: ${allQuestions.length}`)
}

findIncompleteQuestions().catch(console.error)
