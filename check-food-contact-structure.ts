import { supabase } from './src/migration/supabase-client.js'

async function checkFoodContactStructure() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('name', 'Food Contact')
    .single()

  if (!section) {
    console.log('❌ Food Contact section not found, searching...')

    // Search for sections with "food" in the name
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, order_number')
      .ilike('name', '%food%')
      .order('order_number')

    console.log('\n=== Sections with "food" in name ===')
    sections?.forEach(s => {
      console.log(`  ${s.order_number} - ${s.name} (${s.id})`)
    })

    // List all sections
    const { data: allSections } = await supabase
      .from('sections')
      .select('id, name, order_number')
      .order('order_number')

    console.log('\n=== All Sections ===')
    allSections?.forEach(s => {
      console.log(`  ${s.order_number} - ${s.name}`)
    })
    return
  }

  console.log(`\n=== Food Contact Section ===`)
  console.log(`ID: ${section.id}`)
  console.log(`Order Number: ${section.order_number}`)

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, number, parent_section_id')
    .eq('parent_section_id', section.id)
    .order('number')

  console.log(`\n=== Subsections (${subsections?.length || 0}) ===`)
  if (subsections && subsections.length > 0) {
    subsections.forEach(sub => {
      console.log(`  ${sub.number} - ${sub.name} (${sub.id})`)
    })
  } else {
    console.log('  ⚠️  No subsections found')
  }

  // Get questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, number, question_text, parent_subsection_id, parent_section_id, parent_question_id')
    .eq('parent_section_id', section.id)
    .order('number')

  console.log(`\n=== Questions (${questions?.length || 0}) ===`)
  if (questions && questions.length > 0) {
    console.log('\nFirst 20 questions:')
    questions.slice(0, 20).forEach(q => {
      const isDependent = q.parent_question_id ? '  └─ DEPENDENT' : ''
      const subsectionInfo = q.parent_subsection_id
        ? ` [subsection: ${subsections?.find(s => s.id === q.parent_subsection_id)?.number}]`
        : ' [NO SUBSECTION]'
      console.log(`  ${q.number}${subsectionInfo}${isDependent}`)
      console.log(`    ${q.question_text?.substring(0, 80)}...`)
    })

    // Count questions by subsection
    console.log('\n=== Questions by Subsection ===')
    const withSubsection = questions.filter(q => q.parent_subsection_id)
    const withoutSubsection = questions.filter(q => !q.parent_subsection_id)
    console.log(`Questions WITH subsection: ${withSubsection.length}`)
    console.log(`Questions WITHOUT subsection: ${withoutSubsection.length}`)

    // Show numbering patterns
    console.log('\n=== Numbering Patterns ===')
    const numberPatterns = questions.reduce((acc, q) => {
      const pattern = q.number.match(/^(\d+)\.(\d+)(\.(\d+))?(\.(\d+))?/)
      if (pattern) {
        const [, section, subsection, , subquestion] = pattern
        const key = subquestion ? `${section}.${subsection}.x.x` : `${section}.${subsection}`
        acc[key] = (acc[key] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    Object.entries(numberPatterns).forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count} questions`)
    })
  }

  // Check for expected subsections (4.1 through 4.12)
  console.log('\n=== Expected Subsections Check ===')
  for (let i = 1; i <= 12; i++) {
    const expectedNumber = `4.${i}`
    const exists = subsections?.some(s => s.number === expectedNumber)
    const questionsWithThisNumber = questions?.filter(q => q.number.startsWith(`${expectedNumber}.`))
    console.log(`  ${expectedNumber}: ${exists ? '✓ EXISTS' : '❌ MISSING'} (${questionsWithThisNumber?.length || 0} questions)`)
  }
}

checkFoodContactStructure()
