import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING FOR BROKEN ANSWERS ACROSS ALL SECTIONS ===\n')

// Get all answers with choice_id
const { data: allAnswers } = await supabase
  .from('answers')
  .select('id, parent_question_id, choice_id, sheet_id')
  .not('choice_id', 'is', null)

console.log(`Total answers with choice_id: ${allAnswers?.length}`)

// Get all questions
const allQuestionIds = [...new Set(allAnswers?.map(a => a.parent_question_id).filter(Boolean) || [])]

console.log(`Unique questions with answers: ${allQuestionIds.length}`)

// Get all valid choices
const { data: allValidChoices } = await supabase
  .from('choices')
  .select('id, parent_question_id')
  .in('parent_question_id', allQuestionIds)

const validChoiceIds = new Set(allValidChoices?.map(c => c.id) || [])

console.log(`Valid choices: ${validChoiceIds.size}`)

// Count broken answers
let brokenCount = 0
const brokenBySection = new Map<string, number>()
const brokenAnswers: Array<{ id: string; question_id: string; choice_id: string; sheet_id: string }> = []

allAnswers?.forEach(a => {
  if (!validChoiceIds.has(a.choice_id!)) {
    brokenCount++
    brokenAnswers.push({
      id: a.id,
      question_id: a.parent_question_id!,
      choice_id: a.choice_id!,
      sheet_id: a.sheet_id!
    })
  }
})

console.log(`\n❌ BROKEN ANSWERS: ${brokenCount}`)
console.log(`✅ Valid answers: ${allAnswers!.length - brokenCount}`)

if (brokenCount > 0) {
  console.log(`\nBroken answers represent ${Math.round((brokenCount / allAnswers!.length) * 100)}% of all answers`)

  // Get section info for broken answers
  const brokenQuestionIds = [...new Set(brokenAnswers.map(a => a.question_id))]

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_section_id, sections(name)')
    .in('id', brokenQuestionIds)

  console.log(`\nBroken answers are spread across ${brokenQuestionIds.length} questions`)

  // Group by section
  const bySection = new Map<string, number>()
  brokenAnswers.forEach(ba => {
    const q = questions?.find(q => q.id === ba.question_id)
    const sectionName = (q as any)?.sections?.name || 'Unknown'
    bySection.set(sectionName, (bySection.get(sectionName) || 0) + 1)
  })

  console.log('\nBroken answers by section:')
  Array.from(bySection.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([section, count]) => {
      console.log(`  ${section}: ${count}`)
    })

  // Sample some broken answers
  console.log('\nSample broken answers (first 10):')
  for (const ba of brokenAnswers.slice(0, 10)) {
    const q = questions?.find(q => q.id === ba.question_id)
    console.log(`  Question: ${q?.name?.substring(0, 60)}`)
    console.log(`  Section: ${(q as any)?.sections?.name}`)
    console.log(`  Choice ID (deleted): ${ba.choice_id}`)
    console.log(`  Sheet: ${ba.sheet_id}`)
    console.log()
  }

  console.log('\n⚠️  WE NEED TO RUN A GLOBAL FIX FOR ALL SECTIONS!')
}
