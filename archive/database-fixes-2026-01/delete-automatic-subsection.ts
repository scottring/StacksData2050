import { supabase } from './src/migration/supabase-client.js'

const { data: subs } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')

console.log('Current subsections:', subs?.length)
subs?.forEach(s => console.log(`  ${s.name} (${s.id})`))

const toDelete = subs?.find(s => s.name === 'Automatic #1')

if (toDelete) {
  console.log(`\nDeleting "${toDelete.name}" (${toDelete.id})...`)

  const { error } = await supabase
    .from('subsections')
    .delete()
    .eq('id', toDelete.id)

  if (error) {
    console.error(`Error: ${error.message}`)
  } else {
    console.log('✓ Deleted')
  }
}

const { data: after } = await supabase
  .from('subsections')
  .select('name, order_number')
  .eq('section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')

console.log(`\nFinal subsections: ${after?.length}`)
after?.forEach(s => console.log(`  ${s.order_number}. ${s.name}`))
