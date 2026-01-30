import { supabase } from './src/migration/supabase-client.js'

async function checkEmptySubsections() {
  console.log('=== Checking Empty Subsections ===\n')

  // Get subsections with 0 questions
  const { data: allSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, section_id')

  if (!allSubsections) return

  const emptySubsections = []

  for (const sub of allSubsections) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    if (count === 0) {
      emptySubsections.push(sub)
    }
  }

  console.log(`Found ${emptySubsections.length} subsections with 0 questions:\n`)

  for (const sub of emptySubsections) {
    // Get section info
    if (sub.section_id) {
      const { data: section } = await supabase
        .from('sections')
        .select('order_number, name')
        .eq('id', sub.section_id)
        .maybeSingle()

      if (section) {
        console.log(`${section.order_number}.${sub.order_number}: ${sub.name} (Section: ${section.name})`)
      }
    } else {
      console.log(`?.${sub.order_number}: ${sub.name} (No section)`)
    }
  }

  console.log('\n\n=== Recommendation ===')
  console.log('Empty subsections should probably be:')
  console.log('  1. Deleted if they were just tests')
  console.log('  2. OR marked with a very high order_number to push them to the end')
  console.log('  3. OR filtered out when displaying')
}

checkEmptySubsections()
