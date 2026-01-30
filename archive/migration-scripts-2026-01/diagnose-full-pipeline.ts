import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTY0NTksImV4cCI6MjA4MDE5MjQ1OX0.YHwvnbd8QWJGo8BmcAn47oPvXR1vyFQ90KGA7u4_rhs'
const anonClient = createClient(supabaseUrl, ANON_KEY)

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('=== COMPLETE FRONTEND DATA PIPELINE DIAGNOSIS ===\n')

  // Step 1: Fetch questions with specific tags
  console.log('Step 1: Fetching questions...')
  const { data: sheetTags } = await anonClient
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []
  console.log(`  Found ${tagIds.length} tags for sheet`)

  const { data: questionTags } = await anonClient
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTags?.map(qt => qt.question_id))]
  console.log(`  Found ${questionIds.length} questions to display`)

  const { data: questions } = await anonClient
    .from('questions')
    .select('*')
    .in('id', questionIds)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  const dropdownQuestions = questions?.filter(q =>
    q.question_type === 'Select one Radio' ||
    q.question_type === 'Select one' ||
    q.question_type === 'Dropdown'
  ) || []
  console.log(`  ${dropdownQuestions.length} are dropdown questions\n`)

  // Step 2: Fetch choices
  console.log('Step 2: Fetching choices...')
  const { data: choices } = await anonClient
    .from('choices')
    .select('*')
    .order('order_number')

  console.log(`  Fetched ${choices?.length || 0} total choices\n`)

  // Step 3: Fetch answers
  console.log('Step 3: Fetching answers...')
  const { data: allAnswers } = await anonClient
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('modified_at', { ascending: false })

  console.log(`  Fetched ${allAnswers?.length || 0} answers`)

  // Deduplicate (like frontend does)
  const seenQuestions = new Set<string>()
  const answers = allAnswers?.filter(answer => {
    if (answer.parent_question_id && !seenQuestions.has(answer.parent_question_id)) {
      seenQuestions.add(answer.parent_question_id)
      return true
    }
    return false
  }) || []

  console.log(`  After deduplication: ${answers.length} answers`)

  const dropdownAnswers = answers.filter(a => a.choice_id !== null)
  console.log(`  ${dropdownAnswers.length} have choice_id set\n`)

  // Step 4: Simulate rendering a dropdown
  console.log('Step 4: Simulating dropdown rendering...\n')

  // Find first dropdown question with an answer
  let testQuestion = null
  let testAnswer = null

  for (const q of dropdownQuestions) {
    const answer = answers.find(a => a.parent_question_id === q.id)
    if (answer?.choice_id) {
      testQuestion = q
      testAnswer = answer
      break
    }
  }

  if (testQuestion && testAnswer) {
    console.log(`Testing dropdown: "${testQuestion.name?.substring(0, 60)}..."`)
    console.log(`Question ID: ${testQuestion.id}`)
    console.log(`Question Type: ${testQuestion.question_type}\n`)

    // Filter choices for this question (like QuestionInput does)
    const questionChoices = choices?.filter(c => c.parent_question_id === testQuestion.id)
      .sort((a, b) => (a.order_number || 0) - (b.order_number || 0)) || []

    console.log(`Choices available for this question: ${questionChoices.length}`)
    questionChoices.forEach((c, idx) => {
      const isSelected = c.id === testAnswer.choice_id ? ' ← SELECTED' : ''
      console.log(`  ${idx + 1}. [${c.id}] "${c.content}"${isSelected}`)
    })

    console.log(`\nAnswer object:`)
    console.log(`  choice_id: ${testAnswer.choice_id}`)
    console.log(`  text_value: "${testAnswer.text_value}"`)

    // Check if selected choice is in the list
    const selectedChoice = questionChoices.find(c => c.id === testAnswer.choice_id)

    if (!selectedChoice) {
      console.log('\n❌ PROBLEM: Selected choice_id NOT found in question choices!')
      console.log('   This means the dropdown will show "Select an option..."')
      console.log('\nDEBUG: Looking for this choice across ALL choices...')
      const globalChoice = choices?.find(c => c.id === testAnswer.choice_id)
      if (globalChoice) {
        console.log(`   Found globally: "${globalChoice.content}"`)
        console.log(`   parent_question_id: ${globalChoice.parent_question_id}`)
        console.log(`   Expected parent_question_id: ${testQuestion.id}`)
        if (globalChoice.parent_question_id !== testQuestion.id) {
          console.log('   ❌ MISMATCH! Choice belongs to different question!')
        }
      } else {
        console.log('   ❌ Choice does not exist in database at all!')
      }
    } else {
      console.log(`\n✅ Selected choice found: "${selectedChoice.content}"`)
      console.log('   Dropdown SHOULD display this value')
      console.log('\n=== VERDICT ===')
      console.log('The data is correct. If dropdown shows "Select an option..." in browser:')
      console.log('1. Check browser console for errors')
      console.log('2. Hard refresh browser (Cmd+Shift+R)')
      console.log('3. Check if user is authenticated')
      console.log('4. Check Network tab to see what data is actually being fetched')
    }
  } else {
    console.log('❌ No dropdown question with answer found to test')
  }
}

main().catch(console.error)
