import { supabase } from './src/migration/supabase-client.js';

async function fixDisclaimerSubsection() {
  const productInfoSectionId = 'b6ea81fe-9c6f-45e8-8cd9-f025b414212a'
  const disclaimerSubsectionId = 'ddc0fa11-7a15-4c1e-a1dd-9f4429497b3f'

  console.log('=== BEFORE FIX ===')
  const { data: before } = await supabase
    .from('subsections')
    .select('*')
    .eq('id', disclaimerSubsectionId)
    .single()

  console.log('Disclaimer subsection:')
  console.log('  Name:', before?.name)
  console.log('  section_id:', before?.section_id)
  console.log('  order_number:', before?.order_number)

  console.log('\n=== APPLYING FIX ===')
  console.log(`Updating Disclaimer subsection to belong to Product Information section...`)

  const { error } = await supabase
    .from('subsections')
    .update({
      section_id: productInfoSectionId,
      order_number: 1  // Make it the first subsection
    })
    .eq('id', disclaimerSubsectionId)

  if (error) {
    console.error('❌ Error updating subsection:', error)
    return
  }

  console.log('✅ Update successful!')

  console.log('\n=== AFTER FIX ===')
  const { data: after } = await supabase
    .from('subsections')
    .select('*')
    .eq('id', disclaimerSubsectionId)
    .single()

  console.log('Disclaimer subsection:')
  console.log('  Name:', after?.name)
  console.log('  section_id:', after?.section_id)
  console.log('  order_number:', after?.order_number)

  // Verify it now appears with Product Information subsections
  console.log('\n=== VERIFICATION ===')
  const { data: allSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', productInfoSectionId)
    .order('order_number')

  console.log('All subsections for Product Information section:')
  allSubs?.forEach((sub, idx) => {
    console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
  })
}

fixDisclaimerSubsection().catch(console.error)
