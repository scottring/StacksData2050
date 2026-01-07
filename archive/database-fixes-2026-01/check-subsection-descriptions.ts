import { supabase } from './src/migration/supabase-client.js'

const subsectionIds = [
  { name: 'EU Ecolabel', id: '0686e11d-d17b-4374-8d8a-80287320bcf3' },
  { name: 'Nordic Ecolabel', id: 'f36f4e72-c5f1-4a8b-a1eb-50d1686da2bd' },
  { name: 'Blue Angel', id: '45b2c34c-fbd3-4f37-83f7-fd1416e208d9' }
]

console.log('=== SUBSECTION DESCRIPTIONS (from subsection_name_sort) ===\n')

for (const sub of subsectionIds) {
  const { data } = await supabase
    .from('questions')
    .select('subsection_name_sort')
    .eq('parent_subsection_id', sub.id)
    .order('order_number')
    .limit(1)
    .single()

  console.log(`${sub.name}:`)
  console.log(`  "${data?.subsection_name_sort}"`)
  console.log()
}
