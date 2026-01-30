import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Excel IDs from the reconciliation - these are the MATCHED questions we want to KEEP
const EXCEL_IDS = new Set<string>()

async function loadExcelIds() {
  // We'll identify Supabase-only by checking which bubble_ids DON'T match Excel
  // For now, we'll use section/subsection names to identify test data
}

async function cleanup() {
  console.log('=== CLEANUP TEST/SYSTEM QUESTIONS ===\n')

  // Get all questions with their section info
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id,
      bubble_id,
      name,
      question_type,
      section_name_sort,
      subsection_name_sort,
      parent_section_id,
      parent_subsection_id
    `)

  if (error) {
    console.error('Error fetching questions:', error)
    return
  }

  console.log(`Total questions in Supabase: ${questions?.length}\n`)

  // Categorize questions to delete
  const toDelete: { id: string; reason: string; name: string; section: string }[] = []

  for (const q of questions || []) {
    const sectionName = q.section_name_sort || ''
    const subsectionName = q.subsection_name_sort || ''
    const questionName = q.name || ''

    // 1. "Unknown section" / system questions - no valid section
    if (
      sectionName === '' ||
      sectionName === 'Outside The Association - Section 1' ||
      sectionName === 'General Section' ||
      subsectionName === 'Sub-section for company not in the association' ||
      subsectionName === 'General Section' ||
      subsectionName === 'Automatic #1'
    ) {
      toDelete.push({
        id: q.id,
        reason: 'System/unknown section',
        name: questionName.substring(0, 50),
        section: `${sectionName} > ${subsectionName}`
      })
      continue
    }

    // 2. "Supplementary Materials" - test section
    if (sectionName === 'Supplementary Materials') {
      toDelete.push({
        id: q.id,
        reason: 'Test section (Supplementary Materials)',
        name: questionName.substring(0, 50),
        section: sectionName
      })
      continue
    }

    // 3. Obvious test questions by name
    if (
      questionName.toLowerCase().includes('test question') ||
      questionName.toLowerCase().includes('is scott from') ||
      questionName.toLowerCase().includes('heather, can you see') ||
      questionName.match(/^Question #\s+\d+$/)
    ) {
      toDelete.push({
        id: q.id,
        reason: 'Test question (by name)',
        name: questionName.substring(0, 50),
        section: sectionName
      })
      continue
    }
  }

  // Group by reason for display
  const byReason = new Map<string, typeof toDelete>()
  for (const item of toDelete) {
    const items = byReason.get(item.reason) || []
    items.push(item)
    byReason.set(item.reason, items)
  }

  console.log('=== QUESTIONS TO DELETE ===\n')
  let totalToDelete = 0

  for (const [reason, items] of byReason.entries()) {
    console.log(`\n${reason} (${items.length} questions):`)
    items.slice(0, 10).forEach(item => {
      console.log(`  - "${item.name || '(no name)'}..."`)
      console.log(`    Section: ${item.section}`)
    })
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`)
    }
    totalToDelete += items.length
  }

  console.log(`\n=== TOTAL TO DELETE: ${totalToDelete} questions ===\n`)

  // Check for related data that would be orphaned
  const questionIds = toDelete.map(q => q.id)

  // Check answers
  const { count: answerCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .in('parent_question_id', questionIds)

  console.log(`Related answers that will be orphaned: ${answerCount || 0}`)

  // Check choices
  const { count: choiceCount } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .in('parent_question_id', questionIds)

  console.log(`Related choices that will be deleted: ${choiceCount || 0}`)

  // Proceed with deletion
  console.log('\n=== DELETING... ===\n')

  // Delete in order: answers first, then choices, then questions
  if (answerCount && answerCount > 0) {
    const { error: ansErr } = await supabase
      .from('answers')
      .delete()
      .in('parent_question_id', questionIds)

    if (ansErr) {
      console.error('Error deleting answers:', ansErr)
    } else {
      console.log(`Deleted ${answerCount} orphaned answers`)
    }
  }

  if (choiceCount && choiceCount > 0) {
    const { error: choiceErr } = await supabase
      .from('choices')
      .delete()
      .in('parent_question_id', questionIds)

    if (choiceErr) {
      console.error('Error deleting choices:', choiceErr)
    } else {
      console.log(`Deleted ${choiceCount} related choices`)
    }
  }

  // Delete questions in batches
  const batchSize = 50
  for (let i = 0; i < questionIds.length; i += batchSize) {
    const batch = questionIds.slice(i, i + batchSize)
    const { error: qErr } = await supabase
      .from('questions')
      .delete()
      .in('id', batch)

    if (qErr) {
      console.error(`Error deleting questions batch ${i / batchSize + 1}:`, qErr)
    }
  }

  console.log(`Deleted ${questionIds.length} test/system questions`)

  // Now check for orphaned sections/subsections
  console.log('\n=== CHECKING FOR ORPHANED SECTIONS ===\n')

  // Get sections with no questions
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name')

  const orphanedSections: { id: string; name: string }[] = []

  for (const section of sections || []) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('parent_section_id', section.id)

    if (count === 0) {
      orphanedSections.push({ id: section.id, name: section.name })
    }
  }

  if (orphanedSections.length > 0) {
    console.log(`Found ${orphanedSections.length} orphaned sections:`)
    orphanedSections.forEach(s => console.log(`  - ${s.name}`))

    // Delete orphaned subsections first
    for (const section of orphanedSections) {
      const { error: subErr } = await supabase
        .from('subsections')
        .delete()
        .eq('parent_section_id', section.id)

      if (subErr) {
        console.error(`Error deleting subsections for ${section.name}:`, subErr)
      }
    }

    // Delete orphaned sections
    const { error: secErr } = await supabase
      .from('sections')
      .delete()
      .in('id', orphanedSections.map(s => s.id))

    if (secErr) {
      console.error('Error deleting orphaned sections:', secErr)
    } else {
      console.log(`Deleted ${orphanedSections.length} orphaned sections`)
    }
  } else {
    console.log('No orphaned sections found')
  }

  // Final count
  const { count: finalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`\n=== FINAL QUESTION COUNT: ${finalCount} ===`)
}

cleanup().catch(console.error)
