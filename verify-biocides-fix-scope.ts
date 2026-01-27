import { supabase } from './src/migration/supabase-client.js'

async function verifyBiocidesFix() {
  console.log('=== Verifying Scope of Biocides Fix ===\n')

  // The questions we fixed (3.1.3-3.1.7 in DB)
  const fixedQuestionIds = [
    'c34a58ea-66a6-42c7-b568-d521c3e37a3e', // 3.1.3
    '5b1c126c-ccd8-4826-8b3a-ad73519f46b4', // 3.1.5
    'de444072-ffd7-47f7-b6e1-585980fa1b8e', // 3.1.6
    '5a921ce7-6c34-4d35-ad04-b348879c098e', // 3.1.7
    'd810c46d-91d0-491f-ad96-4a61270a1219', // 3.1.8
    'f5f880b1-1e08-43b5-872c-b9a8f819038c', // 3.1.9
  ]

  for (const questionId of fixedQuestionIds) {
    const { data: question } = await supabase
      .from('questions')
      .select('name, order_number')
      .eq('id', questionId)
      .single()

    const { data: answers } = await supabase
      .from('answers')
      .select('choice_id, sheet_id, sheets(name)')
      .eq('parent_question_id', questionId)

    console.log(`Q ${question?.order_number}: ${question?.name?.substring(0, 50)}...`)
    console.log(`  Total answers: ${answers?.length || 0}`)
    console.log(`  With choice_id: ${answers?.filter(a => a.choice_id).length || 0}`)
    console.log(`  NULL choice_id: ${answers?.filter(a => !a.choice_id).length || 0}`)

    // Show which sheets have NULL
    const nullAnswers = answers?.filter(a => !a.choice_id) || []
    if (nullAnswers.length > 0 && nullAnswers.length < 10) {
      nullAnswers.forEach((a: any) => {
        console.log(`    - ${a.sheets?.name || 'Unknown sheet'}`)
      })
    }
    console.log('')
  }

  console.log('\n=== Summary ===')
  console.log('We only fixed the Hydrocarb sheet (1 sheet)')
  console.log('Other sheets may have the same issue - NULL choice_ids for these questions')
  console.log('This suggests the migration from Bubble failed to capture these choice values')
}

verifyBiocidesFix().catch(console.error)
