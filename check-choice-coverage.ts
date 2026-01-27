import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkChoiceCoverage() {
  // Get questions that actually have 'Yes' as a choice option
  const { data: choicesWithYes } = await supabase
    .from('choices')
    .select('parent_question_id, content')
    .ilike('content', 'Yes%')

  const questionsWithYes = new Set(choicesWithYes?.map(c => c.parent_question_id))
  console.log('Questions that have a "Yes" choice:', questionsWithYes.size)

  // Check our imported answers - how many match vs don't match
  const sheetId = '0e21cabb-84f4-43a6-8e77-614e9941a734'

  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, text_value, choice_id')
    .eq('sheet_id', sheetId)

  let choiceMatched = 0
  let textFallback = 0
  let empty = 0

  for (const a of answers || []) {
    if (a.choice_id) {
      choiceMatched++
    } else if (a.text_value) {
      textFallback++
    } else {
      empty++
    }
  }

  console.log('\n=== IMPORTED ANSWERS BREAKDOWN ===')
  console.log('Proper choice_id match:', choiceMatched)
  console.log('Text fallback (no choice match):', textFallback)
  console.log('Empty:', empty)

  // Get sample of text fallback answers
  console.log('\n=== SAMPLE TEXT FALLBACK ANSWERS ===')
  const textFallbackAnswers = (answers || []).filter(a => a.text_value && !a.choice_id).slice(0, 5)

  for (const a of textFallbackAnswers) {
    const { data: q } = await supabase
      .from('questions')
      .select('name')
      .eq('id', a.parent_question_id)
      .single()

    console.log('Question:', q?.name?.substring(0, 50))
    console.log('  Answer text:', a.text_value)
    console.log()
  }
}

checkChoiceCoverage().catch(console.error)
