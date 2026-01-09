import { supabase } from './src/migration/supabase-client.js'

async function fixUsingSupabaseOrder() {
  console.log('=== Fixing Questions Using Supabase Subsection Order ===\n')

  // Get all questions with parent_subsection_id
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_subsection_id, section_sort_number, subsection_sort_number, order_number')
    .not('parent_subsection_id', 'is', null)

  if (!questions) {
    console.log('No questions found')
    return
  }

  console.log(`Processing ${questions.length} questions...\n`)

  let fixed = 0
  let errors = 0

  for (const q of questions) {
    // Get the subsection from Supabase
    const { data: subsection } = await supabase
      .from('subsections')
      .select('id, name, order_number, section_id')
      .eq('id', q.parent_subsection_id)
      .maybeSingle()

    if (!subsection) {
      console.log(`❌ Subsection not found: ${q.parent_subsection_id}`)
      errors++
      continue
    }

    if (subsection.order_number === null) {
      console.log(`⚠️  Subsection has null order_number: ${subsection.name}`)
      continue
    }

    // Get section order
    let sectionOrder = q.section_sort_number

    if (subsection.section_id) {
      const { data: section } = await supabase
        .from('sections')
        .select('order_number')
        .eq('id', subsection.section_id)
        .maybeSingle()

      if (section) {
        sectionOrder = section.order_number
      }
    }

    // Check if needs update
    if (q.subsection_sort_number !== subsection.order_number || q.section_sort_number !== sectionOrder) {
      const oldNum = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      const newNum = `${sectionOrder}.${subsection.order_number}.${q.order_number}`

      const { error } = await supabase
        .from('questions')
        .update({
          section_sort_number: sectionOrder,
          subsection_sort_number: subsection.order_number
        })
        .eq('id', q.id)

      if (error) {
        console.log(`❌ Error: ${error.message}`)
        errors++
      } else {
        console.log(`✓ ${oldNum} → ${newNum}: ${q.name?.substring(0, 40)}`)
        fixed++
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Errors: ${errors}`)
}

fixUsingSupabaseOrder()
