import { supabase } from './src/migration/supabase-client.js'

async function checkQuestion215() {
  console.log('=== Investigating Question 2.1.5 ===\n')

  // Find question 2.1.5
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('section_sort_number', 2)
    .eq('subsection_sort_number', 1)
    .eq('order_number', 5)
    .single()

  if (!question) {
    console.log('Question 2.1.5 not found')
    return
  }

  console.log('Question 2.1.5:', question.name)
  console.log('Question ID:', question.id)
  console.log('Bubble ID:', question.bubble_id)
  console.log()

  // Get tags for this question
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('tag_id, tags(name)')
    .eq('question_id', question.id)

  console.log('Tags on this question:')
  questionTags?.forEach(qt => {
    console.log(`  - ${qt.tags?.name}`)
  })
  console.log()

  // Check if this question has HQ 2.0.1 tag
  const hasHQ201 = questionTags?.some(qt => qt.tags?.name === 'HQ 2.0.1')
  console.log(`Has "HQ 2.0.1" tag: ${hasHQ201}`)
  console.log()

  if (hasHQ201) {
    console.log('❌ PROBLEM: Question 2.1.5 has "HQ 2.0.1" tag but should NOT be shown')
    console.log('   This question exists in Supabase but not in Bubble for this sheet version')
  } else {
    console.log('✅ Question 2.1.5 does NOT have "HQ 2.0.1" tag')
    console.log('   It should not be displayed, but somehow is')
  }

  // Check all questions in section 2.1 with HQ 2.0.1
  console.log('\n=== All Questions in Section 2.1 with HQ 2.0.1 ===\n')

  const { data: section21Questions } = await supabase
    .from('questions')
    .select('id, section_sort_number, subsection_sort_number, order_number, name')
    .eq('section_sort_number', 2)
    .eq('subsection_sort_number', 1)
    .order('order_number')

  for (const q of section21Questions || []) {
    const { data: tags } = await supabase
      .from('question_tags')
      .select('tags(name)')
      .eq('question_id', q.id)

    const hasTag = tags?.some(t => t.tags?.name === 'HQ 2.0.1')
    const marker = hasTag ? '✓' : '✗'

    console.log(`${marker} 2.1.${q.order_number} ${q.name?.substring(0, 60)}`)
  }
}

checkQuestion215().catch(console.error)
