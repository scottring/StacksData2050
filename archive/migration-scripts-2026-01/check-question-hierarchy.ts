import { supabase } from './src/migration/supabase-client.js'

async function checkQuestionHierarchy() {
  console.log('🔍 Analyzing Question Hierarchy Issues\n')

  // Check for NULL parent_subsection_id
  const { data: orphanedQuestions, error: e1 } = await supabase
    .from('questions')
    .select('id, bubble_id, parent_subsection_id, section_sort_number, subsection_sort_number, order_number, question_text')
    .is('parent_subsection_id', null)

  console.log('📊 Questions with NULL parent_subsection_id:')
  console.log(`   Found: ${orphanedQuestions?.length || 0} out of 222 total`)
  if (orphanedQuestions && orphanedQuestions.length > 0) {
    console.log('   Sample:')
    orphanedQuestions.slice(0, 3).forEach(q => {
      console.log(`   - ${q.bubble_id}: "${q.question_text?.substring(0, 50)}..."`)
    })
  }
  console.log()

  // Check for NULL sort numbers
  const { data: missingSort, error: e2 } = await supabase
    .from('questions')
    .select('id, bubble_id, parent_subsection_id, section_sort_number, subsection_sort_number, order_number, question_text')
    .or('section_sort_number.is.null,subsection_sort_number.is.null,order_number.is.null')

  console.log('📊 Questions with NULL sort numbers:')
  console.log(`   Found: ${missingSort?.length || 0} out of 222 total`)
  if (missingSort && missingSort.length > 0) {
    console.log('   Sample:')
    missingSort.slice(0, 3).forEach(q => {
      console.log(`   - ${q.bubble_id}: section=${q.section_sort_number}, subsection=${q.subsection_sort_number}, order=${q.order_number}`)
      console.log(`     Text: "${q.question_text?.substring(0, 50)}..."`)
    })
  }
  console.log()

  // Get total questions with complete hierarchy
  const { count: completeCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .not('parent_subsection_id', 'is', null)
    .not('section_sort_number', 'is', null)
    .not('subsection_sort_number', 'is', null)
    .not('order_number', 'is', null)

  console.log('📊 Questions with COMPLETE hierarchy:')
  console.log(`   Found: ${completeCount || 0} out of 222 total`)
  console.log()

  // Summary
  const totalQuestions = 222
  const orphaned = orphanedQuestions?.length || 0
  const missingSortNums = missingSort?.length || 0
  const complete = completeCount || 0

  console.log('=' .repeat(80))
  console.log('SUMMARY')
  console.log('=' .repeat(80))
  console.log(`Total questions: ${totalQuestions}`)
  console.log(`✅ Complete hierarchy: ${complete} (${Math.round(complete/totalQuestions*100)}%)`)
  console.log(`❌ Missing parent_subsection_id: ${orphaned}`)
  console.log(`❌ Missing sort numbers: ${missingSortNums}`)
  console.log()

  if (orphaned > 0 || missingSortNums > 0) {
    console.log('🔧 RECOMMENDED FIXES:')
    if (orphaned > 0) {
      console.log('   1. Run restore-question-data.ts to re-sync from Bubble')
    }
    if (missingSortNums > 0) {
      console.log('   2. Run fix-subsection-order-from-bubble.ts to fix numbering')
    }
  } else {
    console.log('✅ All questions have complete hierarchy!')
  }
}

checkQuestionHierarchy().catch(console.error)
