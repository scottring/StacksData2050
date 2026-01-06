import { supabase } from './src/migration/supabase-client.js'

async function deleteKaisaSection() {
  const kaisaSectionId = 'af5406a6-a56f-490e-bde1-91056a561e45'

  console.log('=== STEP 1: Check what will be deleted ===')

  // Check subsections
  const { data: subs } = await supabase
    .from('subsections')
    .select('id, name')
    .eq('section_id', kaisaSectionId)

  console.log(`Subsections to delete: ${subs?.length || 0}`)
  subs?.forEach(s => console.log(`  - ${s.name}`))

  // Check questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name')
    .eq('parent_section_id', kaisaSectionId)

  console.log(`\nQuestions to delete: ${questions?.length || 0}`)
  questions?.forEach(q => console.log(`  - ${q.name}`))

  // Check for answers
  const questionIds = questions?.map(q => q.id) || []
  if (questionIds.length > 0) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .in('parent_question_id', questionIds)

    console.log(`\nAnswers that reference these questions: ${count || 0}`)
  }

  console.log('\n=== STEP 2: Delete in correct order ===')

  // Delete answers first
  if (questionIds.length > 0) {
    const { error: ansError } = await supabase
      .from('answers')
      .delete()
      .in('parent_question_id', questionIds)

    if (ansError) {
      console.error('Error deleting answers:', ansError)
      return
    }
    console.log('✅ Deleted answers')
  }

  // Delete questions
  const { error: qError } = await supabase
    .from('questions')
    .delete()
    .eq('parent_section_id', kaisaSectionId)

  if (qError) {
    console.error('Error deleting questions:', qError)
    return
  }
  console.log('✅ Deleted questions')

  // Delete subsections
  const { error: subError } = await supabase
    .from('subsections')
    .delete()
    .eq('section_id', kaisaSectionId)

  if (subError) {
    console.error('Error deleting subsections:', subError)
    return
  }
  console.log('✅ Deleted subsections')

  // Delete section
  const { error: secError } = await supabase
    .from('sections')
    .delete()
    .eq('id', kaisaSectionId)

  if (secError) {
    console.error('Error deleting section:', secError)
    return
  }
  console.log('✅ Deleted section')

  console.log('\n=== VERIFICATION ===')
  const { data: remaining } = await supabase
    .from('sections')
    .select('name, order_number')
    .order('order_number')

  console.log('\nRemaining sections:')
  remaining?.forEach(s => {
    console.log(`  ${s.order_number}. ${s.name}`)
  })
}

deleteKaisaSection().catch(console.error)
