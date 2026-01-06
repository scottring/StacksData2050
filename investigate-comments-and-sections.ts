import { supabase } from './src/migration/supabase-client.js';

async function investigate() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // 1. Check for question comments/clarifications
  console.log('=== CHECKING FOR ADDITIONAL COMMENTS ===')
  const { data: answers } = await supabase
    .from('answers')
    .select('*, parent_question_id')
    .eq('sheet_id', sheetId)
    .not('comment', 'is', null)

  console.log(`Found ${answers?.length || 0} answers with comments`)
  if (answers && answers.length > 0) {
    answers.slice(0, 5).forEach(ans => {
      console.log(`\nAnswer ID: ${ans.id}`)
      console.log(`Question ID: ${ans.parent_question_id}`)
      console.log(`Comment: ${ans.comment}`)
    })
  }

  // 2. Check for question 1.2.1 specifically
  console.log('\n=== QUESTION 1.2.1 (Product Description) ===')
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, content')
    .ilike('name', '%Product Description%')
    .limit(3)

  if (questions && questions.length > 0) {
    const questionId = questions[0].id
    console.log(`Question: ${questions[0].name}`)
    console.log(`ID: ${questionId}`)

    const { data: answer } = await supabase
      .from('answers')
      .select('*')
      .eq('sheet_id', sheetId)
      .eq('parent_question_id', questionId)
      .single()

    if (answer) {
      console.log(`Answer comment: ${answer.comment}`)
      console.log(`Answer value: ${answer.text_area_value || answer.text_value}`)
    }
  }

  // 3. Check all sections and their order
  console.log('\n=== ALL SECTIONS ===')
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  sections?.forEach(sec => {
    console.log(`${sec.order_number}. ${sec.name} (id: ${sec.id})`)
  })

  // 4. Find "test section Kaisa"
  console.log('\n=== TEST SECTION KAISA ===')
  const { data: kaisaSection } = await supabase
    .from('sections')
    .select('*')
    .ilike('name', '%kaisa%')
    .single()

  if (kaisaSection) {
    console.log(`Found: ${kaisaSection.name}`)
    console.log(`ID: ${kaisaSection.id}`)
    console.log(`Order: ${kaisaSection.order_number}`)

    // Check subsections
    const { data: subs } = await supabase
      .from('subsections')
      .select('id, name')
      .eq('section_id', kaisaSection.id)

    console.log(`Has ${subs?.length || 0} subsections`)

    // Check questions
    const { data: qs } = await supabase
      .from('questions')
      .select('id')
      .eq('parent_section_id', kaisaSection.id)

    console.log(`Has ${qs?.length || 0} questions`)
  }
}

investigate().catch(console.error)
