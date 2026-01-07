import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING BIOCIDES STRUCTURE ===\n')

// Get Biocides section
const { data: section } = await supabase
  .from('sections')
  .select('id')
  .ilike('name', '%biocide%')
  .single()

// Get subsections
const { data: subsections } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', section?.id)
  .order('order_number')

console.log(`Current subsections: ${subsections?.length}`)
subsections?.forEach(sub => {
  console.log(`  ${sub.order_number}. ${sub.name} (ID: ${sub.id})`)
})

// Get all questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, parent_subsection_id')
  .eq('parent_section_id', section?.id)
  .order('order_number')

console.log(`\nCurrent questions: ${questions?.length}`)
questions?.forEach(q => {
  const subName = subsections?.find(s => s.id === q.parent_subsection_id)?.name || 'Direct to section'
  console.log(`  ${q.order_number}. ${q.name?.substring(0, 50)} → ${subName}`)
})

// Based on Bubble: there should be ONE subsection called "Biocides"
// All questions should be under that one subsection
// The subsection order should be 1

const biocidesSubsection = subsections?.find(s => s.name === 'Biocides')

if (!biocidesSubsection) {
  console.log('\nERROR: Could not find "Biocides" subsection!')
  process.exit(1)
}

console.log(`\n=== FIX PLAN ===`)
console.log(`1. Keep subsection: "${biocidesSubsection.name}" (order ${biocidesSubsection.order_number})`)
console.log(`2. Delete other subsections`)
console.log(`3. Move all questions to the Biocides subsection`)
console.log(`4. Set subsection order_number to 1`)

// Delete "Automatic #1" subsection
const toDelete = subsections?.filter(s => s.id !== biocidesSubsection.id) || []

if (toDelete.length > 0) {
  console.log(`\nDeleting ${toDelete.length} subsections...`)
  for (const sub of toDelete) {
    console.log(`  Deleting: ${sub.name}`)
    const { error } = await supabase
      .from('subsections')
      .delete()
      .eq('id', sub.id)

    if (error) {
      console.error(`  ERROR: ${error.message}`)
    }
  }
}

// Set Biocides subsection order to 1
console.log(`\nSetting Biocides subsection order_number to 1...`)
await supabase
  .from('subsections')
  .update({ order_number: 1 })
  .eq('id', biocidesSubsection.id)

// Move ALL questions to the Biocides subsection
console.log(`\nMoving all questions to Biocides subsection...`)
const { error: updateError } = await supabase
  .from('questions')
  .update({ parent_subsection_id: biocidesSubsection.id })
  .eq('parent_section_id', section?.id)

if (updateError) {
  console.error(`ERROR: ${updateError.message}`)
} else {
  console.log(`✓ Updated all questions`)
}

// Verify
console.log('\n=== VERIFICATION ===')
const { data: finalSubs } = await supabase
  .from('subsections')
  .select('name, order_number')
  .eq('section_id', section?.id)
  .order('order_number')

console.log(`Subsections: ${finalSubs?.length}`)
finalSubs?.forEach(s => console.log(`  ${s.order_number}. ${s.name}`))

const { count: qCount } = await supabase
  .from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('parent_subsection_id', biocidesSubsection.id)

console.log(`\nQuestions under Biocides subsection: ${qCount}`)
