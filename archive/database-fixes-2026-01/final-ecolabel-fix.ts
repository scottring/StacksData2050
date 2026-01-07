import { supabase } from './src/migration/supabase-client.js'

const euEcolabelId = '0686e11d-d17b-4374-8d8a-80287320bcf3'
const nordicEcolabelId = 'f36f4e72-c5f1-4a8b-a1eb-50d1686da2bd'
const blueAngelId = '45b2c34c-fbd3-4f37-83f7-fd1416e208d9'

// Based on the analysis:
// EU Ecolabel: orders 1-4 (2012/481/EU, 2014/256/EU, and both 2019/70 ANNEX I & II)
// Nordic Ecolabel: orders 5-9 (Paper Products, Tissue Paper, Grease-proof, Packaging, Disposables)
// Blue Angel: orders 11-15 (all DE-UZ questions)
// Note: order 10 is missing - likely deleted question

console.log('=== FINAL ECOLABEL FIX ===\n')

// Get all ecolabel questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

for (const q of questions || []) {
  let subsectionId = null
  let subsectionName = ''
  const name = q.name || ''

  // EU Ecolabel: orders 1-4
  if (q.order_number && q.order_number >= 1 && q.order_number <= 4) {
    subsectionId = euEcolabelId
    subsectionName = 'EU Ecolabel'
  }
  // Nordic Ecolabel: orders 5-9
  else if (q.order_number && q.order_number >= 5 && q.order_number <= 9) {
    subsectionId = nordicEcolabelId
    subsectionName = 'Nordic Ecolabel'
  }
  // Blue Angel: orders 11+
  else if (q.order_number && q.order_number >= 11) {
    subsectionId = blueAngelId
    subsectionName = 'Blue Angel'
  }

  if (subsectionId) {
    console.log(`✓ ${q.order_number}. ${name.substring(0, 60)} → ${subsectionName}`)

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
