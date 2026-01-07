import { supabase } from './src/migration/supabase-client.js';

async function listSections() {
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  console.log('=== ALL SECTIONS ===')
  sections?.forEach((s, i) => {
    console.log(`${i+1}. "${s.name}" (order: ${s.order_number})`)
  })
}

listSections().catch(console.error)
