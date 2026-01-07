import { supabase } from './src/migration/supabase-client.js'

// Get Biocides section
const { data: section } = await supabase
  .from('sections')
  .select('id')
  .ilike('name', '%biocide%')
  .single()

console.log('=== FIXING BIOCIDES SUBSECTIONS ===\n')

// Get subsections with null order_number
const { data: subsections } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', section?.id)
  .order('created_at')

console.log(`Found ${subsections?.length} subsections\n`)

for (let i = 0; i < (subsections?.length || 0); i++) {
  const sub = subsections![i]
  console.log(`${i + 1}. ${sub.name} - current order: ${sub.order_number}`)

  if (sub.order_number === null) {
    const newOrder = i + 1
    console.log(`   Updating to order ${newOrder}`)

    const { error } = await supabase
      .from('subsections')
      .update({ order_number: newOrder })
      .eq('id', sub.id)

    if (error) {
      console.error(`   ERROR: ${error.message}`)
    }
  }
}

console.log('\n=== VERIFICATION ===')
const { data: updated } = await supabase
  .from('subsections')
  .select('name, order_number')
  .eq('section_id', section?.id)
  .order('order_number')

updated?.forEach(sub => {
  console.log(`${sub.order_number}. ${sub.name}`)
})
