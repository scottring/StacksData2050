import { supabase } from './src/migration/supabase-client.js'

async function recalculateSection4Order() {
  console.log('=== Recalculating Section 4 Subsection Order Numbers ===\n')

  // Get Section 4
  const { data: section4 } = await supabase
    .from('sections')
    .select('id, name')
    .eq('order_number', 4)
    .single()

  if (!section4) {
    console.log('Section 4 not found')
    return
  }

  console.log(`Section: ${section4.name}\n`)

  // Get all subsections for Section 4, ordered by created_at
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, created_at, bubble_id')
    .eq('section_id', section4.id)
    .order('created_at')

  if (!subsections) {
    console.log('No subsections found')
    return
  }

  console.log(`Found ${subsections.length} subsections\n`)
  console.log('Current state:')
  for (const sub of subsections) {
    console.log(`  ${sub.order_number}: ${sub.name}`)
  }

  console.log('\n=== Recalculating order numbers ===\n')

  // Assign new order numbers 1, 2, 3... based on created_at
  for (let i = 0; i < subsections.length; i++) {
    const subsection = subsections[i]
    const newOrder = i + 1

    if (subsection.order_number !== newOrder) {
      const { error } = await supabase
        .from('subsections')
        .update({ order_number: newOrder })
        .eq('id', subsection.id)

      if (error) {
        console.log(`❌ Error updating ${subsection.name}: ${error.message}`)
      } else {
        console.log(`✓ ${subsection.name}: ${subsection.order_number} → ${newOrder}`)

        // Update all questions for this subsection
        const { error: qError } = await supabase
          .from('questions')
          .update({ subsection_sort_number: newOrder })
          .eq('parent_subsection_id', subsection.id)

        if (qError) {
          console.log(`  ❌ Error updating questions: ${qError.message}`)
        }
      }
    } else {
      console.log(`  ${subsection.name}: already ${newOrder}`)
    }
  }

  console.log('\n=== Final Order ===\n')

  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section4.id)
    .order('order_number')

  if (finalSubsections) {
    for (const sub of finalSubsections) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('parent_subsection_id', sub.id)

      console.log(`  4.${sub.order_number}: ${sub.name} (${count} questions)`)
    }
  }
}

recalculateSection4Order()
