import { supabase } from './src/migration/supabase-client.js'

const ecolabelSectionId = '77c534ef-1f7a-4bec-9933-b31f1607817f'

// Get ALL subsections and questions for Ecolabels
const { data: subsections } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', ecolabelSectionId)
  .order('order_number')

console.log('=== ECOLABELS SUBSECTIONS ===')
for (const sub of subsections || []) {
  console.log(`\n${sub.order_number}. ${sub.name} (${sub.id})`)
  console.log(`   show_title_and_group: ${sub.show_title_and_group}`)

  // Get questions for this subsection
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, content, order_number, question_type')
    .eq('parent_subsection_id', sub.id)
    .order('order_number')

  console.log(`   Questions: ${questions?.length || 0}`)
  questions?.forEach((q, idx) => {
    const text = q.name || q.content || 'NO TEXT'
    console.log(`     ${idx + 1}. ${text.substring(0, 80)}`)
    console.log(`        Type: ${q.question_type}, Order: ${q.order_number}`)
  })
}

// Check for questions directly under the section (no subsection)
const { data: directQuestions } = await supabase
  .from('questions')
  .select('*')
  .eq('parent_section_id', ecolabelSectionId)
  .is('parent_subsection_id', null)

if (directQuestions && directQuestions.length > 0) {
  console.log('\n=== QUESTIONS DIRECTLY UNDER ECOLABELS SECTION ===')
  directQuestions.forEach(q => {
    console.log(`${q.name}`)
    console.log(`  Type: ${q.question_type}`)
  })
}
