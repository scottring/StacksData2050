import { supabase } from './src/migration/supabase-client.js'

console.log('=== INVESTIGATING "BROKEN" CHOICES ===\n')

const testChoiceIds = [
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43', // "Yes"
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72', // "No"
  '513d4977-f90c-4472-9f99-5e28fef3c82d'  // "not assessed"
]

for (const choiceId of testChoiceIds) {
  console.log(`\nChoice ID: ${choiceId}`)

  // Get choice details
  const { data: choice } = await supabase
    .from('choices')
    .select('id, content, parent_question_id')
    .eq('id', choiceId)
    .single()

  console.log(`  Content: "${choice?.content}"`)
  console.log(`  Parent Question ID: ${choice?.parent_question_id}`)

  // Check if parent question exists
  if (choice?.parent_question_id) {
    const { data: question } = await supabase
      .from('questions')
      .select('id, name, order_number, parent_section_id, sections(name)')
      .eq('id', choice.parent_question_id)
      .maybeSingle()

    if (question) {
      console.log(`  ✓ Parent question EXISTS: Q${question.order_number} - ${question.name?.substring(0, 50)}`)
      console.log(`    Section: ${(question as any)?.sections?.name}`)

      // Check if there are other choices for this question with the same content
      const { data: siblingChoices } = await supabase
        .from('choices')
        .select('id, content')
        .eq('parent_question_id', choice.parent_question_id)

      console.log(`  Total choices for this question: ${siblingChoices?.length}`)

      const sameContent = siblingChoices?.filter(c => c.content === choice.content) || []
      if (sameContent.length > 1) {
        console.log(`  ⚠️  DUPLICATE: ${sameContent.length} choices with content "${choice.content}"`)
        sameContent.forEach(c => {
          console.log(`    - ${c.id}`)
        })
      }
    } else {
      console.log(`  ❌ Parent question DELETED`)
    }
  }

  // Count how many answers use this choice
  const { count } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('choice_id', choiceId)

  console.log(`  Answers using this choice: ${count}`)
}

console.log('\n\n=== SUMMARY ===')
console.log('If these choices still exist and have valid parent questions,')
console.log('then they are NOT broken - they are just duplicates that need consolidation.')
