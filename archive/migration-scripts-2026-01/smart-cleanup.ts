import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanup() {
  console.log('=== SMART CLEANUP ===\n')

  // Get questions to delete
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_name_sort, subsection_name_sort')

  const toDelete: { id: string; name: string }[] = []

  for (const q of questions || []) {
    const sectionName = q.section_name_sort || ''
    const subsectionName = q.subsection_name_sort || ''
    const questionName = q.name || ''

    const shouldDelete =
      sectionName === '' ||
      sectionName === 'Outside The Association - Section 1' ||
      subsectionName === 'General Section' ||
      subsectionName === 'Sub-section for company not in the association' ||
      subsectionName === 'Automatic #1' ||
      sectionName === 'Supplementary Materials' ||
      sectionName === 'Rename new section' ||
      questionName.toLowerCase().includes('test question') ||
      questionName.toLowerCase().includes('is scott from') ||
      questionName.toLowerCase().includes('heather, can you see') ||
      /^Question #\s+\d+$/.test(questionName)

    if (shouldDelete) {
      toDelete.push({ id: q.id, name: questionName })
    }
  }

  console.log(`Total questions to delete: ${toDelete.length}\n`)

  // Check which ones have answers
  const withAnswers: { id: string; name: string; count: number }[] = []
  const withoutAnswers: { id: string; name: string }[] = []

  for (const q of toDelete) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .or(`parent_question_id.eq.${q.id},originating_question_id.eq.${q.id}`)

    if (count && count > 0) {
      withAnswers.push({ ...q, count })
    } else {
      withoutAnswers.push(q)
    }
  }

  console.log(`Questions WITHOUT answers (easy to delete): ${withoutAnswers.length}`)
  console.log(`Questions WITH answers (need careful deletion): ${withAnswers.length}\n`)

  if (withAnswers.length > 0) {
    console.log('Questions with answers:')
    withAnswers.forEach(q => {
      console.log(`  - "${q.name?.substring(0, 50)}..." : ${q.count} answers`)
    })
  }

  // Delete questions without answers first
  console.log('\n--- Deleting questions WITHOUT answers ---')

  let deletedCount = 0
  for (const q of withoutAnswers) {
    // Delete choices first
    await supabase.from('choices').delete().eq('parent_question_id', q.id)

    // Delete question
    const { error } = await supabase.from('questions').delete().eq('id', q.id)

    if (!error) {
      deletedCount++
    } else {
      console.log(`  Error deleting ${q.name?.substring(0, 30)}: ${error.message}`)
    }
  }
  console.log(`Deleted ${deletedCount} questions without answers`)

  // For questions with answers, we need to handle them differently
  if (withAnswers.length > 0) {
    console.log('\n--- Handling questions WITH answers ---')

    for (const q of withAnswers) {
      console.log(`\nProcessing: "${q.name?.substring(0, 40)}..." (${q.count} answers)`)

      // Delete answers in very small batches
      let remaining = q.count
      while (remaining > 0) {
        const { data: answers } = await supabase
          .from('answers')
          .select('id')
          .or(`parent_question_id.eq.${q.id},originating_question_id.eq.${q.id}`)
          .limit(50)

        if (!answers || answers.length === 0) break

        const ids = answers.map(a => a.id)
        const { error } = await supabase.from('answers').delete().in('id', ids)

        if (error) {
          console.log(`  Error: ${error.message}`)
          // Try even smaller batch
          for (const id of ids.slice(0, 10)) {
            await supabase.from('answers').delete().eq('id', id)
          }
        }

        remaining -= ids.length
        process.stdout.write(`  Deleted batch, ~${remaining} remaining\r`)
      }

      // Now delete choices and question
      await supabase.from('choices').delete().eq('parent_question_id', q.id)
      const { error } = await supabase.from('questions').delete().eq('id', q.id)

      if (error) {
        console.log(`  Could not delete question: ${error.message}`)
      } else {
        console.log(`  Deleted question successfully`)
        deletedCount++
      }
    }
  }

  // Clean up orphaned sections/subsections
  console.log('\n--- Cleaning up orphaned sections ---')

  const { data: orphanedSubsections } = await supabase
    .from('subsections')
    .select('id, name')

  for (const sub of orphanedSubsections || []) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    if (count === 0) {
      await supabase.from('subsections').delete().eq('id', sub.id)
      console.log(`  Deleted orphaned subsection: ${sub.name}`)
    }
  }

  const { data: orphanedSections } = await supabase
    .from('sections')
    .select('id, name')

  for (const sec of orphanedSections || []) {
    const { count: qCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('parent_section_id', sec.id)

    const { count: subCount } = await supabase
      .from('subsections')
      .select('*', { count: 'exact', head: true })
      .eq('parent_section_id', sec.id)

    if (qCount === 0 && subCount === 0) {
      await supabase.from('sections').delete().eq('id', sec.id)
      console.log(`  Deleted orphaned section: ${sec.name}`)
    }
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`\n=== COMPLETE ===`)
  console.log(`Final question count: ${finalCount}`)
}

cleanup().catch(console.error)
