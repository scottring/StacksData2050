import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('Simulating frontend data fetch...\n')

  // 1. Fetch choices (like frontend does)
  const { data: choices } = await supabase
    .from('choices')
    .select('*')
    .order('order_number')

  console.log(`✓ Fetched ${choices?.length || 0} total choices`)

  // 2. Fetch answers (like frontend does)
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('modified_at', { ascending: false })

  console.log(`✓ Fetched ${allAnswers?.length || 0} answers`)

  // 3. Get dropdown answers
  const dropdownAnswers = allAnswers?.filter(a => a.choice_id !== null) || []
  console.log(`✓ ${dropdownAnswers.length} dropdown answers (have choice_id)\n`)

  // 4. Simulate rendering a dropdown question
  const sampleAnswer = dropdownAnswers[0]
  if (sampleAnswer) {
    console.log('Sample dropdown answer:')
    console.log(`  parent_question_id: ${sampleAnswer.parent_question_id}`)
    console.log(`  choice_id: ${sampleAnswer.choice_id}`)
    console.log(`  text_value: "${sampleAnswer.text_value}"`)

    // Find choices for this question (like component does)
    const questionChoices = choices?.filter(c => c.parent_question_id === sampleAnswer.parent_question_id) || []
    console.log(`\nChoices available for this question (${questionChoices.length}):`)
    questionChoices.forEach(c => {
      const isSelected = c.id === sampleAnswer.choice_id ? ' ← SELECTED' : ''
      console.log(`  - [${c.id}] "${c.content}"${isSelected}`)
    })

    if (questionChoices.length === 0) {
      console.log('\n❌ NO CHOICES FOUND FOR THIS QUESTION!')
      console.log('   This is why dropdown shows "Select an option..."')
    } else if (!questionChoices.find(c => c.id === sampleAnswer.choice_id)) {
      console.log('\n❌ SELECTED CHOICE NOT IN AVAILABLE CHOICES!')
      console.log('   The choice_id exists but is not in the filtered list')
    } else {
      console.log('\n✅ Selected choice found in available choices')
      console.log('   Dropdown should display correctly')
    }
  }

  // 5. Check for orphaned choice_ids
  console.log('\n=== Checking for orphaned choice_ids ===')
  let orphanCount = 0
  for (const answer of dropdownAnswers.slice(0, 10)) {
    const choiceExists = choices?.some(c => c.id === answer.choice_id && c.parent_question_id === answer.parent_question_id)
    if (!choiceExists) {
      orphanCount++
      console.log(`❌ Answer ${answer.id}: choice_id ${answer.choice_id} not found or parent_question_id mismatch`)
    }
  }
  if (orphanCount === 0) {
    console.log('✅ All sampled answers have valid choice_ids')
  }
}

main().catch(console.error)
