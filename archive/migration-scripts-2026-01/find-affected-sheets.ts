import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findAffectedSheets() {
  console.log('=== Finding Sheets with NULL choice_id Issues ===\n')

  const problematicQuestionIds = [
    '0bdc8e83-b0c9-481e-93d0-ff4df93b485e', // French Decree question
    '2c084a3f-576d-4c7d-b7b2-91da3af9a9c6'  // 2012/481/EU question
  ]

  for (const questionId of problematicQuestionIds) {
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single()

    console.log(`Question: ${question?.name?.substring(0, 60)}...`)
    console.log(`  Type: ${question?.question_type}`)

    // Find answers with NULL choice_id for this question
    const { data: nullAnswers } = await supabase
      .from('answers')
      .select('*, sheets(name)')
      .eq('parent_question_id', questionId)
      .is('choice_id', null)

    console.log(`  NULL answers: ${nullAnswers?.length}`)

    if (nullAnswers && nullAnswers.length > 0) {
      nullAnswers.forEach((a: any) => {
        console.log(`    - Sheet: ${a.sheets?.name || 'Unknown'}`)
        console.log(`      Answer ID: ${a.id}`)
        console.log(`      Sheet ID: ${a.sheet_id}`)
      })
    }

    // Check all answers for this question to understand the pattern
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('choice_id, boolean_value, text_value')
      .eq('parent_question_id', questionId)

    console.log(`  Total answers: ${allAnswers?.length}`)
    console.log(`  With choice_id: ${allAnswers?.filter(a => a.choice_id).length}`)
    console.log(`  With boolean: ${allAnswers?.filter(a => a.boolean_value !== null).length}`)
    console.log(`  All NULL: ${allAnswers?.filter(a => !a.choice_id && a.boolean_value === null && !a.text_value).length}`)
    console.log('')
  }
}

findAffectedSheets().catch(console.error)
