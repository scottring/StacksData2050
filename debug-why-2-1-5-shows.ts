import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function debugQuestion() {
  console.log('=== Why is question 2.1.5 showing? ===\n')

  // Get sheet tags
  const { data: sheetTagsData } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  console.log('Sheet tags:')
  sheetTagsData?.forEach(st => console.log(`  - ${st.tags?.name}`))

  const tagIds = sheetTagsData?.map(st => st.tag_id) || []
  console.log('\nSheet tag IDs:', tagIds)
  console.log()

  // Get the problematic question
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('bubble_id', '1682445736427x610075389819879400')
    .single()

  console.log('Question 2.1.null (showing as 2.1.5):')
  console.log('  Name:', question?.name?.substring(0, 60))
  console.log('  ID:', question?.id)
  console.log()

  // Get tags for this question
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('tag_id, tags(name)')
    .eq('question_id', question?.id)

  console.log('Question tags:')
  questionTags?.forEach(qt => console.log(`  - ${qt.tags?.name} (ID: ${qt.tag_id})`))
  console.log()

  // Check if any of the sheet's tags match this question's tags
  const sheetTagIdSet = new Set(tagIds)
  const matchingTags = questionTags?.filter(qt => sheetTagIdSet.has(qt.tag_id))

  console.log(`Matching tags: ${matchingTags?.length || 0}`)
  if (matchingTags && matchingTags.length > 0) {
    console.log('❌ PROBLEM: Question matches sheet tags, so it WILL be shown')
    matchingTags.forEach(mt => console.log(`  - ${mt.tags?.name}`))
  } else {
    console.log('✅ No matching tags - question should NOT be shown')
  }

  // Simulate the query logic
  console.log('\n=== Simulating Query Logic ===\n')

  const { data: questionTagsForSheet } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTagsForSheet?.map(qt => qt.question_id))]

  console.log(`Questions for sheet tags: ${questionIds.length}`)
  console.log(`Does this include our question? ${questionIds.includes(question?.id)}`)
}

debugQuestion().catch(console.error)
