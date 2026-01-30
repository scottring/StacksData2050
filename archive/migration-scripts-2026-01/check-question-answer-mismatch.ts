import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('=== Checking Question/Answer ID Mismatch ===\n')

  // Get answers with their parent_question_id
  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, choice_id, text_value')
    .eq('sheet_id', sheetId)

  console.log(`Total answers: ${answers?.length}\n`)

  // Get the questions that should be displayed (via tags)
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []

  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTags?.map(qt => qt.question_id))]

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, question_type')
    .in('id', questionIds)

  console.log(`Total questions to display: ${questions?.length}\n`)

  // Check if all answer parent_question_ids are in the questions list
  const questionIdSet = new Set(questions?.map(q => q.id))

  console.log('=== Checking Answers ===')
  let matchCount = 0
  let mismatchCount = 0
  const sampleMismatches: any[] = []

  answers?.forEach(answer => {
    if (questionIdSet.has(answer.parent_question_id)) {
      matchCount++
    } else {
      mismatchCount++
      if (sampleMismatches.length < 5) {
        sampleMismatches.push(answer)
      }
    }
  })

  console.log(`✓ Answers with matching question ID: ${matchCount}`)
  console.log(`✗ Answers with question ID not in display list: ${mismatchCount}`)

  if (sampleMismatches.length > 0) {
    console.log('\nSample mismatched answers:')
    for (const answer of sampleMismatches) {
      const { data: q } = await supabase
        .from('questions')
        .select('id, name')
        .eq('id', answer.parent_question_id)
        .single()

      console.log(`  Answer ID: ${answer.id}`)
      console.log(`  parent_question_id: ${answer.parent_question_id}`)
      console.log(`  Question: ${q?.name?.substring(0, 60)}...`)
      console.log(`  text_value: "${answer.text_value}"`)
      console.log()
    }
  }

  // Now check the specific dropdown question from Additional Requirements section
  console.log('\n=== Checking Specific Dropdown (Food Sanitation Act) ===')

  // Find questions containing "Food Sanitation Act"
  const { data: foodSanQuestions } = await supabase
    .from('questions')
    .select('id, name, question_type')
    .ilike('name', '%Food Sanitation Act%')

  if (foodSanQuestions && foodSanQuestions.length > 0) {
    const fsQuestion = foodSanQuestions[0]
    console.log(`Question ID: ${fsQuestion.id}`)
    console.log(`Question: ${fsQuestion.name?.substring(0, 80)}...`)
    console.log(`Type: ${fsQuestion.question_type}`)

    // Check if this question has an answer
    const answer = answers?.find(a => a.parent_question_id === fsQuestion.id)
    console.log(`Has answer: ${answer ? 'YES' : 'NO'}`)
    if (answer) {
      console.log(`  choice_id: ${answer.choice_id}`)
      console.log(`  text_value: "${answer.text_value}"`)
    }

    // Check if this question is in the display list
    console.log(`In display list: ${questionIdSet.has(fsQuestion.id) ? 'YES' : 'NO'}`)
  } else {
    console.log('Question not found')
  }
}

main().catch(console.error)
