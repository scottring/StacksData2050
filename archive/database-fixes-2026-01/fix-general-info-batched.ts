import { supabase } from './src/migration/supabase-client.js';

async function fixGeneralInfoBatched() {
  const productInfoGenInfo = '8e717b21-42b9-4d73-838c-12f8e5843893' // WRONG location
  const foodContactGenInfo = '92f26968-cde8-4fc5-9de3-fbcabf20f0e0' // CORRECT location

  console.log('=== STEP 1: Update answers in batches ===')

  // Get total count first
  const { count: totalCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('parent_subsection_id', productInfoGenInfo)

  console.log(`Total answers to update: ${totalCount}`)

  // Fetch all answers in batches (supabase has a default limit)
  let allAnswers: { id: string }[] = []
  const fetchSize = 1000
  let offset = 0

  while (true) {
    const { data: batch } = await supabase
      .from('answers')
      .select('id')
      .eq('parent_subsection_id', productInfoGenInfo)
      .range(offset, offset + fetchSize - 1)

    if (!batch || batch.length === 0) break

    allAnswers = allAnswers.concat(batch)
    console.log(`Fetched ${allAnswers.length} answer IDs...`)

    if (batch.length < fetchSize) break
    offset += fetchSize
  }

  const answersToUpdate = allAnswers
  console.log(`Found ${answersToUpdate?.length || 0} answers to update`)

  if (answersToUpdate && answersToUpdate.length > 0) {
    const batchSize = 100
    const totalBatches = Math.ceil(answersToUpdate.length / batchSize)

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, answersToUpdate.length)
      const batch = answersToUpdate.slice(start, end)
      const answerIds = batch.map(a => a.id)

      console.log(`Updating batch ${i + 1}/${totalBatches} (${batch.length} answers)...`)

      const { error } = await supabase
        .from('answers')
        .update({ parent_subsection_id: foodContactGenInfo })
        .in('id', answerIds)

      if (error) {
        console.error(`❌ Error updating batch ${i + 1}:`, error)
        return
      }

      console.log(`✅ Batch ${i + 1} complete`)
    }

    console.log(`✅ Updated all ${answersToUpdate.length} answers`)
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

  console.log('\n=== FINAL VERIFICATION ===')

  // Verify Product Information subsections
  const { data: productInfoSubs } = await supabase
    .from('subsections')
    .select('name, order_number')
    .eq('section_id', 'b6ea81fe-9c6f-45e8-8cd9-f025b414212a')
    .not('order_number', 'is', null)
    .order('order_number')

  console.log('\nProduct Information subsections (numbered only):')
  productInfoSubs?.forEach((sub, idx) => {
    console.log(`  ${sub.order_number}. ${sub.name}`)
  })

  // Verify Food Contact General Information
  const { data: genInfoQuestions } = await supabase
    .from('questions')
    .select('name')
    .eq('parent_subsection_id', foodContactGenInfo)
    .order('order_number')

  console.log(`\n✅ Food Contact General Information now has ${genInfoQuestions?.length || 0} questions:`)
  genInfoQuestions?.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.name}`)
  })

  console.log('\n🎉 Fix complete! General Information is now correctly under Food Contact section.')
}

fixGeneralInfoBatched().catch(console.error)
