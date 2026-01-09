import { supabase } from './src/migration/supabase-client.js'

async function recheck() {
  console.log('Rechecking Biocides subsection...\n')
  
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Biocides')
    .single()
  
  if (!section) return
  
  const { data: subsection } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section.id)
    .eq('name', 'Biocides')
    .single()
  
  if (!subsection) return
  
  console.log('Subsection ID: ' + subsection.id)
  console.log('Bubble ID: ' + subsection.bubble_id + '\n')
  
  // Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, order_number, parent_subsection_id')
    .eq('parent_subsection_id', subsection.id)
    .order('order_number')
  
  console.log('Questions found: ' + (questions?.length || 0) + '\n')
  
  questions?.forEach((q, i) => {
    console.log((i+1) + '. Order: ' + q.order_number)
    console.log('   ID: ' + q.id)
    console.log('   Bubble ID: ' + q.bubble_id)
  })
  
  // Check if the orphaned question is still orphaned
  console.log('\n\nChecking previously orphaned question...')
  const orphanedId = '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4'
  
  const { data: orphan } = await supabase
    .from('questions')
    .select('*')
    .eq('id', orphanedId)
    .single()
  
  if (orphan) {
    console.log('Question ID: ' + orphan.id)
    console.log('parent_subsection_id: ' + orphan.parent_subsection_id)
    console.log('subsection_sort_number: ' + orphan.subsection_sort_number)
    console.log('order_number: ' + orphan.order_number)
    
    if (orphan.parent_subsection_id === subsection.id) {
      console.log('✓ Question is now connected to correct subsection')
    } else {
      console.log('✗ Question is still connected to wrong subsection')
    }
  }
}

recheck()
