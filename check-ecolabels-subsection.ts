import { supabase } from './src/migration/supabase-client.js'

// Find Ecolabels section
const { data: ecolabelsSection } = await supabase
  .from('sections')
  .select('*')
  .ilike('name', '%ecolabel%')
  .single()

console.log('=== ECOLABELS SECTION ===')
console.log(`Name: ${ecolabelsSection?.name}`)
console.log(`Order: ${ecolabelsSection?.order_number}`)
console.log(`ID: ${ecolabelsSection?.id}`)

// Get subsections
const { data: subsections } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', ecolabelsSection?.id)
  .order('order_number')

console.log('\n=== SUBSECTIONS ===')
subsections?.forEach(sub => {
  console.log(`\n${sub.order_number}. ${sub.name}`)
  console.log(`   ID: ${sub.id}`)
  console.log(`   Content: ${sub.content}`)
  console.log(`   Help: ${sub.help}`)
})

// Get questions for first subsection
if (subsections && subsections.length > 0) {
  const firstSub = subsections[0]
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', firstSub.id)
    .order('order_number')

  console.log(`\n=== QUESTIONS FOR ${firstSub.name} ===`)
  questions?.forEach((q, idx) => {
    console.log(`\n${idx + 1}. ${q.name}`)
    console.log(`   Order: ${q.order_number}`)
  })
}
