import { supabase } from './src/migration/supabase-client.js'

async function merge() {
  console.log('Merging EU Plastics subsections...\n')
  
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  const { data: euSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .ilike('name', '%Plastics%Dual%')
    .order('order_number')
  
  if (!euSubs || euSubs.length !== 2) {
    console.log('Expected 2 EU Plastics subsections, found ' + (euSubs?.length || 0))
    return
  }
  
  const keepSub = euSubs[0]  // order 3, has bubble_id
  const deleteSub = euSubs[1] // order 11, no bubble_id
  
  console.log('Keeping: order ' + keepSub.order_number + ' (bubble_id: ' + keepSub.bubble_id + ')')
  console.log('Deleting: order ' + deleteSub.order_number + ' (bubble_id: ' + deleteSub.bubble_id + ')')
  
  // Move questions
  const { data: questionsToMove } = await supabase
    .from('questions')
    .select('id, order_number')
    .eq('parent_subsection_id', deleteSub.id)
  
  console.log('\nMoving ' + (questionsToMove?.length || 0) + ' questions...')
  
  for (const q of questionsToMove || []) {
    await supabase
      .from('questions')
      .update({ 
        parent_subsection_id: keepSub.id,
        subsection_sort_number: keepSub.order_number
      })
      .eq('id', q.id)
  }
  
  // Verify
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_subsection_id', keepSub.id)
  
  console.log('✓ EU Plastics subsection now has ' + (count || 0) + ' questions (should be 4)')
}

merge()
