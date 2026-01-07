import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING HYDRAGLOSS 90 SHEET ===\n')

// Find the sheet
const { data: sheet } = await supabase
  .from('sheets')
  .select('id, name, company_id, assigned_to_company_id')
  .ilike('name', '%HYDRAGLOSS 90%')
  .single()

console.log(`Sheet: ${sheet?.name}`)
console.log(`Sheet ID: ${sheet?.id}`)
console.log(`Company ID: ${sheet?.company_id}`)
console.log(`Assigned to: ${sheet?.assigned_to_company_id}`)

// Get the Biocides section
const { data: biocidesSection } = await supabase
  .from('sections')
  .select('id, name')
  .eq('name', 'Biocides')
  .single()

console.log(`\n=== CHECKING BIOCIDES ANSWERS ===`)

// Get all Biocides questions
const { data: biocidesQuestions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', biocidesSection?.id)
  .order('order_number')

console.log(`\nTotal Biocides questions: ${biocidesQuestions?.length}`)

// Get all answers for this sheet in Biocides section
const questionIds = biocidesQuestions?.map(q => q.id) || []

const { data: answers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id, choices(id, content)')
  .eq('sheet_id', sheet?.id)
  .in('parent_question_id', questionIds)

console.log(`Total Biocides answers for this sheet: ${answers?.length}`)

// Check which answers have valid vs invalid choice_ids
const { data: validChoices } = await supabase
  .from('choices')
  .select('id')
  .in('parent_question_id', questionIds)

const validChoiceIds = new Set(validChoices?.map(c => c.id) || [])

let brokenAnswers = 0
let validAnswers = 0

answers?.forEach(a => {
  if (a.choice_id) {
    if (validChoiceIds.has(a.choice_id)) {
      validAnswers++
    } else {
      brokenAnswers++
    }
  }
})

console.log(`\nValid answers (choice exists): ${validAnswers}`)
console.log(`Broken answers (choice deleted): ${brokenAnswers}`)

if (brokenAnswers > 0) {
  console.log('\n⚠️  This sheet has broken answers! The global fix we did earlier should have caught these.')
  console.log('This suggests either:')
  console.log('1. The fix script missed some answers')
  console.log('2. There are answers outside the Biocides section with the same issue')
}

// Check all answers for this sheet (not just Biocides)
const { data: allAnswers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id')
  .eq('sheet_id', sheet?.id)
  .not('choice_id', 'is', null)

console.log(`\n=== CHECKING ALL ANSWERS FOR THIS SHEET ===`)
console.log(`Total answers with choice_id: ${allAnswers?.length}`)

// Get all questions to check all choices
const allQuestionIds = [...new Set(allAnswers?.map(a => a.parent_question_id).filter(Boolean) || [])]

const { data: allValidChoices } = await supabase
  .from('choices')
  .select('id')
  .in('parent_question_id', allQuestionIds)

const allValidChoiceIds = new Set(allValidChoices?.map(c => c.id) || [])

let totalBroken = 0
let totalValid = 0

allAnswers?.forEach(a => {
  if (allValidChoiceIds.has(a.choice_id!)) {
    totalValid++
  } else {
    totalBroken++
  }
})

console.log(`Valid answers (all sections): ${totalValid}`)
console.log(`Broken answers (all sections): ${totalBroken}`)

if (totalBroken > 0) {
  console.log('\n⚠️  This sheet has broken answers in other sections too!')
  console.log('We need to run a global fix for ALL sections, not just Biocides.')
}
