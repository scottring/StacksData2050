import { supabase } from './src/migration/supabase-client.js';

async function checkDisclaimerTags() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'
  const questionId = '0a61547e-8aea-454b-88b4-c7753065d861'

  // Get sheet tags
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  console.log('=== SHEET TAGS ===')
  if (sheetTags && sheetTags.length > 0) {
    console.log('Sheet has tags:', sheetTags.map(st => st.tag_id))
  } else {
    console.log('Sheet has NO tags')
  }

  // Get question tags
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('*')
    .eq('question_id', questionId)

  console.log('\n=== QUESTION TAGS ===')
  if (questionTags && questionTags.length > 0) {
    console.log('Question has tags:', questionTags.map(qt => qt.tag_id))
  } else {
    console.log('Question has NO tags')
  }

  // Check if question would be filtered
  if (sheetTags && sheetTags.length > 0) {
    const tagIds = sheetTags.map(st => st.tag_id)

    const { data: matchingTags } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds)
      .eq('question_id', questionId)

    console.log('\n=== TAG MATCHING ===')
    if (matchingTags && matchingTags.length > 0) {
      console.log('✅ Question MATCHES sheet tags - WILL BE VISIBLE')
    } else {
      console.log('❌ Question DOES NOT match sheet tags - WILL BE FILTERED OUT')
    }
  } else {
    console.log('\n=== TAG MATCHING ===')
    console.log('✅ No sheet tags, so ALL questions visible')
  }

  // Check if there's an answer for this question
  const { data: answer } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', sheetId)
    .eq('parent_question_id', questionId)
    .order('modified_at', { ascending: false })
    .limit(1)

  console.log('\n=== ANSWER DATA ===')
  if (answer && answer.length > 0) {
    console.log('Answer exists:', answer[0])
  } else {
    console.log('No answer exists for this question')
  }
}

checkDisclaimerTags().catch(console.error)
