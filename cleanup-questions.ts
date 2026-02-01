import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Questions to DELETE - clearly test/dummy data
const QUESTIONS_TO_DELETE = [
  // Pattern-matched test questions (from audit)
  '1d8fb025-1dbe-40ac-9fd0-17e23d55f934', // "Test question pulp" - Rename new section
  'c37ae106-4de6-4555-a7a6-e4fa7dce79bc', // "test question 14122023"
  'c05c0dce-8441-445a-887b-92e34ce1aed2', // "test question 09112023"
  'f0902102-a3f5-4004-a2a1-34d0adb6d277', // "Is it dark already?"
  '31d77677-ba03-41bc-88ef-2b812c78f865', // "Is it snowing?"
  'e3023ae2-0096-4c0e-9711-b523f0aba1a1', // "Test question Kaisa Tuesday"
  '405328d5-65f0-4095-ae8d-f4a894fd1414', // "Is Scott from New York"
  'f5f7e060-f969-4b93-9eb0-f273f76b1a7d', // "Heather, can you see my test question..."
  '827e2fe6-50a0-4f89-8003-7f46364953da', // "Question # 196"
  'ac6373e2-5b86-4bfe-8b80-dbf7a01bb74a', // "Question # 195"

  // Suspicious patterns - user confirmed deletion
  '7fa61d8a-af43-476e-aa1e-c93b693bc3cb', // "Rename new question" - Food contact
  '3a503698-da13-4e49-a7c2-337caa962b12', // "Rename new question" - BfR Empfehlung
  '08553b2f-a277-435e-8210-2e349c1792f4', // "Rename new question" - (no section)
  'cf5b8567-4e4d-47d6-888d-efb7c4b28be7', // "Rename new question" - (no section)
  '8cc4fd7d-ec57-4208-982e-d8ff834bab32', // "Unnamed Question" - Food Contact Compliance
  'a8de2bcb-5117-4495-9909-b8d1fc4127e2', // "Rename new question" - pulp question
  '1830bb29-b247-43f9-b7ee-b2d8ec2b10d5', // "COPY OF COPY OF..." - (no section)
  'e91127d9-1e56-4a9b-9113-876a9afc0765', // "COPY OF COPY OF..." - (no section)
]

// Sections that are clearly test sections - will delete questions AND section/subsection
const TEST_SECTIONS = [
  'test section 1',
  'Rename new section',
  'kfkfkfk',
  'Test Section',
]

// Questions that look suspicious but need manual review
const SUSPICIOUS_PATTERNS = [
  /^Rename new question$/i,
  /^Unnamed Question$/i,
  /^COPY OF COPY OF/i,
  /^Question #\s*\d+/,
]

async function cleanup() {
  console.log('=== CLEANUP TEST/DUMMY QUESTIONS ===\n')
  console.log('This script will show you exactly what will be deleted.\n')

  // Get all questions with section info
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id,
      bubble_id,
      name,
      content,
      order_number,
      section_sort_number,
      subsection_sort_number,
      subsection_id,
      subsections (
        id,
        name,
        section_id,
        sections (
          id,
          name
        )
      )
    `)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  if (error) {
    console.error('Error:', error)
    return
  }

  const toDelete: string[] = []
  const sectionsToDelete = new Set<string>()
  const subsectionsToDelete = new Set<string>()

  // Category 1: Explicitly listed test questions
  console.log('='.repeat(70))
  console.log('CATEGORY 1: EXPLICIT TEST QUESTIONS (will be deleted)')
  console.log('='.repeat(70))

  for (const qId of QUESTIONS_TO_DELETE) {
    const q = questions?.find(q => q.id === qId)
    if (q) {
      const sectionName = (q.subsections as any)?.sections?.name || '(no section)'
      console.log(`  ✗ "${q.name}"`)
      console.log(`    Section: ${sectionName}`)
      toDelete.push(q.id)
    }
  }

  console.log(`\n  Total: ${toDelete.length} questions\n`)

  // Category 2: Questions in test sections
  console.log('='.repeat(70))
  console.log('CATEGORY 2: QUESTIONS IN TEST SECTIONS (will be deleted)')
  console.log('='.repeat(70))

  let testSectionCount = 0
  for (const sectionName of TEST_SECTIONS) {
    const sectionQuestions = questions?.filter(q => {
      const name = (q.subsections as any)?.sections?.name || ''
      return name.toLowerCase() === sectionName.toLowerCase()
    }) || []

    if (sectionQuestions.length > 0) {
      console.log(`\n  Section: "${sectionName}" (${sectionQuestions.length} questions)`)

      for (const q of sectionQuestions) {
        if (!toDelete.includes(q.id)) {
          console.log(`    ✗ "${q.name}"`)
          toDelete.push(q.id)
          testSectionCount++

          // Track section/subsection for cleanup
          const sectionId = (q.subsections as any)?.sections?.id
          const subsectionId = (q.subsections as any)?.id
          if (sectionId) sectionsToDelete.add(sectionId)
          if (subsectionId) subsectionsToDelete.add(subsectionId)
        }
      }
    }
  }

  console.log(`\n  Total: ${testSectionCount} additional questions\n`)

  // Category 3: Suspicious patterns (for review)
  console.log('='.repeat(70))
  console.log('CATEGORY 3: SUSPICIOUS PATTERNS (review before deleting)')
  console.log('='.repeat(70))

  const suspiciousQuestions: typeof questions = []
  for (const q of questions || []) {
    if (toDelete.includes(q.id)) continue

    const name = q.name || ''
    const isSuspicious = SUSPICIOUS_PATTERNS.some(p => p.test(name))

    if (isSuspicious) {
      suspiciousQuestions.push(q)
      const sectionName = (q.subsections as any)?.sections?.name || '(no section)'
      console.log(`  ? "${name}"`)
      console.log(`    Section: ${sectionName}`)
      console.log(`    ID: ${q.id}`)
      console.log('')
    }
  }

  console.log(`  Total suspicious: ${suspiciousQuestions.length} questions`)
  console.log('  (These are NOT automatically deleted - add IDs to QUESTIONS_TO_DELETE if needed)\n')

  // Summary
  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  console.log(`  Questions to delete: ${toDelete.length}`)
  console.log(`  Sections to delete: ${sectionsToDelete.size}`)
  console.log(`  Subsections to delete: ${subsectionsToDelete.size}`)
  console.log(`  Questions remaining after cleanup: ${(questions?.length || 0) - toDelete.length}`)

  // Ask for confirmation
  console.log('\n' + '='.repeat(70))
  console.log('To proceed with deletion, run with --confirm flag')
  console.log('Example: npx tsx cleanup-questions.ts --confirm')
  console.log('='.repeat(70))

  if (process.argv.includes('--confirm')) {
    console.log('\n🔴 DELETING...\n')

    // Step 1: Delete answers
    console.log('Step 1: Deleting related answers...')
    let totalAnswersDeleted = 0

    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10)

      const { data: answers } = await supabase
        .from('answers')
        .select('id')
        .in('parent_question_id', batch)
        .limit(1000)

      if (answers && answers.length > 0) {
        const { error } = await supabase
          .from('answers')
          .delete()
          .in('id', answers.map(a => a.id))

        if (!error) totalAnswersDeleted += answers.length
      }
    }

    console.log(`  Deleted ${totalAnswersDeleted} answers`)

    // Step 2: Delete choices
    console.log('\nStep 2: Deleting related choices...')
    let totalChoicesDeleted = 0

    for (let i = 0; i < toDelete.length; i += 20) {
      const batch = toDelete.slice(i, i + 20)

      const { data: choices } = await supabase
        .from('choices')
        .delete()
        .in('parent_question_id', batch)
        .select('id')

      if (choices) totalChoicesDeleted += choices.length
    }

    console.log(`  Deleted ${totalChoicesDeleted} choices`)

    // Step 3: Delete question_tags
    console.log('\nStep 3: Deleting question_tags...')

    const { data: deletedTags } = await supabase
      .from('question_tags')
      .delete()
      .in('question_id', toDelete)
      .select('id')

    console.log(`  Deleted ${deletedTags?.length || 0} question_tags`)

    // Step 4: Delete questions
    console.log('\nStep 4: Deleting questions...')
    let totalQuestionsDeleted = 0

    for (let i = 0; i < toDelete.length; i += 20) {
      const batch = toDelete.slice(i, i + 20)

      const { data: deleted, error } = await supabase
        .from('questions')
        .delete()
        .in('id', batch)
        .select('id')

      if (error) {
        console.error(`  Error: ${error.message}`)
      } else if (deleted) {
        totalQuestionsDeleted += deleted.length
      }
    }

    console.log(`  Deleted ${totalQuestionsDeleted} questions`)

    // Step 5: Clean up empty subsections
    console.log('\nStep 5: Cleaning up empty subsections...')

    for (const subsectionId of subsectionsToDelete) {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subsection_id', subsectionId)

      if (count === 0) {
        await supabase.from('subsections').delete().eq('id', subsectionId)
      }
    }

    // Step 6: Clean up empty sections
    console.log('Step 6: Cleaning up empty sections...')

    for (const sectionId of sectionsToDelete) {
      const { count } = await supabase
        .from('subsections')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sectionId)

      if (count === 0) {
        await supabase.from('sections').delete().eq('id', sectionId)
      }
    }

    // Final count
    const { count: finalCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })

    console.log('\n✅ CLEANUP COMPLETE')
    console.log(`Final question count: ${finalCount}`)
  }
}

cleanup().catch(console.error)
