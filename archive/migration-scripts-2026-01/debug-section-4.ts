import { supabase } from './src/migration/supabase-client.js'

async function debug() {
  const { data: section } = await supabase
    .from('sections')
    .select('id, name')
    .eq('name', 'Food Contact')
    .single()
  
  console.log('Section:', section)
  
  if (!section) {
    console.log('Section not found')
    return
  }
  
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number')
  
  console.log('\nSubsections (' + (subsections?.length || 0) + '):')
  subsections?.forEach(s => {
    console.log('  ' + s.order_number + '. ' + s.name)
  })
}

debug()
