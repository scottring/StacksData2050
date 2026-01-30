import { supabase } from './src/migration/supabase-client.js'

async function debugAnswerMismatch() {
  console.log('=== Debugging Answer Mismatch ===\n')

  // Take one example: Testproduct_Omya_A v2
  const sheetId = 'fe3718be-608f-4c59-91a4-88a35b536b50'
  const bubbleId = '1633694151545x385267416349016060'

  console.log('Sheet: Testproduct_Omya_A (v2)')
  console.log(`Sheet ID: ${sheetId}`)
  console.log(`Bubble ID: ${bubbleId}\n`)

  // Check answers by sheet_id
  const { count: bySheetId } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log(`Answers with sheet_id = ${sheetId}: ${bySheetId}`)

  // Get actual answers and check their sheet_id
  const { data: answers } = await supabase
    .from('answers')
    .select('id, sheet_id, bubble_id')
    .eq('bubble_id', '1633694151545x485267416349016060') // One of the answer bubble IDs

  console.log(`\nChecking a sample answer:`)
  if (answers && answers.length > 0) {
    const answer = answers[0]
    console.log(`  Answer ID: ${answer.id}`)
    console.log(`  Answer bubble_id: ${answer.bubble_id}`)
    console.log(`  Answer sheet_id: ${answer.sheet_id}`)
    console.log(`  Does sheet_id match our V2 sheet? ${answer.sheet_id === sheetId}`)

    // Get the sheet this answer is attached to
    const { data: answerSheet } = await supabase
      .from('sheets')
      .select('id, name, version, bubble_id')
      .eq('id', answer.sheet_id)
      .single()

    if (answerSheet) {
      console.log(`\n  Answer is attached to:`)
      console.log(`    Name: ${answerSheet.name}`)
      console.log(`    Version: ${answerSheet.version}`)
      console.log(`    Sheet Bubble ID: ${answerSheet.bubble_id}`)
    }
  }

  // The key question: Are the answers attached to V1 instead of V2?
  console.log('\n=== Hypothesis: Answers are attached to V1, not V2 ===\n')

  const { data: v1Sheet } = await supabase
    .from('sheets')
    .select('id, name, version')
    .eq('name', 'Testproduct_Omya_A')
    .eq('version', 1)
    .maybeSingle()

  if (v1Sheet) {
    console.log(`V1 sheet exists:`)
    console.log(`  ID: ${v1Sheet.id}`)

    const { count: v1Answers } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', v1Sheet.id)

    console.log(`  Answers: ${v1Answers}`)

    if (v1Answers && v1Answers > 0) {
      console.log(`\n✓ CONFIRMED: Answers are attached to V1 (${v1Answers} answers)`)
      console.log(`  V2 sheet has 0 answers`)
      console.log(`\n  This means:`)
      console.log(`  - Bubble API returns answers for V2 sheet bubble_id`)
      console.log(`  - But those answers already exist in Supabase`)
      console.log(`  - They're attached to V1 sheet, not V2`)
      console.log(`  - The answers table uses V1's sheet_id, not V2's`)
    }
  }

  // Check: Do V2 answers in Bubble point to V1 or V2 sheet?
  console.log('\n=== The Real Question ===')
  console.log('In Bubble, do V2 answers have Sheet field pointing to V2 bubble_id?')
  console.log('Or do they mistakenly point to V1?')
  console.log('\nNeed to check Bubble API response for "Sheet" field value')
}

debugAnswerMismatch()
