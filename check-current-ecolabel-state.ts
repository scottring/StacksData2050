import { supabase } from './src/migration/supabase-client.js'

// Get the current state after our fix
const { data: subsections } = await supabase
  .from('subsections')
  .select('id, name, order_number')
  .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('=== CURRENT ECOLABEL STRUCTURE ===\n')

for (const sub of subsections || []) {
  const { data: questions } = await supabase
    .from('questions')
    .select('name, order_number')
    .eq('parent_subsection_id', sub.id)
    .order('order_number')

  console.log(`\n2.${sub.order_number} ${sub.name}`)
  questions?.forEach((q, idx) => {
    console.log(`  2.${sub.order_number}.${idx + 1} ${q.name?.substring(0, 70)}`)
  })
}
