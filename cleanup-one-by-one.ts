import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function deleteAnswersForQuestion(questionId: string): Promise<number> {
  let totalDeleted = 0
  let hasMore = true

  while (hasMore) {
    // Get a small batch of answer IDs
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .or(`parent_question_id.eq.${questionId},originating_question_id.eq.${questionId}`)
      .limit(100)

    if (!answers || answers.length === 0) {
      hasMore = false
      break
    }

    // Delete this batch
    const ids = answers.map(a => a.id)
    const { error } = await supabase
      .from('answers')
      .delete()
      .in('id', ids)

    if (error) {
      console.log(`    Error deleting answers: ${error.message}`)
      await sleep(1000) // Wait and retry
    } else {
      totalDeleted += ids.length
    }

    await sleep(100) // Small delay between batches
  }

  return totalDeleted
}

async function cleanup() {
  console.log('=== CLEANUP TEST/SYSTEM QUESTIONS (one by one) ===\n')

  // Get questions to delete
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_name_sort, subsection_name_sort')

  // Identify questions to delete
  const toDelete: { id: string; name: string; section: string }[] = []

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
      toDelete.push({
        id: q.id,
        name: questionName.substring(0, 40),
        section: sectionName || '(no section)'
      })
    }
  }

  console.log(`Questions to delete: ${toDelete.length}`)
  console.log(`Questions to keep: ${(questions?.length || 0) - toDelete.length}\n`)

  // Delete one question at a time
  let deletedCount = 0
  let totalAnswersDeleted = 0

  for (let i = 0; i < toDelete.length; i++) {
    const q = toDelete[i]
    console.log(`[${i + 1}/${toDelete.length}] Deleting: "${q.name}..." (${q.section})`)

    // Delete answers first
    const answersDeleted = await deleteAnswersForQuestion(q.id)
    totalAnswersDeleted += answersDeleted
    if (answersDeleted > 0) {
      console.log(`    Deleted ${answersDeleted} answers`)
    }

    // Delete choices
    const { data: deletedChoices } = await supabase
      .from('choices')
      .delete()
      .eq('parent_question_id', q.id)
      .select('id')

    if (deletedChoices && deletedChoices.length > 0) {
      console.log(`    Deleted ${deletedChoices.length} choices`)
    }

    // Delete the question
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', q.id)

    if (error) {
      console.log(`    ERROR: ${error.message}`)
    } else {
      deletedCount++
    }

    await sleep(200) // Small delay between questions
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Deleted ${deletedCount}/${toDelete.length} questions`)
  console.log(`Deleted ${totalAnswersDeleted} answers total`)

  // Final count
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`\nFinal question count: ${count}`)
}

cleanup().catch(console.error)
