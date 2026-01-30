import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTY0NTksImV4cCI6MjA4MDE5MjQ1OX0.YHwvnbd8QWJGo8BmcAn47oPvXR1vyFQ90KGA7u4_rhs'
const supabaseAnon = createClient(supabaseUrl, ANON_KEY)

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('Testing with ANON KEY (simulating frontend):\n')

  // Fetch choices
  const { data: choices, error: choicesError } = await supabaseAnon
    .from('choices')
    .select('*')
    .order('order_number')

  if (choicesError) {
    console.log('❌ Choices error:', choicesError)
    return
  }

  console.log(`✓ Fetched ${choices?.length || 0} choices`)

  // Fetch answers
  const { data: answers, error: answersError } = await supabaseAnon
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)

  if (answersError) {
    console.log('❌ Answers error:', answersError)
    return
  }

  console.log(`✓ Fetched ${answers?.length || 0} answers`)

  // Check dropdown answers
  const dropdownAnswers = answers?.filter(a => a.choice_id !== null) || []
  console.log(`✓ ${dropdownAnswers.length} dropdown answers with choice_id\n`)

  // Test a sample dropdown
  const sampleAnswer = dropdownAnswers[0]
  if (sampleAnswer) {
    const questionChoices = choices?.filter(c => c.parent_question_id === sampleAnswer.parent_question_id) || []
    const selectedChoice = questionChoices.find(c => c.id === sampleAnswer.choice_id)

    console.log('Sample dropdown test:')
    console.log(`  Question has ${questionChoices.length} choices`)
    console.log(`  Selected choice_id: ${sampleAnswer.choice_id}`)
    console.log(`  Found in choices: ${selectedChoice ? 'YES ✓' : 'NO ✗'}`)
    if (selectedChoice) {
      console.log(`  Selected value: "${selectedChoice.content}"`)
    }
  }
}

main().catch(console.error)
