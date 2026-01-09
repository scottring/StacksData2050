import { supabase } from './src/migration/supabase-client.js'

async function check() {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', '6fe10d3a-1fc8-4141-abe9-4f3a3cf3b7d4')
    .single()
  
  console.log('Orphaned question status:')
  console.log('  order_number: ' + data?.order_number)
  console.log('  parent_subsection_id: ' + data?.parent_subsection_id)
  console.log('  subsection_sort_number: ' + data?.subsection_sort_number)
  console.log('  section_sort_number: ' + data?.section_sort_number)
  console.log('  bubble_id: ' + data?.bubble_id)
  
  // Check if it's connected to the right subsection
  const correctSubId = '4f777663-616a-4fda-9e10-718c92d8470e'
  
  if (data?.parent_subsection_id === correctSubId) {
    console.log('\n✓ Connected to correct Biocides subsection')
    console.log('✓ Should appear in question list')
    
    // But verify it actually does
    const { data: questions, count } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('parent_subsection_id', correctSubId)
    
    console.log('\nBiocides subsection has ' + count + ' questions total')
    
    const isIncluded = questions?.some(q => q.id === data.id)
    console.log('Orphaned question is included: ' + isIncluded)
  } else {
    console.log('\n✗ NOT connected to correct subsection')
    console.log('Expected: ' + correctSubId)
    console.log('Actual: ' + data?.parent_subsection_id)
  }
}

check()
