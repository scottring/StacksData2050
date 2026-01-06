import { supabase } from './src/migration/supabase-client.js';

async function fixSubsectionOrdering() {
  const productInfoSectionId = 'b6ea81fe-9c6f-45e8-8cd9-f025b414212a'

  console.log('=== CURRENT SUBSECTION ORDER ===')
  const { data: currentSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', productInfoSectionId)
    .order('order_number')

  currentSubs?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.name} (order_number: ${sub.order_number}, id: ${sub.id.substring(0,8)}...)`)
  })

  // The correct order based on Bubble should be:
  // 1. Disclaimer (order: 1)
  // 2. Product (order: 2)
  // 3. General Information (order: 3)

  const updates = [
    { id: 'ddc0fa11-7a15-4c1e-a1dd-9f4429497b3f', name: 'Disclaimer', order: 1 },
    { id: 'd67f886e-5ef4-4968-aba8-ec2fc236a035', name: 'Product', order: 2 },
    { id: '8e717b21-42b9-4d73-838c-12f8e5843893', name: 'General Information', order: 3 }
  ]

  console.log('\n=== APPLYING ORDER FIX ===')
  for (const update of updates) {
    console.log(`Setting ${update.name} to order_number: ${update.order}`)
    const { error } = await supabase
      .from('subsections')
      .update({ order_number: update.order })
      .eq('id', update.id)

    if (error) {
      console.error(`❌ Error updating ${update.name}:`, error)
    } else {
      console.log(`✅ ${update.name} updated`)
    }
  }

  console.log('\n=== NEW SUBSECTION ORDER ===')
  const { data: newSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', productInfoSectionId)
    .order('order_number')

  newSubs?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.name} (order_number: ${sub.order_number})`)
  })

  // Now check the "Add disclaimer" question
  console.log('\n=== CHECKING ADD DISCLAIMER QUESTION ===')
  const { data: disclaimerQ } = await supabase
    .from('questions')
    .select('*')
    .eq('id', '0a61547e-8aea-454b-88b4-c7753065d861')
    .single()

  console.log('Question:', disclaimerQ?.name)
  console.log('Content:', disclaimerQ?.content)
  console.log('Question Type:', disclaimerQ?.question_type)
  console.log('Order:', disclaimerQ?.order_number)
  console.log('Required:', disclaimerQ?.required)
}

fixSubsectionOrdering().catch(console.error)
