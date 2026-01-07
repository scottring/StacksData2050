import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

console.log('=== AQURATE SHEET OVERVIEW ===\n')

// Get sheet info
const { data: sheet } = await supabase
  .from('sheets')
  .select('*')
  .eq('id', sheetId)
  .single()

console.log(`Sheet: ${sheet?.name}`)
console.log(`Status: ${sheet?.new_status}`)
console.log(`Company ID: ${sheet?.company_id}`)

// Get sections with counts
const { data: sections } = await supabase
  .from('sections')
  .select('*')
  .order('order_number')

console.log('\n=== SECTIONS ===')
for (const section of sections || []) {
  if (section.order_number === null || section.order_number > 10) continue

  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .not('order_number', 'is', null)
    .order('order_number')

  let totalQuestions = 0

  for (const sub of subsections || []) {
    const { count: qCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    totalQuestions += qCount || 0
  }

  if (totalQuestions > 0) {
    console.log(`\n${section.order_number}. ${section.name} (${totalQuestions} questions)`)

    if (subsections && subsections.length > 0) {
      for (const sub of subsections) {
        const { count: qCount } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('parent_subsection_id', sub.id)

        console.log(`   ${section.order_number}.${sub.order_number} ${sub.name} (${qCount || 0} questions)`)
      }
    }
  }
}

// Check clarifications
const { data: withClarifications } = await supabase
  .from('answers')
  .select('id')
  .eq('sheet_id', sheetId)
  .not('clarification', 'is', null)
  .not('clarification', 'in', '("-","no comment","")')

console.log(`\n✓ ${withClarifications?.length || 0} answers have meaningful clarifications`)
