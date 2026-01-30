import { supabase } from './src/migration/supabase-client.js'

async function calculateSubsectionOrderNumbers() {
  console.log('=== Calculating Subsection Order Numbers ===\n')

  // Get all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name')

  if (!sections) {
    console.log('No sections found')
    return
  }

  console.log(`Found ${sections.length} sections\n`)

  let fixed = 0

  for (const section of sections) {
    // Get all subsections for this section, ordered by created_at
    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, order_number, created_at')
      .eq('section_id', section.id)
      .order('created_at')

    if (!subsections || subsections.length === 0) {
      continue
    }

    console.log(`\nSection: ${section.name} (${subsections.length} subsections)`)

    // Assign order numbers 1, 2, 3... based on position
    for (let i = 0; i < subsections.length; i++) {
      const subsection = subsections[i]
      const newOrder = i + 1

      if (subsection.order_number !== newOrder) {
        const { error } = await supabase
          .from('subsections')
          .update({ order_number: newOrder })
          .eq('id', subsection.id)

        if (error) {
          console.log(`  ❌ Failed to update ${subsection.name}: ${error.message}`)
        } else {
          console.log(`  ✓ ${subsection.name}: order ${subsection.order_number} → ${newOrder}`)
          fixed++
        }
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed} subsections`)
}

calculateSubsectionOrderNumbers()
