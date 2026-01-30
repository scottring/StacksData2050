import { supabase } from './src/migration/supabase-client.js'

async function fixOrphanedSubsections() {
  console.log('=== Fixing Orphaned Subsections ===\n')

  // Get subsections with no section_id and no order_number
  const { data: orphanedSubsections } = await supabase
    .from('subsections')
    .select('*')
    .is('section_id', null)

  if (!orphanedSubsections || orphanedSubsections.length === 0) {
    console.log('No orphaned subsections found')
    return
  }

  console.log(`Found ${orphanedSubsections.length} orphaned subsections:\n`)

  for (const sub of orphanedSubsections) {
    console.log(`${sub.name} (ID: ${sub.id})`)
  }

  // For these orphaned subsections, assign a default order based on their position
  console.log('\nAssigning default order numbers to orphaned subsections...\n')

  let fixed = 0
  for (let i = 0; i < orphanedSubsections.length; i++) {
    const sub = orphanedSubsections[i]
    const orderNum = i + 1

    const { error } = await supabase
      .from('subsections')
      .update({ order_number: orderNum })
      .eq('id', sub.id)

    if (error) {
      console.log(`❌ Failed to update ${sub.name}: ${error.message}`)
    } else {
      console.log(`✓ ${sub.name}: assigned order ${orderNum}`)
      fixed++
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed} orphaned subsections`)
}

fixOrphanedSubsections()
