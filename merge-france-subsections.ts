import { supabase } from './src/migration/supabase-client.js'

async function merge() {
  console.log('Merging France subsections...\n')
  
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  const { data: franceSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'France')
    .order('order_number')
  
  if (!franceSubs || franceSubs.length !== 2) {
    console.log('Expected 2 France subsections, found ' + (franceSubs?.length || 0))
    return
  }
  
  const keepSub = franceSubs[0] // order 1, has bubble_id
  const deleteSub = franceSubs[1] // order 10, no bubble_id
  
  console.log('Keeping subsection: order ' + keepSub.order_number + ' (bubble_id: ' + keepSub.bubble_id + ')')
  console.log('Deleting subsection: order ' + deleteSub.order_number + ' (bubble_id: ' + deleteSub.bubble_id + ')')
  
  // Move questions from order 10 to order 1
  const { data: questionsToMove } = await supabase
    .from('questions')
    .select('id, bubble_id, order_number')
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
    
    console.log('  Moved question order ' + q.order_number)
  }
  
  // Delete the duplicate subsection
  const { error } = await supabase
    .from('subsections')
    .delete()
    .eq('id', deleteSub.id)
  
  if (error) {
    console.log('Error deleting subsection: ' + error.message)
  } else {
    console.log('\n✓ Merged successfully')
  }
  
  // Verify
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_subsection_id', keepSub.id)
  
  console.log('✓ France subsection now has ' + (count || 0) + ' questions (should be 4)')
}

merge()
