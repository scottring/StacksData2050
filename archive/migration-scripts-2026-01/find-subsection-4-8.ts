import { supabase } from './src/migration/supabase-client.js'

async function findSubsection48() {
  console.log('=== Finding Subsection 4.8 ===\n')

  // Search for subsection by name
  const { data: subsection } = await supabase
    .from('subsections')
    .select('id, name, order_number, section_id, bubble_id')
    .ilike('name', '%other relevant national%')
    .maybeSingle()

  if (subsection) {
    console.log(`Found subsection:`)
    console.log(`  Name: ${subsection.name}`)
    console.log(`  ID: ${subsection.id}`)
    console.log(`  Order: ${subsection.order_number}`)
    console.log(`  Section ID: ${subsection.section_id}`)
    console.log(`  Bubble ID: ${subsection.bubble_id}`)

    // Find questions for this subsection
    const { data: questions, count } = await supabase
      .from('questions')
      .select('id, name, section_sort_number, subsection_sort_number, order_number', { count: 'exact' })
      .eq('parent_subsection_id', subsection.id)
      .order('order_number')

    console.log(`\n  Total questions: ${count}`)

    if (questions && questions.length > 0) {
      console.log(`\n  Questions:`)
      for (const q of questions) {
        const num = q.subsection_sort_number !== null
          ? `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
          : `${q.section_sort_number}.?.${q.order_number}`
        console.log(`    ${num}: ${q.name?.substring(0, 60)}`)
      }
    }

    // Find the section this belongs to
    if (subsection.section_id) {
      const { data: section } = await supabase
        .from('sections')
        .select('id, name, order_number')
        .eq('id', subsection.section_id)
        .maybeSingle()

      if (section) {
        console.log(`\n  Parent section:`)
        console.log(`    Name: ${section.name}`)
        console.log(`    Order: ${section.order_number}`)
      }
    }
  } else {
    console.log('Subsection NOT FOUND')
  }

  // Also check all subsections in section 4 (Food Contact)
  console.log('\n\n=== All Subsections in Section 4 (Food Contact) ===\n')

  const { data: foodContactSection } = await supabase
    .from('sections')
    .select('id, name')
    .eq('order_number', 4)
    .maybeSingle()

  if (foodContactSection) {
    console.log(`Section: ${foodContactSection.name}\n`)

    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, order_number')
      .eq('section_id', foodContactSection.id)
      .order('order_number')

    if (subsections) {
      for (const sub of subsections) {
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('parent_subsection_id', sub.id)

        console.log(`  4.${sub.order_number}: ${sub.name} (${count} questions)`)
      }
    }
  }
}

findSubsection48()
