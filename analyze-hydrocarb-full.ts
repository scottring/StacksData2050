import { supabase } from './src/migration/supabase-client.js'

const HYDROCARB_VERSIONS = [
  { version: 1, id: '8a3424ae-49d9-4f8a-a4af-fda13a222b28', name: 'Version 1 (Original)' },
  { version: 2, id: '8222b70c-14dd-48ab-8ceb-e972c9d797c3', name: 'Version 2 (2022-08-25)' },
  { version: 3, id: 'fc48461e-7a18-4cb1-887e-1a3686244ef0', name: 'Version 3 (2025-04-08 - Current)' }
]

async function analyzeHydrocarbFull() {
  console.log('=== Full Analysis of HYDROCARB 90-ME 78% Versions ===\n')

  for (const v of HYDROCARB_VERSIONS) {
    console.log('='.repeat(80))
    console.log(`${v.name}`)
    console.log(`Sheet ID: ${v.id}`)
    console.log()

    // Get sheet details
    const { data: sheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('id', v.id)
      .single()

    if (sheet) {
      console.log('Sheet Details:')
      console.log(`  Created: ${sheet.created_at}`)
      console.log(`  Modified: ${sheet.modified_at}`)
      console.log(`  Version Lock: ${sheet.version_lock}`)
      console.log(`  Version Close Date: ${sheet.version_close_date}`)
      console.log(`  Closed By: ${sheet.version_closed_by}`)
      console.log(`  Archived: ${sheet.mark_as_archived}`)
    }

    // Get answer count
    const { count: answerCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', v.id)

    console.log(`\nAnswers: ${answerCount || 0}`)

    if (answerCount && answerCount > 0) {
      // Get answer timestamps
      const { data: answerTimestamps } = await supabase
        .from('answers')
        .select('created_at, modified_at')
        .eq('sheet_id', v.id)
        .order('created_at')

      if (answerTimestamps && answerTimestamps.length > 0) {
        const earliest = answerTimestamps[0].created_at
        const latest = answerTimestamps.reduce((max, a) =>
          a.modified_at > max ? a.modified_at : max,
          answerTimestamps[0].modified_at
        )

        console.log(`  Earliest answer: ${earliest}`)
        console.log(`  Latest modified: ${latest}`)
      }

      // Check if answers have version info
      const { data: sampleAnswers } = await supabase
        .from('answers')
        .select('id, version_copied, version_in_sheet, created_at, modified_at')
        .eq('sheet_id', v.id)
        .limit(5)

      console.log(`\n  Sample Answers:`)
      sampleAnswers?.forEach((answer, i) => {
        console.log(`    ${i + 1}. version_copied: ${answer.version_copied}, version_in_sheet: ${answer.version_in_sheet}`)
        console.log(`       created: ${answer.created_at}, modified: ${answer.modified_at}`)
      })

      // Check for unique questions answered
      const { data: uniqueQuestions } = await supabase
        .from('answers')
        .select('parent_question_id')
        .eq('sheet_id', v.id)

      const questionCount = new Set(uniqueQuestions?.map(a => a.parent_question_id)).size
      console.log(`\n  Unique questions answered: ${questionCount}`)
    }

    console.log()
  }

  // Analyze overlap between versions
  console.log('=== Version Comparison ===\n')

  for (let i = 0; i < HYDROCARB_VERSIONS.length - 1; i++) {
    const v1 = HYDROCARB_VERSIONS[i]
    const v2 = HYDROCARB_VERSIONS[i + 1]

    console.log(`Comparing ${v1.name} vs ${v2.name}:`)

    // Get questions answered in each version
    const { data: q1 } = await supabase
      .from('answers')
      .select('parent_question_id')
      .eq('sheet_id', v1.id)

    const { data: q2 } = await supabase
      .from('answers')
      .select('parent_question_id')
      .eq('sheet_id', v2.id)

    const set1 = new Set(q1?.map(a => a.parent_question_id) || [])
    const set2 = new Set(q2?.map(a => a.parent_question_id) || [])

    const inBoth = new Set([...set1].filter(x => set2.has(x)))
    const onlyIn1 = new Set([...set1].filter(x => !set2.has(x)))
    const onlyIn2 = new Set([...set2].filter(x => !set1.has(x)))

    console.log(`  Questions in both: ${inBoth.size}`)
    console.log(`  Only in ${v1.name}: ${onlyIn1.size}`)
    console.log(`  Only in ${v2.name}: ${onlyIn2.size}`)
    console.log()
  }

  // Summary and recommendation
  console.log('=== Summary ===\n')
  console.log('Bubble Versioning System:')
  console.log('  - Each sheet version is stored as a separate sheet record')
  console.log('  - Versions linked via father_sheet_id (original) and prev_sheet_id (previous)')
  console.log('  - Version numbers increment: 1, 2, 3, etc.')
  console.log('  - When closed: version_lock = true, version_close_date set')
  console.log('  - Current version has version_lock = false, version_close_date = null')
  console.log('  - Answers reference sheet via answers.sheet_id = sheets.id')
  console.log('  - Each version has its own complete set of answers (not shared)')
  console.log('\nVersion States:')
  console.log('  - Version 1: CLOSED (locked on 2022-08-25)')
  console.log('  - Version 2: CLOSED (locked on 2025-04-08)')
  console.log('  - Version 3: OPEN (current version, not locked)')
}

analyzeHydrocarbFull()
