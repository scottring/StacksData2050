import { supabase } from './src/migration/supabase-client.js'

const euEcolabelId = '0686e11d-d17b-4374-8d8a-80287320bcf3'
const nordicEcolabelId = 'f36f4e72-c5f1-4a8b-a1eb-50d1686da2bd'
const blueAngelId = '45b2c34c-fbd3-4f37-83f7-fd1416e208d9'

// Get all ecolabel questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('=== FIXING ECOLABEL GROUPING ===\n')

for (const q of questions || []) {
  let subsectionId = null
  const name = q.name || ''

  // EU Ecolabel: orders 1-4 (first 4 questions)
  if (q.order_number && q.order_number <= 4) {
    subsectionId = euEcolabelId
    console.log(`✓ ${q.order_number}. ${name.substring(0, 60)} → EU Ecolabel`)
  }
  // Nordic Ecolabel: orders 5-9
  else if (q.order_number && q.order_number >= 5 && q.order_number <= 9) {
    subsectionId = nordicEcolabelId
    console.log(`✓ ${q.order_number}. ${name.substring(0, 60)} → Nordic Ecolabel`)
  }
  // Blue Angel: orders 10+
  else if (q.order_number && q.order_number >= 10) {
    subsectionId = blueAngelId
    console.log(`✓ ${q.order_number}. ${name.substring(0, 60)} → Blue Angel`)
  }

  if (subsectionId) {
    const { error } = await supabase
      .from('questions')
      .update({ parent_subsection_id: subsectionId })
      .eq('id', q.id)

    if (error) {
      console.error(`  ERROR: ${error.message}`)
    }
  }
}

console.log('\n=== VERIFICATION ===')
for (const [name, subId] of [
  ['EU Ecolabel', euEcolabelId],
  ['Nordic Ecolabel', nordicEcolabelId],
  ['Blue Angel', blueAngelId]
]) {
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_subsection_id', subId)

  console.log(`${name}: ${count} questions`)
}
