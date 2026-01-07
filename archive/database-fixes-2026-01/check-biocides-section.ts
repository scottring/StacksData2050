import { supabase } from './src/migration/supabase-client.js'

// Get Biocides section
const { data: section } = await supabase
  .from('sections')
  .select('*')
  .ilike('name', '%biocide%')
  .single()

console.log('=== BIOCIDES SECTION ===')
console.log(`Name: ${section?.name}`)
console.log(`ID: ${section?.id}`)
console.log()

// Get subsections
const { data: subsections } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', section?.id)
  .order('order_number')

console.log('=== SUBSECTIONS ===')
subsections?.forEach(sub => {
  console.log(`${sub.order_number}. ${sub.name}`)
})
console.log()

// Get questions with their types
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, question_type, parent_subsection_id, required')
  .eq('parent_section_id', section?.id)
  .order('order_number')

console.log('=== BIOCIDES QUESTIONS ===')
questions?.forEach((q, idx) => {
  const subInfo = q.parent_subsection_id
    ? subsections?.find(s => s.id === q.parent_subsection_id)?.name
    : 'Direct to section'
  console.log(`${idx + 1}. Order ${q.order_number}: ${q.name?.substring(0, 70)}`)
  console.log(`   Type: ${q.question_type}`)
  console.log(`   Subsection: ${subInfo}`)
  console.log(`   Required: ${q.required}`)
  console.log()
})
