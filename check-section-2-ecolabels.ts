import { supabase } from './src/migration/supabase-client.js'

async function checkSection2() {
  console.log('=== Section 2: Ecolabels ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_sort_number, subsection_sort_number, order_number')
    .eq('section_sort_number', 2)
    .order('subsection_sort_number', { ascending: true, nullsFirst: false })
    .order('order_number', { ascending: true })

  if (!questions || questions.length === 0) {
    console.log('No questions found in Section 2')
    return
  }

  console.log(`Found ${questions.length} questions:\n`)

  // Group by subsection
  const bySubsection = new Map<number, any[]>()
  for (const q of questions) {
    const key = q.subsection_sort_number
    if (!bySubsection.has(key)) {
      bySubsection.set(key, [])
    }
    bySubsection.get(key)!.push(q)
  }

  // Display grouped
  const sortedKeys = Array.from(bySubsection.keys()).sort((a, b) => a - b)

  for (const subNum of sortedKeys) {
    const subQuestions = bySubsection.get(subNum)!
    console.log(`\n2.${subNum} Subsection (${subQuestions.length} questions):`)
    for (const q of subQuestions) {
      const num = q.order_number !== null ? `2.${subNum}.${q.order_number}` : `2.${subNum}.null`
      console.log(`  ${num}: ${q.name?.substring(0, 60)}`)
    }
  }

  // Get subsection info
  console.log('\n\n=== Section 2 Subsections ===\n')

  const { data: section2 } = await supabase
    .from('sections')
    .select('id')
    .eq('order_number', 2)
    .single()

  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section2.id)
    .neq('order_number', 999)
    .order('order_number')

  if (subsections) {
    for (const sub of subsections) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('parent_subsection_id', sub.id)

      console.log(`2.${sub.order_number}: ${sub.name} (${count} questions)`)
    }
  }
}

checkSection2()
