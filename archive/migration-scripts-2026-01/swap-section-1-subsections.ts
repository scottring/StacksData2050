import { supabase } from './src/migration/supabase-client.js'

async function swapSection1Subsections() {
  console.log('=== Swapping Section 1 Subsections ===\n')

  // Get Section 1
  const { data: section1 } = await supabase
    .from('sections')
    .select('id')
    .eq('order_number', 1)
    .single()

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section1.id)
    .neq('order_number', 999)
    .order('order_number')

  console.log('Current order:')
  for (const sub of subsections!) {
    console.log(`  1.${sub.order_number}: ${sub.name}`)
  }

  // Swap: Product (1) <-> Disclaimer (2)
  const product = subsections!.find(s => s.name === 'Product')
  const disclaimer = subsections!.find(s => s.name === 'Disclaimer')

  if (product && disclaimer) {
    console.log('\nSwapping...')

    // Update Product: 1 → 2
    await supabase
      .from('subsections')
      .update({ order_number: 2 })
      .eq('id', product.id)

    await supabase
      .from('questions')
      .update({ subsection_sort_number: 2 })
      .eq('parent_subsection_id', product.id)

    // Update Disclaimer: 2 → 1
    await supabase
      .from('subsections')
      .update({ order_number: 1 })
      .eq('id', disclaimer.id)

    await supabase
      .from('questions')
      .update({ subsection_sort_number: 1 })
      .eq('parent_subsection_id', disclaimer.id)

    console.log('✓ Swapped Product and Disclaimer')
  }

  // Get final order
  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section1.id)
    .neq('order_number', 999)
    .order('order_number')

  console.log('\nFinal order:')
  for (const sub of finalSubsections!) {
    console.log(`  1.${sub.order_number}: ${sub.name}`)
  }
}

swapSection1Subsections()
