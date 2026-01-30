import { supabase } from './src/migration/supabase-client.js'

async function resolve() {
  console.log('Resolving France and EU Plastics duplicates\n')
  
  // Get Section 4
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()
  
  if (!section) return
  
  // France subsections
  console.log('=== France ===\n')
  const { data: franceSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'France')
    .order('order_number')
  
  for (const sub of franceSubs || []) {
    console.log('Order ' + sub.order_number + ':')
    console.log('  ID: ' + sub.id)
    console.log('  Bubble ID: ' + sub.bubble_id)
    
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, content, order_number')
      .eq('parent_subsection_id', sub.id)
      .order('order_number')
    
    console.log('  Questions (' + (questions?.length || 0) + '):')
    questions?.forEach(q => {
      console.log('    ' + q.order_number + '. ' + (q.content || '').substring(0, 50))
      console.log('       bubble_id: ' + q.bubble_id)
    })
    console.log()
  }
  
  // Check if they have the same bubble IDs (meaning they're truly duplicates)
  if (franceSubs && franceSubs.length === 2) {
    const q1Ids = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', franceSubs[0].id)
    
    const q2Ids = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', franceSubs[1].id)
    
    const set1 = new Set(q1Ids.data?.map(q => q.bubble_id))
    const set2 = new Set(q2Ids.data?.map(q => q.bubble_id))
    
    const overlap = [...set1].filter(id => set2.has(id))
    
    console.log('Question bubble_id overlap: ' + overlap.length + ' questions')
    
    if (overlap.length > 0) {
      console.log('→ These are duplicates! Merging into order ' + franceSubs[0].order_number + '...')
      
      // Move questions from order 10 to order 1
      await supabase
        .from('questions')
        .update({ parent_subsection_id: franceSubs[0].id })
        .eq('parent_subsection_id', franceSubs[1].id)
      
      // Delete order 10
      await supabase
        .from('subsections')
        .delete()
        .eq('id', franceSubs[1].id)
      
      console.log('✓ Merged\n')
    } else {
      console.log('→ Different questions, keeping both\n')
    }
  }
  
  // Same for EU Plastics
  console.log('\n=== EU Plastics ===\n')
  const { data: euSubs } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .ilike('name', '%Plastics%Dual%')
    .order('order_number')
  
  for (const sub of euSubs || []) {
    console.log('Order ' + sub.order_number + ':')
    
    const { data: questions } = await supabase
      .from('questions')
      .select('bubble_id, content')
      .eq('parent_subsection_id', sub.id)
    
    console.log('  Questions (' + (questions?.length || 0) + '):')
    questions?.slice(0, 2).forEach(q => {
      console.log('    ' + (q.content || '').substring(0, 50))
    })
    console.log()
  }
  
  if (euSubs && euSubs.length === 2) {
    const q1Ids = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', euSubs[0].id)
    
    const q2Ids = await supabase
      .from('questions')
      .select('bubble_id')
      .eq('parent_subsection_id', euSubs[1].id)
    
    const set1 = new Set(q1Ids.data?.map(q => q.bubble_id))
    const set2 = new Set(q2Ids.data?.map(q => q.bubble_id))
    
    const overlap = [...set1].filter(id => set2.has(id))
    
    console.log('Question bubble_id overlap: ' + overlap.length + ' questions')
    
    if (overlap.length > 0) {
      console.log('→ Duplicates! Merging...')
      
      await supabase
        .from('questions')
        .update({ parent_subsection_id: euSubs[0].id })
        .eq('parent_subsection_id', euSubs[1].id)
      
      await supabase
        .from('subsections')
        .delete()
        .eq('id', euSubs[1].id)
      
      console.log('✓ Merged')
    }
  }
}

resolve()
