import { supabase } from './src/migration/supabase-client.js'

async function getSubsectionId() {
  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('order_number', 3)
    .single()

  console.log('Section:', section?.name, section?.id)

  const { data: sub } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section?.id)
    .order('order_number')
    .limit(1)
    .single()

  console.log('Subsection:', sub?.name, sub?.id)
}

getSubsectionId().catch(console.error)
