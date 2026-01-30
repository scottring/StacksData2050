import { supabase } from './src/migration/supabase-client.js'

async function checkSubsectionLinkage() {
  console.log('=== Checking Subsection 4.8 Linkage ===\n')

  const subsectionBubbleId = '1626200588208x767490048310378500'

  // Get the subsection
  const { data: subsection } = await supabase
    .from('subsections')
    .select('*')
    .eq('bubble_id', subsectionBubbleId)
    .single()

  if (!subsection) {
    console.log('Subsection not found')
    return
  }

  console.log('Subsection:')
  console.log(`  Name: ${subsection.name}`)
  console.log(`  ID: ${subsection.id}`)
  console.log(`  Order: ${subsection.order_number}`)
  console.log(`  Section ID: ${subsection.section_id}`)

  // Get Food Contact section
  const { data: section4 } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('order_number', 4)
    .maybeSingle()

  if (section4) {
    console.log(`\nSection 4:`)
    console.log(`  Name: ${section4.name}`)
    console.log(`  ID: ${section4.id}`)

    if (subsection.section_id !== section4.id) {
      console.log(`\n❌ MISMATCH: Subsection section_id (${subsection.section_id}) != Section 4 ID (${section4.id})`)
      console.log(`\nFixing...`)

      const { error } = await supabase
        .from('subsections')
        .update({ section_id: section4.id })
        .eq('id', subsection.id)

      if (error) {
        console.log(`❌ Error: ${error.message}`)
      } else {
        console.log(`✓ Fixed: subsection now linked to Section 4`)
      }
    } else if (subsection.section_id === null) {
      console.log(`\n❌ Section ID is NULL`)
      console.log(`\nLinking to Section 4...`)

      const { error } = await supabase
        .from('subsections')
        .update({ section_id: section4.id })
        .eq('id', subsection.id)

      if (error) {
        console.log(`❌ Error: ${error.message}`)
      } else {
        console.log(`✓ Fixed: subsection now linked to Section 4`)
      }
    } else {
      console.log(`\n✓ Subsection is correctly linked to Section 4`)
    }
  }

  // Check questions
  console.log(`\n=== Questions for this subsection ===\n`)

  const { data: questions, count } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number', { count: 'exact' })
    .eq('parent_subsection_id', subsection.id)

  console.log(`Total questions: ${count}`)

  if (questions && questions.length > 0) {
    for (const q of questions) {
      console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 50)}`)
    }
  }
}

checkSubsectionLinkage()
