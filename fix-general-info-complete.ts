import { supabase } from './src/migration/supabase-client.js';

async function fixGeneralInfoComplete() {
  const productInfoGenInfo = '8e717b21-42b9-4d73-838c-12f8e5843893' // WRONG location
  const foodContactGenInfo = '92f26968-cde8-4fc5-9de3-fbcabf20f0e0' // CORRECT location

  console.log('=== STEP 1: Update any answers referencing the old subsection ===')

  const { data: answersToUpdate } = await supabase
    .from('answers')
    .select('*')
    .eq('parent_subsection_id', productInfoGenInfo)

  console.log(`Found ${answersToUpdate?.length || 0} answers to update`)

  if (answersToUpdate && answersToUpdate.length > 0) {
    const { error: answerUpdateError } = await supabase
      .from('answers')
      .update({ parent_subsection_id: foodContactGenInfo })
      .eq('parent_subsection_id', productInfoGenInfo)

    if (answerUpdateError) {
      console.error('❌ Error updating answers:', answerUpdateError)
      return
    }

    console.log(`✅ Updated ${answersToUpdate.length} answers to point to correct subsection`)
  }

  console.log('\n=== STEP 2: Delete duplicate subsection ===')

  const { error: deleteError } = await supabase
    .from('subsections')
    .delete()
    .eq('id', productInfoGenInfo)

  if (deleteError) {
    console.error('❌ Error deleting subsection:', deleteError)
    return
  }

  console.log('✅ Deleted duplicate General Information subsection from Product Information')

  console.log('\n=== STEP 3: Set order for Food Contact General Information ===')

  const { error: orderError } = await supabase
    .from('subsections')
    .update({ order_number: 1 })
    .eq('id', foodContactGenInfo)

  if (orderError) {
    console.error('❌ Error setting order:', orderError)
    return
  }

  console.log('✅ Set General Information as first subsection in Food Contact (order: 1)')

  console.log('\n=== VERIFICATION ===')

  // Verify Product Information subsections
  const { data: productInfoSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', 'b6ea81fe-9c6f-45e8-8cd9-f025b414212a')
    .order('order_number')

  console.log('Product Information subsections:')
  productInfoSubs?.forEach((sub, idx) => {
    if (sub.order_number !== null) {
      console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
    }
  })

  // Verify Food Contact subsections (showing ones with order_number first)
  const { data: foodContactSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', '558c9176-447d-4eff-af6e-a953c4f4fead')
    .not('order_number', 'is', null)
    .order('order_number')

  console.log('\nFood Contact subsections (with order_number):')
  foodContactSubs?.forEach((sub, idx) => {
    console.log(`  ${idx + 1}. ${sub.name} (order: ${sub.order_number})`)
  })

  // Verify the questions are now in the right place
  const { data: verifyQuestions } = await supabase
    .from('questions')
    .select('name, content')
    .eq('parent_subsection_id', foodContactGenInfo)

  console.log(`\n✅ Food Contact General Information now has ${verifyQuestions?.length || 0} questions:`)
  verifyQuestions?.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.name || q.content?.substring(0, 60)}`)
  })
}

fixGeneralInfoComplete().catch(console.error)
