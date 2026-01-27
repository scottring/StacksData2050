import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkChoiceEnrichment() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Checking Choice Enrichment for Biocides Questions ===\n')

  // Get the question IDs for 3.1.2-3.1.8
  const questionIds = [
    'c34a58ea-66a6-42c7-b568-d521c3e37a3e', // 3.1.3 (displays as 3.1.2)
    '5b1c126c-ccd8-4826-8b3a-ad73519f46b4', // 3.1.5 (displays as 3.1.3)
    'de444072-ffd7-47f7-b6e1-585980fa1b8e', // 3.1.6 (displays as 3.1.4)
    '5a921ce7-6c34-4d35-ad04-b348879c098e', // 3.1.7 (displays as 3.1.5)
    'd810c46d-91d0-491f-ad96-4a61270a1219', // 3.1.8 (displays as 3.1.6)
    'f5f880b1-1e08-43b5-872c-b9a8f819038c', // 3.1.9 (displays as 3.1.7)
    '53bdfe23-7266-4372-99cc-c3789c4f36c6'  // 3.1.10 (displays as 3.1.8)
  ]

  // Get answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .in('parent_question_id', questionIds)

  console.log(`Found ${answers?.length || 0} answers\n`)

  // Get all choices
  const { data: allChoices } = await supabase
    .from('choices')
    .select('*')

  console.log(`Total choices in DB: ${allChoices?.length || 0}\n`)

  // Check each answer
  for (const answer of answers || []) {
    const qIdx = questionIds.indexOf(answer.parent_question_id)
    const displayNumber = `3.1.${qIdx + 2}` // +2 because 3.1.1 is parent, 3.1.1.1 is list table

    console.log(`Question ${displayNumber}:`)
    console.log(`  Answer ID: ${answer.id}`)
    console.log(`  choice_id: ${answer.choice_id}`)
    console.log(`  text_value: ${answer.text_value}`)
    console.log(`  boolean_value: ${answer.boolean_value}`)

    if (answer.choice_id) {
      const choice = allChoices?.find(c => c.id === answer.choice_id)
      if (choice) {
        console.log(`  ✓ Choice found: "${choice.content}"`)
      } else {
        console.log(`  ✗ Choice NOT FOUND in database!`)
      }
    } else {
      console.log(`  (No choice_id)`)
    }
    console.log('')
  }

  // Now check what the demo page does
  console.log('=== What Demo Page Does ===\n')

  // Get choices with select
  const { data: choicesData } = await supabase
    .from('choices')
    .select('id, content')

  const choicesMap = new Map(choicesData?.map(c => [c.id, { name: c.content }]) || [])
  console.log(`Choices map size: ${choicesMap.size}`)

  // Enrich answers
  const enrichedAnswers = answers?.map(a => ({
    ...a,
    choices: a.choice_id ? choicesMap.get(a.choice_id) : undefined
  })) || []

  console.log('\nEnriched answers:')
  enrichedAnswers.forEach(a => {
    const qIdx = questionIds.indexOf(a.parent_question_id)
    const displayNumber = `3.1.${qIdx + 2}`
    console.log(`  ${displayNumber}: choice_id=${a.choice_id}, choices=${JSON.stringify(a.choices)}`)
  })
}

checkChoiceEnrichment().catch(console.error)
