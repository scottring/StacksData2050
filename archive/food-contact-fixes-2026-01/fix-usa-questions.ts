import { supabase } from './src/migration/supabase-client.js'

async function fixUSAQuestions() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) return

  // Get the USA subsection with smart quotes (Unicode 8220/8221)
  const usaSubsectionName = 'USA - Can the product be used for the manufacture of Food Contact Articles in compliance with the U.S. Federal Food Drug and Cosmetic Act and all applicable \u201cFood Additive Regulations\u201d 21CFR part 170-199, especially the following ones?'

  // Find the subsection we created (with regular quotes)
  const { data: usaSubsection } = await supabase
    .from('subsections')
    .select('id, name')
    .eq('section_id', section.id)
    .eq('order_number', 9)
    .single()

  if (!usaSubsection) {
    console.log('❌ USA subsection not found')
    return
  }

  console.log('USA Subsection found:')
  console.log(`  ID: ${usaSubsection.id}`)
  console.log(`  Name: ${usaSubsection.name.substring(0, 60)}...`)

  // Find all USA questions (with smart quotes in subsection_name_sort)
  const { data: usaQuestions } = await supabase
    .from('questions')
    .select('id, question_id_number, subsection_name_sort')
    .eq('parent_section_id', section.id)
    .eq('subsection_name_sort', usaSubsectionName)

  console.log(`\nFound ${usaQuestions?.length || 0} USA questions to assign`)

  if (usaQuestions && usaQuestions.length > 0) {
    // Assign all USA questions to the USA subsection
    const questionIds = usaQuestions.map(q => q.id)

    const { error } = await supabase
      .from('questions')
      .update({ parent_subsection_id: usaSubsection.id })
      .in('id', questionIds)

    if (error) {
      console.log(`❌ Error: ${error.message}`)
    } else {
      console.log(`✓ Assigned ${usaQuestions.length} questions to USA subsection`)
      usaQuestions.forEach(q => console.log(`  - Q${q.question_id_number}`))
    }
  }
}

fixUSAQuestions()
