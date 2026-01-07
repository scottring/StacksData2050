import { supabase } from './src/migration/supabase-client.js'

async function cleanupOldSubsections() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) return

  // Get all subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number')

  console.log('=== Current Subsections ===\n')
  subsections?.forEach(sub => {
    console.log(`  4.${sub.order_number} - ${sub.name?.substring(0, 50)}...`)
  })

  // Find subsections with null order_number (old ones)
  const oldSubsections = subsections?.filter(s => s.order_number === null) || []

  console.log(`\n=== Found ${oldSubsections.length} old subsections to delete ===\n`)

  for (const sub of oldSubsections) {
    // Check if any questions or answers still reference this
    const { count: questionCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    const { count: answerCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    console.log(`${sub.name}:`)
    console.log(`  Questions: ${questionCount}`)
    console.log(`  Answers: ${answerCount}`)

    if ((questionCount || 0) > 0 || (answerCount || 0) > 0) {
      console.log(`  ⚠️  Cannot delete - still has references`)
    } else {
      const { error } = await supabase
        .from('subsections')
        .delete()
        .eq('id', sub.id)

      if (error) {
        console.log(`  ❌ Error: ${error.message}`)
      } else {
        console.log(`  ✓ Deleted`)
      }
    }
    console.log()
  }

  // Final verification
  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number')

  console.log('\n=== Final Subsections ===\n')
  for (const sub of finalSubsections || []) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    console.log(`  4.${sub.order_number} - ${sub.name?.substring(0, 50)}... (${count} questions)`)
  }
}

cleanupOldSubsections()
