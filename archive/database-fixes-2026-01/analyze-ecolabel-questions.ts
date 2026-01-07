import { supabase } from './src/migration/supabase-client.js'

const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, parent_subsection_id')
  .eq('parent_section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('=== ECOLABEL QUESTIONS (ordered) ===\n')
questions?.forEach((q, idx) => {
  console.log(`${idx + 1}. Order ${q.order_number}: ${q.name?.substring(0, 60)}`)
  console.log(`   Subsection: ${q.parent_subsection_id || 'NONE'}`)
})

console.log('\n\n=== SUBSECTIONS ===')
const { data: subs } = await supabase
  .from('subsections')
  .select('*')
  .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

subs?.forEach(sub => {
  console.log(`${sub.order_number}. ${sub.name} (ID: ${sub.id})`)
})

// Based on Bubble screenshot, group questions by likely subsection
console.log('\n\n=== PROPOSED GROUPING ===')
console.log('EU Ecolabel subsection (order 1) should have questions about 2012/481/EU and 2014/256/EU')
console.log('Nordic Ecolabel subsection (order 2) should have questions about Commission Decision 2019/70')
console.log('Blue Angel subsection (order 3) should have questions about DE-UZ criteria')
