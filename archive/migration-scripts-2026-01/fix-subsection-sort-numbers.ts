import { supabase } from './src/migration/supabase-client.js'

async function fixSubsectionSortNumbers() {
  console.log('=== Fixing Subsection Sort Numbers ===\n')

  // Strategy: For each question with parent_subsection_id, look up the subsection's order_number
  // and populate the question's subsection_sort_number

  const { data: questionsToFix } = await supabase
    .from('questions')
    .select('id, bubble_id, name, parent_subsection_id, subsection_sort_number')
    .is('subsection_sort_number', null)
    .not('parent_subsection_id', 'is', null)

  if (!questionsToFix || questionsToFix.length === 0) {
    console.log('No questions to fix')
    return
  }

  console.log(`Found ${questionsToFix.length} questions with null subsection_sort_number\n`)

  let fixed = 0
  let failed = 0
  let notFound = 0

  for (const question of questionsToFix) {
    // Look up the subsection
    const { data: subsection } = await supabase
      .from('subsections')
      .select('order_number')
      .eq('id', question.parent_subsection_id)
      .maybeSingle()

    if (subsection && subsection.order_number !== null) {
      // Update the question
      const { error } = await supabase
        .from('questions')
        .update({ subsection_sort_number: subsection.order_number })
        .eq('id', question.id)

      if (error) {
        console.log(`❌ Failed to update question ${question.id}: ${error.message}`)
        failed++
      } else {
        fixed++
        if (fixed % 20 === 0) {
          console.log(`Progress: ${fixed} questions fixed...`)
        }
      }
    } else {
      notFound++
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Subsection not found: ${notFound}`)
  console.log(`Failed: ${failed}`)
}

fixSubsectionSortNumbers()
