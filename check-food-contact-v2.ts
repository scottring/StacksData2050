import { supabase } from './src/migration/supabase-client.js'

async function checkFoodContactStructure() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('name', 'Food Contact')
    .single()

  if (!section) {
    console.log('❌ Food Contact section not found')
    return
  }

  console.log(`\n=== Food Contact Section ===`)
  console.log(`ID: ${section.id}`)
  console.log(`Order Number: ${section.order_number}`)

  // Get subsections using section_id
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .order('order_number')

  console.log(`\n=== Subsections (${subsections?.length || 0}) ===`)
  if (subsections && subsections.length > 0) {
    subsections.forEach(sub => {
      console.log(`  Order ${sub.order_number} - ${sub.name} (${sub.id})`)
    })
  } else {
    console.log('  ⚠️  No subsections found')
  }

  // Get questions
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_section_id', section.id)
    .order('question_id_number')

  if (questionsError) {
    console.log(`\n❌ Error loading questions: ${questionsError.message}`)
    return
  }

  console.log(`\n=== Questions (${questions?.length || 0}) ===`)
  if (questions && questions.length > 0) {
    console.log('\nFirst 30 questions:')
    questions.slice(0, 30).forEach(q => {
      const isDependent = q.parent_choice_id ? '  └─ DEPENDENT' : ''
      const subsectionInfo = q.parent_subsection_id
        ? ` [subsection: ${subsections?.find(s => s.id === q.parent_subsection_id)?.name}]`
        : ' [NO SUBSECTION]'
      console.log(`  Q${q.question_id_number}${subsectionInfo}${isDependent}`)
      console.log(`    Name: ${q.name?.substring(0, 80)}`)
      console.log(`    Type: ${q.question_type}`)
    })

    // Count questions by subsection
    console.log('\n=== Questions by Subsection ===')
    const withSubsection = questions.filter(q => q.parent_subsection_id)
    const withoutSubsection = questions.filter(q => !q.parent_subsection_id)
    console.log(`Questions WITH subsection: ${withSubsection.length}`)
    console.log(`Questions WITHOUT subsection: ${withoutSubsection.length}`)

    // Group by subsection
    if (subsections && subsections.length > 0) {
      console.log('\n=== Questions per Subsection ===')
      subsections.forEach(sub => {
        const subQuestions = questions.filter(q => q.parent_subsection_id === sub.id)
        console.log(`  ${sub.name}: ${subQuestions.length} questions`)
      })
    }
  }

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Total subsections: ${subsections?.length || 0}`)
  console.log(`Total questions: ${questions?.length || 0}`)
  console.log(`Expected: 12 subsections (4.1 through 4.12)`)
}

checkFoodContactStructure()
