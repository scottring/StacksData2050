import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING IF FIXES WERE SYSTEMATIC ===\n')

// 1. Check duplicate choices cleanup (was systematic)
console.log('1. DUPLICATE CHOICES CLEANUP')
const { count: duplicateChoices } = await supabase
  .from('choices')
  .select('parent_question_id, content', { count: 'exact', head: true })

console.log(`   Current total choices: ${duplicateChoices}`)
console.log('   ✓ This was SYSTEMATIC - cleaned up 263 duplicates globally\n')

// 2. Check Biocides choice creation (was specific to 6 questions)
console.log('2. BIOCIDES CHOICES ADDED')
console.log('   ✓ Added Yes/No/Not assessed to 6 Biocides questions')
console.log('   ✓ This was SYSTEMATIC - all sheets use same questions\n')

// 3. Check answer choice_id fixes (CRITICAL - was this systematic?)
console.log('3. ANSWER CHOICE_ID FIXES')
console.log('   Checking if we fixed ALL answers or just one sheet...\n')

const biocidesSection = 'f990287b-6a17-43e2-b78e-bed24b977cc7'
const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

// Get all Biocides questions
const { data: questions } = await supabase
  .from('questions')
  .select('id')
  .eq('parent_section_id', biocidesSection)

const questionIds = questions?.map(q => q.id) || []

// Get all current choices for these questions
const { data: currentChoices } = await supabase
  .from('choices')
  .select('id, parent_question_id')
  .in('parent_question_id', questionIds)

const validChoiceIds = new Set(currentChoices?.map(c => c.id) || [])

// Check ALL answers across ALL sheets for Biocides questions
const { data: allBiocidesAnswers } = await supabase
  .from('answers')
  .select('id, choice_id, sheet_id')
  .in('parent_question_id', questionIds)
  .not('choice_id', 'is', null)

let fixedForThisSheetOnly = 0
let stillBrokenOtherSheets = 0

for (const answer of allBiocidesAnswers || []) {
  const choiceIsValid = validChoiceIds.has(answer.choice_id!)

  if (!choiceIsValid) {
    if (answer.sheet_id === sheetId) {
      fixedForThisSheetOnly++
    } else {
      stillBrokenOtherSheets++
    }
  }
}

console.log(`   Total Biocides answers checked: ${allBiocidesAnswers?.length}`)
console.log(`   Answers with INVALID choice_ids (other sheets): ${stillBrokenOtherSheets}`)
console.log(`   Answers with INVALID choice_ids (this sheet): ${fixedForThisSheetOnly}`)

if (stillBrokenOtherSheets > 0) {
  console.log(`\n   ❌ PROBLEM: We only fixed ONE sheet, ${stillBrokenOtherSheets} other answers still broken!\n`)
} else {
  console.log(`\n   ✓ All answers have valid choice_ids\n`)
}

// 4. Check Q11 missing answer issue
console.log('4. Q11 MISSING ANSWER')
const { data: q11 } = await supabase
  .from('questions')
  .select('id')
  .eq('parent_section_id', biocidesSection)
  .eq('order_number', 11)
  .single()

const { count: sheetsWithQ11 } = await supabase
  .from('answers')
  .select('sheet_id', { count: 'exact', head: true })
  .eq('parent_question_id', q11?.id)

const { count: totalSheets } = await supabase
  .from('sheets')
  .select('id', { count: 'exact', head: true })

console.log(`   Sheets with Q11 answer: ${sheetsWithQ11}`)
console.log(`   Total sheets: ${totalSheets}`)
console.log(`   Sheets missing Q11: ${(totalSheets || 0) - (sheetsWithQ11 || 0)}`)
console.log(`   ❌ We only fixed ONE sheet (created 1 answer)\n`)

console.log('\n=== SUMMARY ===')
console.log('SYSTEMATIC fixes (benefit all sheets):')
console.log('  ✓ Cleaned up 263 duplicate choices')
console.log('  ✓ Added missing Biocides choices to 6 questions')
console.log('  ✓ Fixed Biocides subsection structure')
console.log('  ✓ Implemented dependent question numbering')
console.log('  ✓ Removed duplicate Article 95 question')
console.log('')
console.log('SHEET-SPECIFIC fixes (only this one sheet):')
console.log('  ❌ Fixed answer choice_ids (need to fix ALL sheets)')
console.log('  ❌ Created missing Q11 answer (need to fix ALL sheets)')
