import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkBiocidesAnswers() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Checking Biocides Section Answers ===\n')

  // Get the specific question IDs
  const questionIds = [
    '4363a3a6-c74f-46fd-ba64-f06196d0bae9', // 3.1.1
    '55eeea30-92d0-492e-aa44-37819705fbb0', // 3.1.2 list table
    'c34a58ea-66a6-42c7-b568-d521c3e37a3e', // 3.1.3
    '5b1c126c-ccd8-4826-8b3a-ad73519f46b4', // 3.1.5
    'de444072-ffd7-47f7-b6e1-585980fa1b8e', // 3.1.6
    '5a921ce7-6c34-4d35-ad04-b348879c098e', // 3.1.7
    'd810c46d-91d0-491f-ad96-4a61270a1219', // 3.1.8
    'f5f880b1-1e08-43b5-872c-b9a8f819038c', // 3.1.9
    '53bdfe23-7266-4372-99cc-c3789c4f36c6'  // 3.1.10
  ]

  // Get all answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log(`Total answers for sheet: ${answers?.length || 0}`)

  // Check answers for each question
  questionIds.forEach((qid, idx) => {
    const questionAnswers = answers?.filter(a => a.parent_question_id === qid) || []
    console.log(`Question 3.1.${idx + 1}: ${questionAnswers.length} answers`)

    if (questionAnswers.length > 0) {
      questionAnswers.forEach(a => {
        console.log(`  Answer ID: ${a.id}`)
        console.log(`    choice_id: ${a.choice_id || 'NULL'}`)
        console.log(`    text_value: ${a.text_value || 'NULL'}`)
        console.log(`    boolean_value: ${a.boolean_value ?? 'NULL'}`)
      })
    }
  })

  // Check if answers have the sheet_id
  console.log('\n=== Checking answer sheet_id field ===')
  const sampleAnswer = answers?.[0]
  if (sampleAnswer) {
    console.log('Sample answer fields:', Object.keys(sampleAnswer).join(', '))
    console.log('sheet_id:', sampleAnswer.sheet_id)
  }
}

checkBiocidesAnswers().catch(console.error)
