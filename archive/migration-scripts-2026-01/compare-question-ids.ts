import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  // 1. Get tags on this sheet
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Tags on this sheet:')
  sheetTags?.forEach(st => {
    console.log(`  - ${(st.tags as any)?.name}`)
  })

  // 2. Get questions that should display (based on tags)
  const tagIds = sheetTags?.map(st => st.tag_id) || []

  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const displayQuestionIds = [...new Set(questionTags?.map(qt => qt.question_id))]
  console.log(`\nQuestions that should display: ${displayQuestionIds.length}`)
  console.log('First 5 question IDs:')
  displayQuestionIds.slice(0, 5).forEach(id => console.log(`  - ${id}`))

  // 3. Get answers that exist
  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id, text_value')
    .eq('sheet_id', sheetId)

  const answeredQuestionIds = [...new Set(answers?.map(a => a.parent_question_id).filter(Boolean))]
  console.log(`\nQuestions with answers: ${answeredQuestionIds.length}`)
  console.log('First 5 answered question IDs:')
  answeredQuestionIds.slice(0, 5).forEach(id => console.log(`  - ${id}`))

  // 4. Check overlap
  const overlap = answeredQuestionIds.filter(id => displayQuestionIds.includes(id))
  console.log(`\n✅ Overlap (answered questions that should display): ${overlap.length}`)

  const noDisplay = answeredQuestionIds.filter(id => !displayQuestionIds.includes(id))
  console.log(`❌ Answered but won't display (wrong tag): ${noDisplay.length}`)

  if (noDisplay.length > 0) {
    console.log('\nSample answered questions that won\'t display:')
    for (const qid of noDisplay.slice(0, 3)) {
      const answer = answers?.find(a => a.parent_question_id === qid)
      const { data: q } = await supabase
        .from('questions')
        .select('name, id')
        .eq('id', qid)
        .single()

      console.log(`  - ${qid}`)
      console.log(`    Question: ${q?.name?.substring(0, 60)}...`)
      console.log(`    Answer: ${answer?.text_value?.substring(0, 60)}...`)
    }
  }
}

main().catch(console.error)
