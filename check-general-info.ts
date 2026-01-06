import { supabase } from './src/migration/supabase-client.js';

async function checkGeneralInfo() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Find "General Information" subsection
  const { data: generalInfoSub } = await supabase
    .from('subsections')
    .select('*')
    .ilike('name', '%general%information%')

  console.log('=== GENERAL INFORMATION SUBSECTIONS ===')
  if (generalInfoSub && generalInfoSub.length > 0) {
    generalInfoSub.forEach(sub => {
      console.log(`Name: ${sub.name}`)
      console.log(`ID: ${sub.id}`)
      console.log(`Section ID: ${sub.section_id}`)
      console.log(`Order: ${sub.order_number}`)
      console.log()
    })
  }

  // Get all sections to see which one it SHOULD belong to
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  console.log('=== ALL SECTIONS ===')
  sections?.forEach((sec, idx) => {
    console.log(`${idx + 1}. ${sec.name} (id: ${sec.id})`)
  })

  // Find Food Contact Compliance section
  const { data: foodContactSection } = await supabase
    .from('sections')
    .select('*')
    .ilike('name', '%food%contact%')
    .single()

  console.log('\n=== FOOD CONTACT COMPLIANCE SECTION ===')
  if (foodContactSection) {
    console.log(`Name: ${foodContactSection.name}`)
    console.log(`ID: ${foodContactSection.id}`)
    console.log(`Order: ${foodContactSection.order_number}`)

    // Get subsections for this section
    const { data: foodContactSubs } = await supabase
      .from('subsections')
      .select('*')
      .eq('section_id', foodContactSection.id)
      .order('order_number')

    console.log('\nSubsections in Food Contact Compliance:')
    if (foodContactSubs && foodContactSubs.length > 0) {
      foodContactSubs.forEach((sub, idx) => {
        console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
      })
    } else {
      console.log('  No subsections found')
    }
  }

  // Get Product Information section to see what's there
  const { data: productInfoSection } = await supabase
    .from('sections')
    .select('*')
    .ilike('name', '%product%information%')
    .single()

  console.log('\n=== PRODUCT INFORMATION SECTION ===')
  if (productInfoSection) {
    console.log(`Name: ${productInfoSection.name}`)
    console.log(`ID: ${productInfoSection.id}`)

    const { data: productInfoSubs } = await supabase
      .from('subsections')
      .select('*')
      .eq('section_id', productInfoSection.id)
      .order('order_number')

    console.log('\nSubsections in Product Information:')
    if (productInfoSubs && productInfoSubs.length > 0) {
      productInfoSubs.forEach((sub, idx) => {
        console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
      })
    }
  }
}

checkGeneralInfo().catch(console.error)
