import { supabase } from './src/migration/supabase-client.js'

async function analyzeFoodContactGrouping() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) return

  // Get all questions with their metadata
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, question_id_number, parent_subsection_id, section_name_sort, subsection_name_sort, section_sort_number, subsection_sort_number')
    .eq('parent_section_id', section.id)
    .order('question_id_number')

  if (!questions) return

  console.log('=== Food Contact Questions Analysis ===\n')

  // Group by subsection_name_sort (from Bubble)
  const groupedBySubsection = questions.reduce((acc, q) => {
    const key = q.subsection_name_sort || 'NO SUBSECTION'
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {} as Record<string, typeof questions>)

  console.log('Questions grouped by subsection_name_sort:\n')
  Object.entries(groupedBySubsection).forEach(([subsection, qs]) => {
    console.log(`\n${subsection} (${qs.length} questions)`)
    console.log(`  Sort number: ${qs[0].subsection_sort_number}`)
    console.log(`  Questions: ${qs.map(q => `Q${q.question_id_number}`).join(', ')}`)
    console.log(`  First question: ${qs[0].name?.substring(0, 60)}...`)
  })

  // Show unique subsection names
  const uniqueSubsections = [...new Set(questions.map(q => q.subsection_name_sort))].filter(Boolean)
  console.log(`\n\n=== Unique Subsection Names from Bubble (${uniqueSubsections.length}) ===`)
  uniqueSubsections.forEach((name, index) => {
    console.log(`  4.${index + 1} - ${name}`)
  })
}

analyzeFoodContactGrouping()
