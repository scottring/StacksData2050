import { supabase } from './src/migration/supabase-client.js'

async function listSection21() {
  console.log('=== All Questions in Section 2, Subsection 1 ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 2)
    .eq('subsection_sort_number', 1)
    .order('order_number')

  console.log(`Total questions: ${questions?.length || 0}\n`)

  for (const q of questions || []) {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} ${q.name}`)
    console.log(`  ID: ${q.id}`)
    console.log(`  Bubble ID: ${q.bubble_id}`)

    // Get tags
    const { data: tags } = await supabase
      .from('question_tags')
      .select('tags(name)')
      .eq('question_id', q.id)

    const tagNames = tags?.map(t => t.tags?.name).join(', ')
    console.log(`  Tags: ${tagNames}`)
    console.log()
  }
}

listSection21().catch(console.error)
