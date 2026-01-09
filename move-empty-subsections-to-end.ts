import { supabase } from './src/migration/supabase-client.js'

async function moveEmptySubsectionsToEnd() {
  console.log('=== Moving Empty Subsections to End ===\n')

  // Get all subsections
  const { data: allSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, section_id')

  if (!allSubsections) return

  let moved = 0

  for (const sub of allSubsections) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    if (count === 0) {
      // Move to order 999
      const { error } = await supabase
        .from('subsections')
        .update({ order_number: 999 })
        .eq('id', sub.id)

      if (!error) {
        console.log(`✓ Moved "${sub.name}" to order 999`)
        moved++
      }
    }
  }

  console.log(`\n✓ Moved ${moved} empty subsections to order 999`)

  // Now recalculate order numbers for remaining subsections by section
  console.log('\n=== Recalculating Order Numbers ===\n')

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .order('order_number')

  if (!sections) return

  for (const section of sections) {
    // Get non-empty subsections
    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, order_number, created_at')
      .eq('section_id', section.id)
      .neq('order_number', 999)
      .order('created_at')

    if (!subsections || subsections.length === 0) continue

    console.log(`Section ${section.order_number}: ${section.name}`)

    for (let i = 0; i < subsections.length; i++) {
      const newOrder = i + 1
      if (subsections[i].order_number !== newOrder) {
        await supabase
          .from('subsections')
          .update({ order_number: newOrder })
          .eq('id', subsections[i].id)

        // Update questions
        await supabase
          .from('questions')
          .update({ subsection_sort_number: newOrder })
          .eq('parent_subsection_id', subsections[i].id)

        console.log(`  ✓ ${subsections[i].order_number} → ${newOrder}: ${subsections[i].name}`)
      }
    }
  }

  console.log('\n✓ Recalculation complete')
}

moveEmptySubsectionsToEnd()
