import { supabase } from './src/migration/supabase-client.js'

async function deleteTestSections() {
  const testSectionIds = [
    'b53a054e-a914-4a74-9215-bb40ecfc0b72', // test section 1
    '9a6f2f19-7b67-46ca-a974-94b19963fceb', // pulp question
    'be556c35-7d76-4336-9946-5f87a11b9355'  // kfkfkfk
  ]

  for (const sectionId of testSectionIds) {
    console.log(`\n=== Deleting section ${sectionId} ===`)

    // Get section name
    const { data: section } = await supabase
      .from('sections')
      .select('name')
      .eq('id', sectionId)
      .single()

    console.log(`Section: ${section?.name}`)

    // Get questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('parent_section_id', sectionId)

    const questionIds = questions?.map(q => q.id) || []

    // Delete answers
    if (questionIds.length > 0) {
      const { error: ansError } = await supabase
        .from('answers')
        .delete()
        .in('parent_question_id', questionIds)

      if (ansError) console.error('Error deleting answers:', ansError)
      else console.log(`  ✅ Deleted answers for ${questionIds.length} questions`)
    }

    // Delete questions
    const { error: qError } = await supabase
      .from('questions')
      .delete()
      .eq('parent_section_id', sectionId)

    if (qError) console.error('Error deleting questions:', qError)
    else console.log('  ✅ Deleted questions')

    // Delete subsections
    const { error: subError } = await supabase
      .from('subsections')
      .delete()
      .eq('section_id', sectionId)

    if (subError) console.error('Error deleting subsections:', subError)
    else console.log('  ✅ Deleted subsections')

    // Delete section
    const { error: secError } = await supabase
      .from('sections')
      .delete()
      .eq('id', sectionId)

    if (secError) console.error('Error deleting section:', secError)
    else console.log('  ✅ Deleted section')
  }

  console.log('\n=== FINAL VERIFICATION ===')
  const { data: remaining } = await supabase
    .from('sections')
    .select('name, order_number')
    .order('order_number')

  console.log('\nRemaining sections:')
  remaining?.forEach(s => {
    console.log(`  ${s.order_number}. ${s.name}`)
  })
}

deleteTestSections().catch(console.error)
