import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanup() {
  console.log('=== CLEANUP TEST/SYSTEM QUESTIONS (v2) ===\n')

  // Get questions to delete
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, bubble_id, name, section_name_sort, subsection_name_sort')

  if (error) {
    console.error('Error fetching questions:', error)
    return
  }

  // Identify questions to delete
  const toDelete: string[] = []

  for (const q of questions || []) {
    const sectionName = q.section_name_sort || ''
    const subsectionName = q.subsection_name_sort || ''
    const questionName = q.name || ''

    // Delete criteria
    const shouldDelete =
      // No section (unknown/system)
      sectionName === '' ||
      // Outside association section
      sectionName === 'Outside The Association - Section 1' ||
      // General section system questions
      subsectionName === 'General Section' ||
      subsectionName === 'Sub-section for company not in the association' ||
      subsectionName === 'Automatic #1' ||
      // Supplementary Materials (test section)
      sectionName === 'Supplementary Materials' ||
      // Rename new section (test)
      sectionName === 'Rename new section' ||
      // Test questions by name
      questionName.toLowerCase().includes('test question') ||
      questionName.toLowerCase().includes('is scott from') ||
      questionName.toLowerCase().includes('heather, can you see') ||
      /^Question #\s+\d+$/.test(questionName)

    if (shouldDelete) {
      toDelete.push(q.id)
    }
  }

  console.log(`Questions to delete: ${toDelete.length}`)
  console.log(`Questions to keep: ${(questions?.length || 0) - toDelete.length}\n`)

  if (toDelete.length === 0) {
    console.log('Nothing to delete!')
    return
  }

  // Step 1: Delete answers in batches
  console.log('Step 1: Deleting related answers...')

  // Get all answer IDs for these questions (handles both parent_question_id and originating_question_id)
  let totalAnswersDeleted = 0
  const batchSize = 500

  // Delete answers by parent_question_id
  for (let i = 0; i < toDelete.length; i += 10) {
    const questionBatch = toDelete.slice(i, i + 10)

    // First get answer IDs
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .in('parent_question_id', questionBatch)
      .limit(1000)

    if (answers && answers.length > 0) {
      const answerIds = answers.map(a => a.id)

      // Delete in smaller batches
      for (let j = 0; j < answerIds.length; j += batchSize) {
        const answerBatch = answerIds.slice(j, j + batchSize)
        const { error: delErr } = await supabase
          .from('answers')
          .delete()
          .in('id', answerBatch)

        if (delErr) {
          console.error('Error deleting answers:', delErr.message)
        } else {
          totalAnswersDeleted += answerBatch.length
        }
      }
    }

    if ((i + 10) % 20 === 0) {
      process.stdout.write(`  Processed ${Math.min(i + 10, toDelete.length)}/${toDelete.length} questions...\r`)
    }
  }

  // Also delete by originating_question_id
  for (let i = 0; i < toDelete.length; i += 10) {
    const questionBatch = toDelete.slice(i, i + 10)

    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .in('originating_question_id', questionBatch)
      .limit(1000)

    if (answers && answers.length > 0) {
      const answerIds = answers.map(a => a.id)

      for (let j = 0; j < answerIds.length; j += batchSize) {
        const answerBatch = answerIds.slice(j, j + batchSize)
        const { error: delErr } = await supabase
          .from('answers')
          .delete()
          .in('id', answerBatch)

        if (!delErr) {
          totalAnswersDeleted += answerBatch.length
        }
      }
    }
  }

  console.log(`\n  Deleted ${totalAnswersDeleted} answers`)

  // Step 2: Delete choices
  console.log('\nStep 2: Deleting related choices...')

  let totalChoicesDeleted = 0
  for (let i = 0; i < toDelete.length; i += 20) {
    const questionBatch = toDelete.slice(i, i + 20)

    const { data: choices, error: choiceErr } = await supabase
      .from('choices')
      .delete()
      .in('parent_question_id', questionBatch)
      .select('id')

    if (choices) {
      totalChoicesDeleted += choices.length
    }
  }

  console.log(`  Deleted ${totalChoicesDeleted} choices`)

  // Step 3: Delete questions
  console.log('\nStep 3: Deleting questions...')

  let totalQuestionsDeleted = 0
  for (let i = 0; i < toDelete.length; i += 20) {
    const batch = toDelete.slice(i, i + 20)
    const { data: deleted, error: qErr } = await supabase
      .from('questions')
      .delete()
      .in('id', batch)
      .select('id')

    if (qErr) {
      console.error(`  Error deleting batch: ${qErr.message}`)
    } else if (deleted) {
      totalQuestionsDeleted += deleted.length
    }
  }

  console.log(`  Deleted ${totalQuestionsDeleted} questions`)

  // Step 4: Clean up orphaned sections and subsections
  console.log('\nStep 4: Cleaning up orphaned sections...')

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name')

  const orphanedSections: string[] = []
  for (const section of sections || []) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('parent_section_id', section.id)

    if (count === 0) {
      orphanedSections.push(section.id)
      console.log(`  Found orphaned section: ${section.name}`)
    }
  }

  if (orphanedSections.length > 0) {
    // Delete subsections first
    for (const sectionId of orphanedSections) {
      await supabase
        .from('subsections')
        .delete()
        .eq('parent_section_id', sectionId)
    }

    // Delete sections
    await supabase
      .from('sections')
      .delete()
      .in('id', orphanedSections)

    console.log(`  Deleted ${orphanedSections.length} orphaned sections`)
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`\n=== CLEANUP COMPLETE ===`)
  console.log(`Final question count: ${finalCount}`)
}

cleanup().catch(console.error)
